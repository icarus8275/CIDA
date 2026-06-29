import { auth } from "@/auth";
import { canEditSection } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const patchSchema = z.object({
  syllabusUrl: z.string().max(2000).optional().nullable(),
  syllabusLinkTitle: z.string().max(500).optional().nullable(),
});

function normalizeShareUrl(u: string | null | undefined): string | null {
  if (u == null) return null;
  const t = u.trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) return null;
  return t;
}

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
          course: {
            include: {
              courseCodes: {
                orderBy: { codeNumber: { value: "asc" } },
                include: { codeNumber: true },
              },
            },
          },
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

export async function PATCH(
  req: Request,
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

  const body = patchSchema.parse(await req.json());
  const data: {
    syllabusUrl?: string | null;
    syllabusLinkTitle?: string | null;
  } = {};
  if (body.syllabusUrl !== undefined) {
    data.syllabusUrl = normalizeShareUrl(body.syllabusUrl);
  }
  if (body.syllabusLinkTitle !== undefined) {
    const t = body.syllabusLinkTitle?.trim();
    data.syllabusLinkTitle = t ? t : null;
  }

  const section = await prisma.section.update({
    where: { id: sectionId },
    data,
    include: {
      courseOffering: {
        include: {
          course: {
            include: {
              courseCodes: {
                orderBy: { codeNumber: { value: "asc" } },
                include: { codeNumber: true },
              },
            },
          },
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
  return NextResponse.json(section);
}
