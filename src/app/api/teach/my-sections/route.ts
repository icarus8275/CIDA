import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (s.user.role === "ADMIN") {
    const all = await prisma.section.findMany({
      orderBy: { sortOrder: "asc" },
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
    return NextResponse.json(all);
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
  return NextResponse.json(rows.map((r) => r.section));
}
