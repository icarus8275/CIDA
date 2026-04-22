import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const postSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z0-9-]+$/),
  label: z.string().min(1).max(200),
  sortOrder: z.number().int().optional(),
});

const patchSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(200).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const list = await prisma.termSeason.findMany({ orderBy: { sortOrder: "asc" } });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = postSchema.parse(await req.json());
  const row = await prisma.termSeason.create({
    data: {
      key: body.key,
      label: body.label,
      sortOrder: body.sortOrder ?? 0,
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
  const row = await prisma.termSeason.update({
    where: { id: body.id },
    data: { label: body.label, sortOrder: body.sortOrder },
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
  if (!id) return NextResponse.json({ error: "id" }, { status: 400 });
  await prisma.termSeason.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
