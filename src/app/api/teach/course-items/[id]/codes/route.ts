import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { assertItemCodesWithinSection, CodeNumberAssignError } from "@/lib/code-number-assign";
import { canEditSection } from "@/lib/guards";
import { describeCourseItem } from "@/lib/item-labels";
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
    await assertItemCodesWithinSection(it.sectionId, id, codeNumberIds);
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
  const desc = await describeCourseItem(id);
  if (desc) {
    await logActivity(
      s.user,
      `${s.user.name || s.user.email} updated CIDA codes on ${desc.itemLabel} in ${desc.path}`,
      `${s.user.name || s.user.email} 님이 ${desc.path}의 ${desc.itemLabel} CIDA 코드를 수정했습니다`
    );
  }
  return NextResponse.json(row);
}
