import { auth } from "@/auth";
import { canEditSection } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const putSchema = z.object({ codes: z.array(z.string().min(1).max(32)) });

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
  const codes = [...new Set(body.codes.map((c) => c.toUpperCase()))];
  await prisma.$transaction([
    prisma.courseItemCode.deleteMany({ where: { courseItemId: id } }),
    ...(codes.length
      ? [
          prisma.courseItemCode.createMany({
            data: codes.map((c) => ({ courseItemId: id, code: c })),
          }),
        ]
      : []),
  ]);
  const row = await prisma.courseItem.findUnique({
    where: { id },
    include: { codes: true },
  });
  return NextResponse.json(row);
}
