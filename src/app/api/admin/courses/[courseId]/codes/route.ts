import { auth } from "@/auth";
import {
  assertAssignableCodeNumberIds,
  CodeNumberAssignError,
} from "@/lib/code-number-assign";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const putSchema = z.object({ codeNumberIds: z.array(z.string().min(1)) });

const courseInclude = {
  courseCodes: {
    orderBy: { codeNumber: { value: "asc" as const } },
    include: { codeNumber: true },
  },
};

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { courseId } = await params;

  const exists = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true },
  });
  if (!exists) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
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
    await tx.courseCode.deleteMany({
      where: {
        courseId,
        ...(allowed.size ? { codeNumberId: { notIn: [...allowed] } } : {}),
      },
    });

    if (allowed.size) {
      const existing = await tx.courseCode.findMany({
        where: { courseId },
        select: { codeNumberId: true },
      });
      const have = new Set(existing.map((r) => r.codeNumberId));
      const toAdd = [...allowed].filter((id) => !have.has(id));
      if (toAdd.length) {
        await tx.courseCode.createMany({
          data: toAdd.map((codeNumberId) => ({ courseId, codeNumberId })),
        });
      }
    }

    if (allowed.size === 0) {
      await tx.courseItemCode.deleteMany({
        where: {
          courseItem: {
            section: { courseOffering: { courseId } },
          },
        },
      });
    } else {
      await tx.courseItemCode.deleteMany({
        where: {
          courseItem: {
            section: { courseOffering: { courseId } },
          },
          codeNumberId: { notIn: [...allowed] },
        },
      });
    }
  });

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: courseInclude,
  });
  return NextResponse.json(course);
}
