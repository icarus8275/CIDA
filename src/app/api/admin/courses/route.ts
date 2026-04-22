import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const createSchema = z.object({
  name: z.string().min(1).max(500),
  sortOrder: z.number().int().optional(),
});

const bulkSchema = z.object({
  bulkNames: z.array(z.string().min(1).max(500)).min(1).max(500),
});

const patchSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1).max(500).optional(),
  sortOrder: z.number().int().optional(),
});

export async function GET() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const list = await prisma.course.findMany({
    orderBy: { sortOrder: "asc" },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const json = await req.json();
  if (json.bulkNames != null) {
    const body = bulkSchema.parse(json);
    const max = await prisma.course.aggregate({ _max: { sortOrder: true } });
    let order = (max._max.sortOrder ?? 0) + 1;
    const created = [];
    for (const name of body.bulkNames.map((n) => n.trim()).filter(Boolean)) {
      const c = await prisma.course.create({
        data: { name, sortOrder: order++ },
      });
      created.push(c);
    }
    return NextResponse.json({ created });
  }
  const body = createSchema.parse(json);
  const max = await prisma.course.aggregate({ _max: { sortOrder: true } });
  const c = await prisma.course.create({
    data: {
      name: body.name,
      sortOrder: body.sortOrder ?? (max._max.sortOrder ?? 0) + 1,
    },
  });
  return NextResponse.json(c);
}

export async function PATCH(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = patchSchema.parse(await req.json());
  const c = await prisma.course.update({
    where: { id: body.id },
    data: {
      name: body.name,
      sortOrder: body.sortOrder,
    },
  });
  return NextResponse.json(c);
}

const deleteBulkSchema = z.object({ ids: z.array(z.string()).min(1) });

export async function DELETE(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (id) {
    await prisma.course.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  }
  const json = await req.json().catch(() => null);
  if (json?.ids) {
    const body = deleteBulkSchema.parse(json);
    await prisma.course.deleteMany({ where: { id: { in: body.ids } } });
    return NextResponse.json({ ok: true });
  }
  return NextResponse.json({ error: "id or ids" }, { status: 400 });
}
