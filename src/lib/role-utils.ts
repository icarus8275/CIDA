import type { UserRole } from "@/generated/prisma/enums";

/**
 * Teaching/section access: both ADMIN and PROFESSOR (instructor lists, assign faculty, etc.).
 * Only ADMIN has /admin; ADMIN has the same teaching access as PROFESSOR.
 * An existing admin can promote PROFESSOR → ADMIN and demote ADMIN → PROFESSOR; multiple ADMINS are allowed.
 */
export function hasFacultyAccess(role: UserRole | string): boolean {
  return role === "ADMIN" || role === "PROFESSOR";
}

export function newUserRoleOptionLabel(
  value: "ADMIN" | "PROFESSOR" | "CIDA"
): string {
  if (value === "ADMIN") {
    return "Admin (management + teaching)";
  }
  if (value === "PROFESSOR") {
    return "Professor (teaching)";
  }
  return "CIDA (read-only explore)";
}
