import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export async function requireSession() {
  const s = await auth();
  if (!s?.user?.id) {
    redirect("/auth/signin");
  }
  return s;
}

export async function requireAdmin() {
  const s = await requireSession();
  if (s.user.role !== "ADMIN") {
    redirect("/teach?error=admin");
  }
  return s;
}

export async function requireProfessorOrAdmin() {
  const s = await requireSession();
  if (s.user.role === "CIDA") {
    redirect("/explore");
  }
  return s;
}

/** CIDA = read-only; never edit sections/items */
export function isReadOnlyRole(
  role: "ADMIN" | "PROFESSOR" | "CIDA"
): boolean {
  return role === "CIDA";
}

/** ADMIN = full section/teach access like faculty; PROFESSOR needs SectionInstructor row. */
export async function canEditSection(
  userId: string,
  userRole: "ADMIN" | "PROFESSOR" | "CIDA",
  sectionId: string
) {
  if (userRole === "ADMIN") return true;
  if (userRole === "CIDA") return false;
  const row = await prisma.sectionInstructor.findUnique({
    where: { userId_sectionId: { userId, sectionId } },
  });
  return !!row;
}
