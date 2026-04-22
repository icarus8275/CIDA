import { auth } from "@/auth";
import { canEditSection } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const patchSchema = z.object({
  number: z.number().int().min(0).optional(),
  itemTypeId: z.string().min(1).optional(),
  sortOrder: z.number().int().optional(),
  title: z.string().max(500).optional().nullable(),
  oneDriveUrl: z.string().max(2000).optional().nullable(),
  linkTitle: z.string().max(500).optional().nullable(),
});

function normalizeShareUrl(u: string | null | undefined): string | null {
  if (u == null) return null;
  const t = u.trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) return null;
  return t;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const it = await prisma.courseItem.findUnique({
    where: { id },
    include: { section: true, itemType: true, codes: true },
  });
  if (!it) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const ok = await canEditSection(s.user.id, s.user.role, it.sectionId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json(it);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const it = await prisma.courseItem.findUnique({ where: { id } });
  if (!it) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const ok = await canEditSection(s.user.id, s.user.role, it.sectionId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = patchSchema.parse(await req.json());
  const urlUpd =
    body.oneDriveUrl === undefined
      ? undefined
      : normalizeShareUrl(body.oneDriveUrl);
  const updated = await prisma.courseItem.update({
    where: { id },
    data: {
      number: body.number,
      itemTypeId: body.itemTypeId,
      sortOrder: body.sortOrder,
      title: body.title,
      ...(urlUpd !== undefined ? { oneDriveUrl: urlUpd } : {}),
      linkTitle: body.linkTitle,
    },
    include: { itemType: true, codes: true },
  });
  return NextResponse.json(updated);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id } = await params;
  const it = await prisma.courseItem.findUnique({ where: { id } });
  if (!it) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const ok = await canEditSection(s.user.id, s.user.role, it.sectionId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await prisma.courseItem.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
