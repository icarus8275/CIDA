import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const postSchema = z.object({
  courseId: z.string().min(1),
  termId: z.string().min(1),
  sortOrder: z.number().int().optional(),
});

const reorderSchema = z.object({
  termId: z.string().min(1),
  offeringIds: z.array(z.string().min(1)),
});

export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const termId = new URL(req.url).searchParams.get("termId");
  if (termId) {
    const list = await prisma.courseOffering.findMany({
      where: { termId },
      orderBy: { sortOrder: "asc" },
      include: { course: true },
    });
    return NextResponse.json(list);
  }
  const all = await prisma.courseOffering.findMany({
    orderBy: [{ termId: "asc" }, { sortOrder: "asc" }],
    include: {
      course: true,
      term: { include: { academicYear: true, termSeason: true } },
    },
  });
  return NextResponse.json(all);
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = postSchema.parse(await req.json());
  const max = await prisma.courseOffering.aggregate({
    where: { termId: body.termId },
    _max: { sortOrder: true },
  });
  const row = await prisma.courseOffering.create({
    data: {
      courseId: body.courseId,
      termId: body.termId,
      sortOrder: body.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
    },
    include: { course: true },
  });
  return NextResponse.json(row);
}

export async function PATCH(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = reorderSchema.parse(await req.json());
  await prisma.$transaction(
    body.offeringIds.map((id, i) =>
      prisma.courseOffering.update({
        where: { id },
        data: { sortOrder: i, termId: body.termId },
      })
    )
  );
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
  await prisma.courseOffering.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
