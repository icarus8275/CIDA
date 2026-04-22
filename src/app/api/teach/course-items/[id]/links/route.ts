import { auth } from "@/auth";
import { canEditCourse } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const postSchema = z.object({
  driveId: z.string().min(1),
  driveItemId: z.string().min(1),
  webUrl: z.string().url().or(z.string().min(1)),
  name: z.string().min(1).max(500),
  path: z.string().max(2000).optional().nullable(),
});

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: courseItemId } = await params;
  const it = await prisma.courseItem.findUnique({ where: { id: courseItemId } });
  if (!it) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const ok = await canEditCourse(s.user.id, s.user.role, it.courseId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const links = await prisma.driveItemLink.findMany({
    where: { courseItemId },
  });
  return NextResponse.json(links);
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: courseItemId } = await params;
  const it = await prisma.courseItem.findUnique({ where: { id: courseItemId } });
  if (!it) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const allow = await canEditCourse(s.user.id, s.user.role, it.courseId);
  if (!allow) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = postSchema.parse(await req.json());
  const link = await prisma.driveItemLink.create({
    data: {
      courseItemId,
      driveId: body.driveId,
      driveItemId: body.driveItemId,
      webUrl: body.webUrl,
      name: body.name,
      path: body.path ?? null,
    },
  });
  return NextResponse.json(link);
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: courseItemId } = await params;
  const { searchParams } = new URL(req.url);
  const linkId = searchParams.get("linkId");
  if (!linkId) {
    return NextResponse.json({ error: "linkId required" }, { status: 400 });
  }
  const it = await prisma.courseItem.findUnique({ where: { id: courseItemId } });
  if (!it) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const allow = await canEditCourse(s.user.id, s.user.role, it.courseId);
  if (!allow) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const link = await prisma.driveItemLink.findFirst({
    where: { id: linkId, courseItemId },
  });
  if (!link) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  await prisma.driveItemLink.delete({ where: { id: linkId } });
  return NextResponse.json({ ok: true });
}
