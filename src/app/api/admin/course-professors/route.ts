import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const postSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
});

const delSchema = z.object({
  userId: z.string().min(1),
  courseId: z.string().min(1),
});

export async function GET() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const rows = await prisma.courseProfessor.findMany({
    include: {
      user: { select: { id: true, email: true, name: true } },
      course: { select: { id: true, name: true } },
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
  const row = await prisma.courseProfessor.create({
    data: { userId: body.userId, courseId: body.courseId },
  });
  return NextResponse.json(row);
}

export async function DELETE(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = delSchema.parse(await req.json());
  await prisma.courseProfessor.delete({
    where: {
      userId_courseId: { userId: body.userId, courseId: body.courseId },
    },
  });
  return NextResponse.json({ ok: true });
}
