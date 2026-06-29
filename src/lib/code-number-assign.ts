import { prisma } from "@/lib/prisma";

export class CodeNumberAssignError extends Error {
  constructor(
    public readonly errCode:
      | "invalid_code_numbers"
      | "inactive_code_number"
      | "not_in_course_codes"
  ) {
    super(errCode);
    this.name = "CodeNumberAssignError";
  }
}

export function normalizeCodeValue(s: string): string {
  return s.trim().toUpperCase();
}

/**
 * @param courseItemId - null for new items (all ids must be active and exist);
 *   for existing items, already-linked IDs may stay even if the catalog is inactive.
 */
export async function assertAssignableCodeNumberIds(
  courseItemId: string | null,
  requestedIds: string[]
): Promise<void> {
  const unique = [...new Set(requestedIds)];
  if (unique.length === 0) return;
  const rows = await prisma.codeNumber.findMany({
    where: { id: { in: unique } },
  });
  if (rows.length !== unique.length) {
    throw new CodeNumberAssignError("invalid_code_numbers");
  }
  const keepIfInactive = new Set<string>();
  if (courseItemId) {
    const existing = await prisma.courseItemCode.findMany({
      where: { courseItemId },
      select: { codeNumberId: true },
    });
    for (const e of existing) keepIfInactive.add(e.codeNumberId);
  }
  for (const r of rows) {
    if (r.isActive) continue;
    if (keepIfInactive.has(r.id)) continue;
    throw new CodeNumberAssignError("inactive_code_number");
  }
}

/** Item codes must be a subset of the course's admin-selected standard codes. */
export async function assertItemCodesWithinCourse(
  courseId: string,
  courseItemId: string | null,
  requestedIds: string[]
): Promise<void> {
  await assertAssignableCodeNumberIds(courseItemId, requestedIds);
  const unique = [...new Set(requestedIds)];
  if (unique.length === 0) return;

  const courseRows = await prisma.courseCode.findMany({
    where: { courseId },
    select: { codeNumberId: true },
  });
  const allowed = new Set(courseRows.map((r) => r.codeNumberId));
  for (const id of unique) {
    if (!allowed.has(id)) {
      throw new CodeNumberAssignError("not_in_course_codes");
    }
  }
}

export async function getCourseIdForSection(
  sectionId: string
): Promise<string | null> {
  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    select: { courseOffering: { select: { courseId: true } } },
  });
  return section?.courseOffering.courseId ?? null;
}

export async function assertItemCodesWithinSection(
  sectionId: string,
  courseItemId: string | null,
  requestedIds: string[]
): Promise<void> {
  const courseId = await getCourseIdForSection(sectionId);
  if (!courseId) {
    throw new CodeNumberAssignError("not_in_course_codes");
  }
  await assertItemCodesWithinCourse(courseId, courseItemId, requestedIds);
}
