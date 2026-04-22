import { auth } from "@/auth";
import { assertAssignableCodeNumberIds, CodeNumberAssignError } from "@/lib/code-number-assign";
import { canEditSection } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const putSchema = z.object({ codeNumberIds: z.array(z.string().min(1)) });

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const it = await prisma.courseItem.findUnique({ where: { id } });
  if (!it) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const ok = await canEditSection(s.user.id, s.user.role, it.sectionId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = putSchema.parse(await req.json());
  const codeNumberIds = [...new Set(body.codeNumberIds)];
  try {
    await assertAssignableCodeNumberIds(id, codeNumberIds);
  } catch (e) {
    if (e instanceof CodeNumberAssignError) {
      return NextResponse.json(
        { error: e.errCode, message: "One or more code numbers are invalid or inactive." },
        { status: 400 }
      );
    }
    throw e;
  }
  await prisma.$transaction([
    prisma.courseItemCode.deleteMany({ where: { courseItemId: id } }),
    ...(codeNumberIds.length
      ? [
          prisma.courseItemCode.createMany({
            data: codeNumberIds.map((codeNumberId) => ({
              courseItemId: id,
              codeNumberId,
            })),
          }),
        ]
      : []),
  ]);
  const row = await prisma.courseItem.findUnique({
    where: { id },
    include: { codes: { include: { codeNumber: true } } },
  });
  return NextResponse.json(row);
}
