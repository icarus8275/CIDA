import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NextResponse } from "next/server";

function revalidateTeachAndExplore() {
  revalidatePath("/teach");
  revalidatePath("/teach", "layout");
  revalidatePath("/explore");
  revalidatePath("/explore", "layout");
}

function isPrismaUniqueViolation(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

const postSchema = z.object({
  courseId: z.string().min(1).optional(),
  name: z.string().min(1).max(500).optional(),
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
  let courseId = body.courseId;
  if (!courseId && body.name?.trim()) {
    const maxCourse = await prisma.course.aggregate({ _max: { sortOrder: true } });
    const created = await prisma.course.create({
      data: {
        name: body.name.trim(),
        sortOrder: (maxCourse._max.sortOrder ?? 0) + 1,
      },
    });
    courseId = created.id;
  }
  if (!courseId) {
    return NextResponse.json({ error: "course" }, { status: 400 });
  }
  const term = await prisma.term.findUnique({ where: { id: body.termId } });
  if (!term) {
    return NextResponse.json({ error: "term" }, { status: 404 });
  }
  const max = await prisma.courseOffering.aggregate({
    where: { termId: body.termId },
    _max: { sortOrder: true },
  });
  try {
    const row = await prisma.courseOffering.create({
      data: {
        courseId,
        termId: body.termId,
        sortOrder: body.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
      },
      include: { course: true },
    });
    if (term.kind === "GROUP") {
      await prisma.section.create({
        data: {
          courseOfferingId: row.id,
          label: "001",
          sortOrder: 0,
        },
      });
    }
    revalidateTeachAndExplore();
    return NextResponse.json(row);
  } catch (e) {
    if (isPrismaUniqueViolation(e)) {
      return NextResponse.json(
        {
          error: "duplicate_offering",
          message: "This course is already scheduled in that term.",
        },
        { status: 409 }
      );
    }
    throw e;
  }
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
  revalidateTeachAndExplore();
  return NextResponse.json({ ok: true });
}
