import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { compareTerms } from "@/lib/term-display";
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
  sections.sort((a, b) => {
    const byTerm = compareTerms(a.courseOffering.term, b.courseOffering.term);
    if (byTerm !== 0) return byTerm;
    const byCourse = a.courseOffering.course.name.localeCompare(
      b.courseOffering.course.name
    );
    if (byCourse !== 0) return byCourse;
    return a.label.localeCompare(b.label, undefined, { numeric: true });
  });
  return NextResponse.json(sections);
}
