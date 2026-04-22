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
  return requireSession();
}

/** Professor (assigned) or admin may edit the course. */
export async function canEditCourse(
  userId: string,
  userRole: "ADMIN" | "PROFESSOR",
  courseId: string
) {
  if (userRole === "ADMIN") return true;
  const row = await prisma.courseProfessor.findUnique({
    where: { userId_courseId: { userId, courseId } },
  });
  return !!row;
}
