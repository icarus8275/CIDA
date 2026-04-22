import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const postSchema = z.object({
  courseOfferingId: z.string().min(1),
  label: z.string().min(1).max(32),
  sortOrder: z.number().int().optional(),
});

const reorderSchema = z.object({
  courseOfferingId: z.string().min(1),
  sectionIds: z.array(z.string().min(1)),
});

const patchLabelSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(32).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const offeringId = new URL(req.url).searchParams.get("courseOfferingId");
  if (offeringId) {
    const list = await prisma.section.findMany({
      where: { courseOfferingId: offeringId },
      orderBy: { sortOrder: "asc" },
      include: {
        instructors: { include: { user: true } },
        courseOffering: {
          include: {
            course: true,
            term: { include: { academicYear: true, termSeason: true } },
          },
        },
      },
    });
    return NextResponse.json(list);
  }
  return NextResponse.json({ error: "courseOfferingId" }, { status: 400 });
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = postSchema.parse(await req.json());
  const max = await prisma.section.aggregate({
    where: { courseOfferingId: body.courseOfferingId },
    _max: { sortOrder: true },
  });
  const row = await prisma.section.create({
    data: {
      courseOfferingId: body.courseOfferingId,
      label: body.label,
      sortOrder: body.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
    },
  });
  return NextResponse.json(row);
}

export async function PATCH(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const raw = (await req.json()) as Record<string, unknown>;
  if (Array.isArray(raw.sectionIds)) {
    const data = reorderSchema.parse(raw);
    await prisma.$transaction(
      data.sectionIds.map((id, i) =>
        prisma.section.update({
          where: { id },
          data: { sortOrder: i, courseOfferingId: data.courseOfferingId },
        })
      )
    );
    return NextResponse.json({ ok: true });
  }
  const u = patchLabelSchema.parse(raw);
  const row = await prisma.section.update({
    where: { id: u.id },
    data: { label: u.label, sortOrder: u.sortOrder },
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
  await prisma.section.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
