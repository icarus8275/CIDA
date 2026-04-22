import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const postSchema = z.object({
  academicYearId: z.string().min(1),
  termSeasonId: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  sortOrder: z.number().int(),
});

export async function GET() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const list = await prisma.term.findMany({
    orderBy: { sortOrder: "asc" },
    include: {
      academicYear: true,
      termSeason: true,
    },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = postSchema.parse(await req.json());
  const term = await prisma.term.create({
    data: {
      academicYearId: body.academicYearId,
      termSeasonId: body.termSeasonId,
      sortOrder: body.sortOrder ?? 0,
    },
    include: { academicYear: true, termSeason: true },
  });
  return NextResponse.json(term);
}

export async function PATCH(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = patchSchema.parse(await req.json());
  await prisma.term.update({
    where: { id: body.id },
    data: { sortOrder: body.sortOrder },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id" }, { status: 400 });
  await prisma.term.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
