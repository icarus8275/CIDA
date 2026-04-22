import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const createSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(120),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(120).optional(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const list = await prisma.itemTypeDefinition.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = createSchema.parse(await req.json());
  const max = await prisma.itemTypeDefinition.aggregate({
    _max: { sortOrder: true },
  });
  const row = await prisma.itemTypeDefinition.create({
    data: {
      key: body.key,
      label: body.label,
      sortOrder: body.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
      isActive: body.isActive ?? true,
    },
  });
  return NextResponse.json(row);
}

export async function PATCH(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = patchSchema.parse(await req.json());
  const row = await prisma.itemTypeDefinition.update({
    where: { id: body.id },
    data: {
      label: body.label,
      isActive: body.isActive,
      sortOrder: body.sortOrder,
    },
  });
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const used = await prisma.courseItem.findFirst({ where: { itemTypeId: id } });
  if (used) {
    await prisma.itemTypeDefinition.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true, soft: true });
  }
  await prisma.itemTypeDefinition.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
