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
  revalidatePath("/admin/schedule");
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
  try {
    const term = await prisma.term.create({
      data: {
        academicYearId: body.academicYearId,
        termSeasonId: body.termSeasonId,
        sortOrder: body.sortOrder ?? 0,
      },
      include: { academicYear: true, termSeason: true },
    });
    return NextResponse.json(term);
  } catch (e) {
    if (isPrismaUniqueViolation(e)) {
      return NextResponse.json(
        {
          error: "duplicate_term",
          message:
            "This academic year and season are already combined. Each pair can only exist once.",
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
  if (searchParams.get("all") === "true") {
    const r = await prisma.term.deleteMany();
    revalidateTeachAndExplore();
    return NextResponse.json({ ok: true, deleted: r.count });
  }
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id" }, { status: 400 });
  await prisma.term.delete({ where: { id } });
  revalidateTeachAndExplore();
  return NextResponse.json({ ok: true });
}
