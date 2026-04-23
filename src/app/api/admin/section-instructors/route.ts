import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { NextResponse } from "next/server";

function revalidateTeach() {
  revalidatePath("/teach");
  revalidatePath("/teach", "layout");
  revalidatePath("/explore");
  revalidatePath("/explore", "layout");
}

const postSchema = z.object({
  userId: z.string().min(1),
  sectionId: z.string().min(1),
});

const delSchema = z.object({
  userId: z.string().min(1),
  sectionId: z.string().min(1),
});

export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const sectionId = new URL(req.url).searchParams.get("sectionId");
  if (sectionId) {
    const rows = await prisma.sectionInstructor.findMany({
      where: { sectionId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });
    return NextResponse.json(rows);
  }
  const rows = await prisma.sectionInstructor.findMany({
    include: {
      user: { select: { id: true, email: true, name: true } },
      section: {
        include: {
          courseOffering: {
            include: {
              course: true,
              term: { include: { academicYear: true, termSeason: true } },
            },
          },
        },
      },
    },
  });
  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = postSchema.parse(await req.json());
  try {
    const row = await prisma.sectionInstructor.create({
      data: { userId: body.userId, sectionId: body.sectionId },
    });
    revalidateTeach();
    return NextResponse.json(row);
  } catch {
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }
}

export async function DELETE(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = delSchema.parse(await req.json());
  await prisma.sectionInstructor.delete({
    where: {
      userId_sectionId: { userId: body.userId, sectionId: body.sectionId },
    },
  });
  revalidateTeach();
  return NextResponse.json({ ok: true });
}
