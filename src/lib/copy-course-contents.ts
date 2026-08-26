import { actorLabel, logActivity } from "@/lib/activity-log";
import { getCourseIdForSection } from "@/lib/code-number-assign";
import { canEditSection } from "@/lib/guards";
import { describeSectionPath } from "@/lib/item-labels";
import { prisma } from "@/lib/prisma";
import {
  loadCourseItemsForSection,
  resolveWriteSectionId,
} from "@/lib/section-share";

export type CopyCourseContentsErrorCode =
  | "not_found"
  | "forbidden"
  | "same_section";

export class CopyCourseContentsError extends Error {
  constructor(public readonly code: CopyCourseContentsErrorCode) {
    super(code);
    this.name = "CopyCourseContentsError";
  }
}

type Role = "ADMIN" | "PROFESSOR" | "CIDA";
type Actor = {
  id: string;
  role: Role;
  name?: string | null;
  email?: string | null;
};

async function allowedCodeIdsForSection(sectionId: string): Promise<Set<string>> {
  const courseId = await getCourseIdForSection(sectionId);
  if (!courseId) return new Set();
  const rows = await prisma.courseCode.findMany({
    where: { courseId },
    select: { codeNumberId: true },
  });
  return new Set(rows.map((r) => r.codeNumberId));
}

/** Replace the target section's items (type, title, codes) with a copy of the source. Does not copy file or syllabus links, and does not change faculty assignments. */
export async function copyCourseContents(opts: {
  actor: Actor;
  sourceSectionId: string;
  targetSectionId: string;
}): Promise<{ copied: number }> {
  if (opts.sourceSectionId === opts.targetSectionId) {
    throw new CopyCourseContentsError("same_section");
  }

  const [sourceOk, targetOk] = await Promise.all([
    canEditSection(opts.actor.id, opts.actor.role, opts.sourceSectionId),
    canEditSection(opts.actor.id, opts.actor.role, opts.targetSectionId),
  ]);
  if (!sourceOk || !targetOk) {
    throw new CopyCourseContentsError("forbidden");
  }

  const [sourceSection, targetSection] = await Promise.all([
    prisma.section.findUnique({
      where: { id: opts.sourceSectionId },
      select: {
        id: true,
        courseOfferingId: true,
      },
    }),
    prisma.section.findUnique({
      where: { id: opts.targetSectionId },
      select: { id: true, courseOfferingId: true },
    }),
  ]);
  if (!sourceSection || !targetSection) {
    throw new CopyCourseContentsError("not_found");
  }

  const [sourceWriteId, targetWriteId] = await Promise.all([
    resolveWriteSectionId(opts.sourceSectionId, opts.actor.id, opts.actor.role),
    resolveWriteSectionId(opts.targetSectionId, opts.actor.id, opts.actor.role),
  ]);
  if (sourceWriteId === targetWriteId) {
    throw new CopyCourseContentsError("same_section");
  }

  const [sourceItems, allowedCodes] = await Promise.all([
    loadCourseItemsForSection({
      sectionId: opts.sourceSectionId,
      courseOfferingId: sourceSection.courseOfferingId,
      userId: opts.actor.id,
      role: opts.actor.role,
    }),
    allowedCodeIdsForSection(targetWriteId),
  ]);

  await prisma.$transaction(async (tx) => {
    await tx.courseItem.deleteMany({ where: { sectionId: targetWriteId } });
    for (const item of sourceItems) {
      const codeNumberIds = item.codes
        .map((c) => c.codeNumberId)
        .filter((id) => allowedCodes.has(id));
      await tx.courseItem.create({
        data: {
          sectionId: targetWriteId,
          itemTypeId: item.itemTypeId,
          number: item.number,
          title: item.title,
          sortOrder: item.sortOrder,
          onSiteDisplay: item.onSiteDisplay,
          codes: codeNumberIds.length
            ? {
                create: codeNumberIds.map((codeNumberId) => ({ codeNumberId })),
              }
            : undefined,
        },
      });
    }
  });

  const who = actorLabel(opts.actor);
  const [fromPath, toPath] = await Promise.all([
    describeSectionPath(opts.sourceSectionId),
    describeSectionPath(opts.targetSectionId),
  ]);
  await logActivity(
    opts.actor,
    `${who} copied course items from ${fromPath ?? "a course"} to ${toPath ?? "a course"}`,
    `${who} 님이 ${fromPath ?? "과목"}의 항목을 ${toPath ?? "과목"}(으)로 복사했습니다`
  );

  return { copied: sourceItems.length };
}

export async function clearSectionItems(opts: {
  actor: Actor;
  sectionId: string;
  itemTypeId?: string;
}): Promise<{ deleted: number }> {
  const ok = await canEditSection(opts.actor.id, opts.actor.role, opts.sectionId);
  if (!ok) {
    throw new CopyCourseContentsError("forbidden");
  }
  const section = await prisma.section.findUnique({
    where: { id: opts.sectionId },
    select: { id: true },
  });
  if (!section) {
    throw new CopyCourseContentsError("not_found");
  }
  const writeSectionId = await resolveWriteSectionId(
    opts.sectionId,
    opts.actor.id,
    opts.actor.role
  );
  const result = await prisma.courseItem.deleteMany({
    where: {
      sectionId: writeSectionId,
      ...(opts.itemTypeId ? { itemTypeId: opts.itemTypeId } : {}),
    },
  });
  const path = await describeSectionPath(opts.sectionId);
  const who = actorLabel(opts.actor);
  await logActivity(
    opts.actor,
    opts.itemTypeId
      ? `${who} deleted items of one type in ${path ?? "a course"}`
      : `${who} deleted all items in ${path ?? "a course"}`,
    opts.itemTypeId
      ? `${who} 님이 ${path ?? "과목"}의 한 유형 항목을 모두 삭제했습니다`
      : `${who} 님이 ${path ?? "과목"}의 항목을 모두 삭제했습니다`
  );
  return { deleted: result.count };
}
