import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { termChronology } from "@/lib/term-display";
import { NextResponse } from "next/server";

function byTermThenCourse<
  T extends {
    label: string;
    courseOffering: {
      course: { name: string };
      term: {
        academicYear: { startYear?: number | null };
        termSeason: { key: string };
        sortOrder?: number;
      };
    };
  },
>(a: T, b: T) {
  const rank = termChronology(b.courseOffering.term) - termChronology(a.courseOffering.term);
  if (rank) return rank;
  const byName = a.courseOffering.course.name.localeCompare(b.courseOffering.course.name);
  if (byName) return byName;
  return a.label.localeCompare(b.label, undefined, { numeric: true });
}

export async function GET() {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (s.user.role === "CIDA") {
    return NextResponse.json([]);
  }
  const rows = await prisma.sectionInstructor.findMany({
    where: { userId: s.user.id },
    include: {
      section: {
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
      },
    },
  });
  return NextResponse.json(rows.map((r) => r.section).sort(byTermThenCourse));
}
