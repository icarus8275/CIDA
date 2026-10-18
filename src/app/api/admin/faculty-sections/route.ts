import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { loadCourseItemsForSection } from "@/lib/section-share";
import {
  formatTermForDisplay,
  isGroupTerm,
  termChronology,
} from "@/lib/term-display";
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
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true },
  });
  if (!user || (user.role !== "ADMIN" && user.role !== "PROFESSOR")) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const courses = (
    await Promise.all(
      sections.map(async (sec) => {
        const items = await loadCourseItemsForSection({
          sectionId: sec.id,
          courseOfferingId: sec.courseOfferingId,
          userId: user.id,
          role: user.role,
        });
        const term = sec.courseOffering.term;
        return {
          id: sec.id,
          courseName: sec.courseOffering.course.name,
          sectionLabel: sec.label,
          termId: term.id,
          termLabel: formatTermForDisplay(term),
          termRank: termChronology(term),
          hasContent: !isGroupTerm(term) && items.length > 0,
          linkOnly: isGroupTerm(term),
        };
      })
    )
  ).sort((a, b) => {
    if (b.termRank !== a.termRank) return b.termRank - a.termRank;
    const byName = a.courseName.localeCompare(b.courseName);
    if (byName) return byName;
    return a.sectionLabel.localeCompare(b.sectionLabel, undefined, {
      numeric: true,
    });
  });

  return NextResponse.json(courses);
}
