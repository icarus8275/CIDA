import { auth } from "@/auth";
import { normalizeCodeValue } from "@/lib/code-number-assign";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

function isP2002(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code: string }).code === "P2002"
  );
}

function normalizeLabel(
  v: string | null | undefined
): string | null {
  if (v == null) {
    return null;
  }
  const t = v.trim();
  return t.length > 0 ? t : null;
}

const postSchema = z.object({
  value: z.string().min(1).max(64),
  /// No short cap — notes can be long (accreditation text, etc.)
  label: z.string().nullish(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
});

const patchSchema = z.object({
  id: z.string().min(1),
  value: z.string().min(1).max(64).optional(),
  label: z.string().nullish(),
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
  const parsed = postSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const value = normalizeCodeValue(body.value);
  if (!value) {
    return NextResponse.json(
      { error: "empty_value", message: "Value is empty after normalization." },
      { status: 400 }
    );
  }

  const maxSort = await prisma.codeNumber.aggregate({
    _max: { sortOrder: true },
  });
  const nextSort = body.sortOrder ?? (maxSort._max.sortOrder ?? 0) + 1;
  const label = normalizeLabel(body.label);

  const existing = await prisma.codeNumber.findUnique({ where: { value } });
  if (existing) {
    if (existing.isActive) {
      return NextResponse.json(
        {
          error: "duplicate",
          message: "A code with this value already exists.",
        },
        { status: 409 }
      );
    }
    const row = await prisma.codeNumber.update({
      where: { id: existing.id },
      data: {
        isActive: true,
        label,
        sortOrder: body.sortOrder ?? nextSort,
      },
    });
    return NextResponse.json(row);
  }

  try {
    const row = await prisma.codeNumber.create({
      data: {
        value,
        label,
        sortOrder: nextSort,
        isActive: body.isActive ?? true,
      },
    });
    return NextResponse.json(row);
  } catch (e) {
    if (isP2002(e)) {
      return NextResponse.json(
        {
          error: "duplicate_value",
          message: "A code with this value already exists.",
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
  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "validation",
        message: parsed.error.issues[0]?.message ?? "Invalid input.",
      },
      { status: 400 }
    );
  }
  const body = parsed.data;
  const data: {
    value?: string;
    label?: string | null;
    isActive?: boolean;
    sortOrder?: number;
  } = {};
  if (body.value !== undefined) {
    const v = normalizeCodeValue(body.value);
    if (!v) {
      return NextResponse.json(
        { error: "empty_value", message: "Value is empty after normalization." },
        { status: 400 }
      );
    }
    data.value = v;
  }
  if (body.label !== undefined) {
    data.label = normalizeLabel(body.label);
  }
  if (body.isActive !== undefined) data.isActive = body.isActive;
  if (body.sortOrder !== undefined) data.sortOrder = body.sortOrder;
  try {
    const row = await prisma.codeNumber.update({
      where: { id: body.id },
      data,
    });
    return NextResponse.json(row);
  } catch (e) {
    if (isP2002(e)) {
      return NextResponse.json(
        {
          error: "update_failed",
          message: "Check that the value is unique.",
        },
        { status: 409 }
      );
    }
    throw e;
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
