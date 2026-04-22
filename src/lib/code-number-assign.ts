import { prisma } from "@/lib/prisma";

export class CodeNumberAssignError extends Error {
  constructor(
    public readonly errCode: "invalid_code_numbers" | "inactive_code_number"
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
