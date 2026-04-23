import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/**
 * Admin: list sections a user is assigned to as instructor (for surrogate editing).
 */
export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const userId = new URL(req.url).searchParams.get("userId");
  if (!userId?.trim()) {
    return NextResponse.json({ error: "userId" }, { status: 400 });
  }
  const sections = await prisma.section.findMany({
    where: { instructors: { some: { userId } } },
    orderBy: [
      { courseOffering: { term: { academicYear: { startYear: "asc" } } } },
      { courseOffering: { term: { sortOrder: "asc" } } },
      { courseOffering: { course: { name: "asc" } } },
      { label: "asc" },
    ],
    include: {
      courseOffering: {
        include: {
          course: true,
          term: {
            include: { academicYear: true, termSeason: true },
          },
        },
      },
    },
  });
  return NextResponse.json(sections);
}
