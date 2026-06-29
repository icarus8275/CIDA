import { auth } from "@/auth";
import {
  assertAssignableCodeNumberIds,
  CodeNumberAssignError,
} from "@/lib/code-number-assign";
import { canEditSection } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const putSchema = z.object({ codeNumberIds: z.array(z.string().min(1)) });

const sectionInclude = {
  courseOffering: {
    include: {
      course: true,
      term: { include: { academicYear: true, termSeason: true } },
    },
  },
  sectionCodes: {
    orderBy: { codeNumber: { value: "asc" as const } },
    include: { codeNumber: true },
  },
  courseItems: {
    orderBy: [{ sortOrder: "asc" as const }, { number: "asc" as const }],
    include: {
      itemType: true,
      codes: {
        orderBy: { codeNumber: { value: "asc" as const } },
        include: { codeNumber: true },
      },
    },
  },
};

export async function PUT(
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

  const ok = await canEditSection(s.user.id, s.user.role, sectionId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = putSchema.parse(await req.json());
  const codeNumberIds = [...new Set(body.codeNumberIds)];

  try {
    await assertAssignableCodeNumberIds(null, codeNumberIds);
  } catch (e) {
    if (e instanceof CodeNumberAssignError) {
      return NextResponse.json(
        {
          error: e.errCode,
          message: "One or more code numbers are invalid or inactive.",
        },
        { status: 400 }
      );
    }
    throw e;
  }

  const allowed = new Set(codeNumberIds);

  await prisma.$transaction(async (tx) => {
    await tx.sectionCode.deleteMany({
      where: {
        sectionId,
        ...(allowed.size
          ? { codeNumberId: { notIn: [...allowed] } }
          : {}),
      },
    });

    if (allowed.size) {
      const existing = await tx.sectionCode.findMany({
        where: { sectionId },
        select: { codeNumberId: true },
      });
      const have = new Set(existing.map((r) => r.codeNumberId));
      const toAdd = [...allowed].filter((id) => !have.has(id));
      if (toAdd.length) {
        await tx.sectionCode.createMany({
          data: toAdd.map((codeNumberId) => ({ sectionId, codeNumberId })),
        });
      }
    }

    if (allowed.size === 0) {
      await tx.courseItemCode.deleteMany({
        where: { courseItem: { sectionId } },
      });
    } else {
      await tx.courseItemCode.deleteMany({
        where: {
          courseItem: { sectionId },
          codeNumberId: { notIn: [...allowed] },
        },
      });
    }
  });

  const section = await prisma.section.findUnique({
    where: { id: sectionId },
    include: sectionInclude,
  });
  if (!section) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(section);
}
