import { actorLabel, logActivity } from "@/lib/activity-log";
import { assertItemCodesWithinSection, CodeNumberAssignError } from "@/lib/code-number-assign";
import { canEditSection } from "@/lib/guards";
import { describeSectionPath } from "@/lib/item-labels";
import { prisma } from "@/lib/prisma";
import {
  loadCourseItemsForSection,
  resolveWriteSectionId,
} from "@/lib/section-share";

export const COPYABLE_ITEM_TYPE_KEYS = ["assignment", "quiz", "exam"] as const;

export type CopyMatchingError =
  | "not_found"
  | "forbidden"
  | "same_section"
  | "mismatch"
  | "empty"
  | "codes";

export class CopyMatchingItemsError extends Error {
  constructor(public readonly code: CopyMatchingError) {
    super(code);
    this.name = "CopyMatchingItemsError";
  }
}

type Role = "ADMIN" | "PROFESSOR" | "CIDA";

export function itemStructureFingerprint(
  items: { number: number; itemType: { key: string } }[]
): string {
  return items
    .filter((i) =>
      (COPYABLE_ITEM_TYPE_KEYS as readonly string[]).includes(i.itemType.key)
    )
    .map((i) => `${i.itemType.key}:${i.number}`)
    .sort()
    .join("|");
}

function assessmentKey(item: { number: number; itemType: { key: string } }) {
  return `${item.itemType.key}:${item.number}`;
}

export async function copyMatchingAssessments(opts: {
  actor: { id: string; role: Role; name?: string | null; email?: string | null };
  sourceSectionId: string;
  targetSectionId: string;
}): Promise<{ copied: number }> {
  if (opts.sourceSectionId === opts.targetSectionId) {
    throw new CopyMatchingItemsError("same_section");
  }

  const [sourceOk, targetOk] = await Promise.all([
    canEditSection(opts.actor.id, opts.actor.role, opts.sourceSectionId),
    canEditSection(opts.actor.id, opts.actor.role, opts.targetSectionId),
  ]);
  if (!sourceOk || !targetOk) {
    throw new CopyMatchingItemsError("forbidden");
  }

  const [sourceSection, targetSection] = await Promise.all([
    prisma.section.findUnique({
      where: { id: opts.sourceSectionId },
      select: {
        id: true,
        courseOfferingId: true,
        courseOffering: { select: { courseId: true } },
      },
    }),
    prisma.section.findUnique({
      where: { id: opts.targetSectionId },
      select: {
        id: true,
        courseOfferingId: true,
        courseOffering: { select: { courseId: true } },
      },
    }),
  ]);
  if (!sourceSection || !targetSection) {
    throw new CopyMatchingItemsError("not_found");
  }
  if (sourceSection.courseOffering.courseId !== targetSection.courseOffering.courseId) {
    throw new CopyMatchingItemsError("mismatch");
  }

  const [sourceWriteId, targetWriteId] = await Promise.all([
    resolveWriteSectionId(
      opts.sourceSectionId,
      opts.actor.id,
      opts.actor.role
    ),
    resolveWriteSectionId(
      opts.targetSectionId,
      opts.actor.id,
      opts.actor.role
    ),
  ]);
  if (sourceWriteId === targetWriteId) {
    throw new CopyMatchingItemsError("same_section");
  }

  const [sourceItems, targetItems] = await Promise.all([
    loadCourseItemsForSection({
      sectionId: opts.sourceSectionId,
      courseOfferingId: sourceSection.courseOfferingId,
      userId: opts.actor.id,
      role: opts.actor.role,
    }),
    loadCourseItemsForSection({
      sectionId: opts.targetSectionId,
      courseOfferingId: targetSection.courseOfferingId,
      userId: opts.actor.id,
      role: opts.actor.role,
    }),
  ]);

  const sourceFp = itemStructureFingerprint(sourceItems);
  const targetFp = itemStructureFingerprint(targetItems);
  if (!sourceFp || !targetFp) {
    throw new CopyMatchingItemsError("empty");
  }
  if (sourceFp !== targetFp) {
    throw new CopyMatchingItemsError("mismatch");
  }

  const sourceByKey = new Map(
    sourceItems
      .filter((i) =>
        (COPYABLE_ITEM_TYPE_KEYS as readonly string[]).includes(i.itemType.key)
      )
      .map((i) => [assessmentKey(i), i])
  );

  const targets = targetItems.filter((i) =>
    (COPYABLE_ITEM_TYPE_KEYS as readonly string[]).includes(i.itemType.key)
  );

  try {
    await prisma.$transaction(async (tx) => {
      for (const target of targets) {
        const source = sourceByKey.get(assessmentKey(target));
        if (!source) continue;
        const codeNumberIds = source.codes.map((c) => c.codeNumberId);
        await assertItemCodesWithinSection(
          targetWriteId,
          target.id,
          codeNumberIds
        );
        await tx.courseItem.update({
          where: { id: target.id },
          data: {
            title: source.title,
            oneDriveUrl: source.oneDriveUrl,
            linkTitle: source.linkTitle,
            onSiteDisplay: source.onSiteDisplay,
          },
        });
        await tx.courseItemCode.deleteMany({
          where: { courseItemId: target.id },
        });
        if (codeNumberIds.length) {
          await tx.courseItemCode.createMany({
            data: codeNumberIds.map((codeNumberId) => ({
              courseItemId: target.id,
              codeNumberId,
            })),
          });
        }
      }
    });
  } catch (e) {
    if (e instanceof CodeNumberAssignError) {
      throw new CopyMatchingItemsError("codes");
    }
    throw e;
  }

  const who = actorLabel(opts.actor);
  const [fromPath, toPath] = await Promise.all([
    describeSectionPath(opts.sourceSectionId),
    describeSectionPath(opts.targetSectionId),
  ]);
  await logActivity(
    opts.actor,
    `${who} copied assignments, quizzes, and exams from ${fromPath ?? "a course"} to ${toPath ?? "a course"}`,
    `${who} 님이 ${fromPath ?? "과목"}의 과제·퀴즈·시험을 ${toPath ?? "과목"}(으)로 복사했습니다`
  );

  return { copied: targets.length };
}
