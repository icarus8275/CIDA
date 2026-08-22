import type { BackupTrigger } from "@/generated/prisma/enums";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
const INTERVAL_MS = 3 * 60 * 60 * 1000;
const MAX_SNAPSHOTS = 60;

export type AcademicSnapshot = {
  version: 1;
  takenAt: string;
  academicYears: unknown[];
  termSeasons: unknown[];
  terms: unknown[];
  courses: unknown[];
  courseCodes: unknown[];
  offerings: unknown[];
  sections: unknown[];
  instructors: unknown[];
  itemTypes: unknown[];
  codeNumbers: unknown[];
  courseItems: unknown[];
  courseItemCodes: unknown[];
  shareGroups: unknown[];
  shareMembers: unknown[];
  shareRequests: unknown[];
};

async function collectSnapshot(): Promise<AcademicSnapshot> {
  const [
    academicYears,
    termSeasons,
    terms,
    courses,
    courseCodes,
    offerings,
    sections,
    instructors,
    itemTypes,
    codeNumbers,
    courseItems,
    courseItemCodes,
    shareGroups,
    shareMembers,
    shareRequests,
  ] = await Promise.all([
    prisma.academicYear.findMany(),
    prisma.termSeason.findMany(),
    prisma.term.findMany(),
    prisma.course.findMany(),
    prisma.courseCode.findMany(),
    prisma.courseOffering.findMany(),
    prisma.section.findMany(),
    prisma.sectionInstructor.findMany(),
    prisma.itemTypeDefinition.findMany(),
    prisma.codeNumber.findMany(),
    prisma.courseItem.findMany(),
    prisma.courseItemCode.findMany(),
    prisma.courseShareGroup.findMany(),
    prisma.courseShareMember.findMany(),
    prisma.courseShareRequest.findMany(),
  ]);

  return {
    version: 1,
    takenAt: new Date().toISOString(),
    academicYears,
    termSeasons,
    terms,
    courses,
    courseCodes,
    offerings,
    sections,
    instructors,
    itemTypes,
    codeNumbers,
    courseItems,
    courseItemCodes,
    shareGroups,
    shareMembers,
    shareRequests,
  };
}

export async function pruneOldBackups(): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  await prisma.dataBackup.deleteMany({
    where: { createdAt: { lt: cutoff } },
  });
  const extras = await prisma.dataBackup.findMany({
    orderBy: { createdAt: "desc" },
    skip: MAX_SNAPSHOTS,
    select: { id: true },
  });
  if (extras.length > 0) {
    await prisma.dataBackup.deleteMany({
      where: { id: { in: extras.map((e) => e.id) } },
    });
  }
}

export async function createBackup(trigger: BackupTrigger): Promise<{
  id: string;
  createdAt: Date;
  itemCount: number;
}> {
  const payload = await collectSnapshot();
  const itemCount = payload.courseItems.length;
  const row = await prisma.dataBackup.create({
    data: {
      trigger,
      itemCount,
      payload: payload as unknown as Prisma.InputJsonValue,
    },
    select: { id: true, createdAt: true, itemCount: true },
  });
  await pruneOldBackups();
  return row;
}

export async function shouldRunScheduledBackup(): Promise<boolean> {
  const last = await prisma.dataBackup.findFirst({
    where: { trigger: "SCHEDULED" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  if (!last) return true;
  return Date.now() - last.createdAt.getTime() >= INTERVAL_MS;
}

export async function ensureScheduledBackup(): Promise<void> {
  try {
    if (await shouldRunScheduledBackup()) {
      await createBackup("SCHEDULED");
    }
  } catch (e) {
    console.error("[backup] scheduled run failed", e);
  }
}

type IdRow = { id: string };

function asRows<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export async function restoreBackup(backupId: string): Promise<void> {
  const row = await prisma.dataBackup.findUnique({ where: { id: backupId } });
  if (!row) {
    throw new Error("backup_not_found");
  }
  const snap = row.payload as AcademicSnapshot;
  if (!snap || snap.version !== 1) {
    throw new Error("unsupported_backup");
  }

  const academicYears = asRows<IdRow & Record<string, unknown>>(snap.academicYears);
  const termSeasons = asRows<IdRow & Record<string, unknown>>(snap.termSeasons);
  const terms = asRows<IdRow & Record<string, unknown>>(snap.terms);
  const courses = asRows<IdRow & Record<string, unknown>>(snap.courses);
  const courseCodes = asRows<IdRow & Record<string, unknown>>(snap.courseCodes);
  const offerings = asRows<IdRow & Record<string, unknown>>(snap.offerings);
  const sections = asRows<IdRow & Record<string, unknown>>(snap.sections);
  const instructors = asRows<{ userId: string; sectionId: string }>(snap.instructors);
  const itemTypes = asRows<IdRow & Record<string, unknown>>(snap.itemTypes);
  const codeNumbers = asRows<IdRow & Record<string, unknown>>(snap.codeNumbers);
  const courseItems = asRows<IdRow & Record<string, unknown>>(snap.courseItems);
  const courseItemCodes = asRows<IdRow & Record<string, unknown>>(snap.courseItemCodes);
  const shareGroups = asRows<IdRow & Record<string, unknown>>(snap.shareGroups);
  const shareMembers = asRows<{ shareGroupId: string; userId: string; joinedAt?: string }>(
    snap.shareMembers
  );
  const shareRequests = asRows<IdRow & Record<string, unknown>>(snap.shareRequests);

  const knownUserIds = new Set(
    (
      await prisma.user.findMany({ select: { id: true } })
    ).map((u) => u.id)
  );

  await prisma.$transaction(async (tx) => {
    await tx.courseItemCode.deleteMany();
    await tx.courseItem.deleteMany();
    await tx.courseShareRequest.deleteMany();
    await tx.courseShareMember.deleteMany();
    await tx.courseShareGroup.deleteMany();
    await tx.sectionInstructor.deleteMany();
    await tx.section.deleteMany();
    await tx.courseOffering.deleteMany();
    await tx.courseCode.deleteMany();
    await tx.term.deleteMany();
    await tx.academicYear.deleteMany();
    await tx.termSeason.deleteMany();
    await tx.course.deleteMany();
    await tx.itemTypeDefinition.deleteMany();
    await tx.codeNumber.deleteMany();

    if (academicYears.length) {
      await tx.academicYear.createMany({ data: academicYears as never });
    }
    if (termSeasons.length) {
      await tx.termSeason.createMany({ data: termSeasons as never });
    }
    if (courses.length) {
      await tx.course.createMany({ data: courses as never });
    }
    if (itemTypes.length) {
      await tx.itemTypeDefinition.createMany({ data: itemTypes as never });
    }
    if (codeNumbers.length) {
      await tx.codeNumber.createMany({ data: codeNumbers as never });
    }
    if (terms.length) {
      await tx.term.createMany({ data: terms as never });
    }
    if (offerings.length) {
      await tx.courseOffering.createMany({ data: offerings as never });
    }
    if (sections.length) {
      await tx.section.createMany({ data: sections as never });
    }
    if (courseCodes.length) {
      await tx.courseCode.createMany({ data: courseCodes as never });
    }
    const instructorRows = instructors.filter(
      (r) => knownUserIds.has(r.userId)
    );
    if (instructorRows.length) {
      await tx.sectionInstructor.createMany({ data: instructorRows });
    }
    if (courseItems.length) {
      await tx.courseItem.createMany({ data: courseItems as never });
    }
    if (courseItemCodes.length) {
      await tx.courseItemCode.createMany({ data: courseItemCodes as never });
    }
    if (shareGroups.length) {
      await tx.courseShareGroup.createMany({ data: shareGroups as never });
    }
    const memberRows = shareMembers.filter((r) => knownUserIds.has(r.userId));
    if (memberRows.length) {
      await tx.courseShareMember.createMany({
        data: memberRows.map((r) => ({
          shareGroupId: r.shareGroupId,
          userId: r.userId,
          joinedAt: r.joinedAt ? new Date(r.joinedAt) : undefined,
        })),
      });
    }
    const requestRows = shareRequests.filter(
      (r) =>
        knownUserIds.has(String(r.requesterUserId)) &&
        knownUserIds.has(String(r.targetUserId))
    );
    if (requestRows.length) {
      await tx.courseShareRequest.createMany({ data: requestRows as never });
    }
  }, { timeout: 120_000 });
}
