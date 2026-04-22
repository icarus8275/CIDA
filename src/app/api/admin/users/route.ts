import { auth } from "@/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import type { UserRole } from "@/generated/prisma/enums";
import { z } from "zod";
import { NextResponse } from "next/server";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(200),
  name: z.string().max(200).optional(),
  role: z.enum(["ADMIN", "PROFESSOR", "CIDA"]),
});

const patchSchema = z.object({
  id: z.string().min(1),
  role: z.enum(["ADMIN", "PROFESSOR", "CIDA"]),
});

const patchPasswordSchema = z.object({
  id: z.string().min(1),
  password: z.string().min(8).max(200),
});

export async function GET() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const list = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: { id: true, email: true, name: true, role: true },
  });
  return NextResponse.json(list);
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = createSchema.parse(await req.json());
  const email = body.email.toLowerCase().trim();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "email taken" }, { status: 409 });
  }
  const passwordHash = await hashPassword(body.password);
  const u = await prisma.user.create({
    data: {
      email,
      name: body.name,
      role: body.role as UserRole,
      passwordHash,
      emailVerified: new Date(),
    },
    select: { id: true, email: true, name: true, role: true },
  });
  return NextResponse.json(u);
}

export async function PATCH(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const raw = await req.json();
  if (raw.password !== undefined) {
    const body = patchPasswordSchema.parse(raw);
    const passwordHash = await hashPassword(body.password);
    await prisma.user.update({
      where: { id: body.id },
      data: { passwordHash },
    });
    return NextResponse.json({ ok: true });
  }
  const body = patchSchema.parse(raw);
  await prisma.user.update({
    where: { id: body.id },
    data: { role: body.role as UserRole },
  });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id" }, { status: 400 });
  }
  if (id === s.user.id) {
    return NextResponse.json({ error: "cannot delete self" }, { status: 400 });
  }
  await prisma.user.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
