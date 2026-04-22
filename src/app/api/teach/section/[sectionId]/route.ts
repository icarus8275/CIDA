import { auth } from "@/auth";
import { canEditSection, isReadOnlyRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { sectionId } = await params;

  if (s.user.role === "CIDA") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const allow = await canEditSection(s.user.id, s.user.role, sectionId);
  if (!allow) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: {
      courseOffering: {
        include: {
          course: true,
          term: { include: { academicYear: true, termSeason: true } },
        },
      },
      courseItems: {
        orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
        include: {
          itemType: true,
          codes: {
            orderBy: { codeNumber: { value: "asc" } },
            include: { codeNumber: true },
          },
        },
      },
    },
  });
  if (!section) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(section);
}
