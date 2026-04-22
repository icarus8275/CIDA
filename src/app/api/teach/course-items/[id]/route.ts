import { auth } from "@/auth";
import { canEditCourse } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const patchSchema = z.object({
  number: z.number().int().min(0).optional(),
  itemTypeId: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const it = await prisma.courseItem.findUnique({
    where: { id },
    include: { course: true, itemType: true, codes: true, driveLinks: true },
  });
  if (!it) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const ok = await canEditCourse(s.user.id, s.user.role, it.courseId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(it);
}

export async function PATCH(
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
  const ok = await canEditCourse(s.user.id, s.user.role, it.courseId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = patchSchema.parse(await req.json());
  const updated = await prisma.courseItem.update({
    where: { id },
    data: {
      number: body.number,
      itemTypeId: body.itemTypeId,
      sortOrder: body.sortOrder,
    },
    include: { itemType: true, codes: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
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
  const ok = await canEditCourse(s.user.id, s.user.role, it.courseId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await prisma.courseItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
