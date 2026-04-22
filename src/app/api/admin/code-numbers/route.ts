import { auth } from "@/auth";
import { normalizeCodeValue } from "@/lib/code-number-assign";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const postSchema = z.object({
  value: z.string().min(1).max(32),
  label: z.string().max(200).optional().nullable(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  value: z.string().min(1).max(32).optional(),
  label: z.string().max(200).optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const list = await prisma.codeNumber.findMany({
    orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = postSchema.parse(await req.json());
  const value = normalizeCodeValue(body.value);
  if (!value) {
    return NextResponse.json({ error: "empty_value" }, { status: 400 });
  }
  const max = await prisma.codeNumber.aggregate({ _max: { sortOrder: true } });
  try {
    const row = await prisma.codeNumber.create({
      data: {
        value,
        label: body.label === undefined ? null : body.label,
        sortOrder: body.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json(
      { error: "duplicate_value", message: "A code with this value already exists." },
      { status: 400 }
    );
  }
}

export async function PATCH(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = patchSchema.parse(await req.json());
  const data: {
    value?: string;
    label?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  } = {};
  if (body.value !== undefined) {
    const v = normalizeCodeValue(body.value);
    if (!v) {
      return NextResponse.json({ error: "empty_value" }, { status: 400 });
    }
    data.value = v;
  }
  if (body.label !== undefined) data.label = body.label;
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
  try {
    const row = await prisma.codeNumber.update({
      where: { id: body.id },
      data,
    });
    return NextResponse.json(row);
  } catch {
    return NextResponse.json(
      { error: "update_failed", message: "Check that the value is unique." },
      { status: 400 }
    );
  }
}

export async function DELETE(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }
  const used = await prisma.courseItemCode.findFirst({ where: { codeNumberId: id } });
  if (used) {
    await prisma.codeNumber.update({
      where: { id },
      data: { isActive: false },
    });
    return NextResponse.json({ ok: true, soft: true });
  }
  await prisma.codeNumber.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
