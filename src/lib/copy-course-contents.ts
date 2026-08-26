import { actorLabel, logActivity } from "@/lib/activity-log";
import { getCourseIdForSection } from "@/lib/code-number-assign";
import { canEditSection } from "@/lib/guards";
import { describeSectionPath } from "@/lib/item-labels";
import { prisma } from "@/lib/prisma";
import {
  loadCourseItemsForSection,
  resolveWriteSectionId,
} from "@/lib/section-share";
import { formatTermForDisplay, termChronology } from "@/lib/term-display";

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

const copyTargetInclude = {
  courseOffering: {
    include: {
      course: true,
      term: {
        include: { academicYear: true, termSeason: true },
      },
    },
  },
} as const;

export type CopyTargetSection = {
  id: string;
  label: string;
};

/** Assigned sections, plus other faculty sections on offerings this user actively shares. */
export async function listCopyTargetSections(opts: {
  userId: string;
  fromSectionId: string;
}): Promise<CopyTargetSection[]> {
  const assigned = await prisma.section.findMany({
    where: { instructors: { some: { userId: opts.userId } } },
    include: copyTargetInclude,
  });

  const memberships = await prisma.courseShareMember.findMany({
    where: { userId: opts.userId },
    select: {
      shareGroup: {
        select: {
          courseOfferingId: true,
          members: { select: { userId: true } },
        },
      },
    },
  });

  const active = memberships.filter((m) => m.shareGroup.members.length >= 2);
  const offeringIds = [...new Set(active.map((m) => m.shareGroup.courseOfferingId))];
  const memberIds = [...new Set(active.flatMap((m) => m.shareGroup.members.map((x) => x.userId)))];

  const sharedSections =
    offeringIds.length && memberIds.length
      ? await prisma.section.findMany({
          where: {
            courseOfferingId: { in: offeringIds },
            instructors: { some: { userId: { in: memberIds } } },
          },
          include: copyTargetInclude,
        })
      : [];

  const byId = new Map(assigned.map((s) => [s.id, s]));
  for (const s of sharedSections) byId.set(s.id, s);
  byId.delete(opts.fromSectionId);

  const sourceWrite = await resolveWriteSectionId(
    opts.fromSectionId,
    opts.userId,
    "PROFESSOR"
  );

  const rows: {
    id: string;
    label: string;
    rank: number;
    name: string;
    section: string;
  }[] = [];
  for (const sec of byId.values()) {
    const writeId = await resolveWriteSectionId(sec.id, opts.userId, "PROFESSOR");
    if (writeId === sourceWrite) continue;
    const term = sec.courseOffering.term;
    rows.push({
      id: sec.id,
      label: `${formatTermForDisplay(term)} · ${sec.courseOffering.course.name} · ${sec.label}`,
      rank: termChronology(term),
      name: sec.courseOffering.course.name,
      section: sec.label,
    });
  }

  rows.sort((a, b) => {
    if (b.rank !== a.rank) return b.rank - a.rank;
    const byName = a.name.localeCompare(b.name);
    if (byName) return byName;
    return a.section.localeCompare(b.section, undefined, { numeric: true });
  });

  return rows.map(({ id, label }) => ({ id, label }));
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
