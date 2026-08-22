import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { sendTempPasswordEmail } from "@/lib/mail";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { generateTempPassword } from "@/lib/temp-password";
import type { UserRole } from "@/generated/prisma/enums";
import { z } from "zod";
import { NextResponse } from "next/server";

const createSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
  role: z.enum(["ADMIN", "PROFESSOR", "CIDA"]),
  /** If true, email the temp password to the user (requires SMTP). Default true. */
  sendEmail: z.boolean().optional(),
});

const patchSchema = z
  .object({
    id: z.string().min(1),
    role: z.enum(["ADMIN", "PROFESSOR", "CIDA"]).optional(),
    name: z.union([z.string().max(200), z.null()]).optional(),
  })
  .refine((d) => d.role !== undefined || d.name !== undefined, {
    message: "role or name required",
  });

const resetPasswordSchema = z.object({
  id: z.string().min(1),
  action: z.literal("resetTempPassword"),
  sendEmail: z.boolean().optional(),
});

export async function GET() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const list = await prisma.user.findMany({
    orderBy: { email: "asc" },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tempPassword: true,
    },
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

  const tempPassword = generateTempPassword(8);
  const passwordHash = await hashPassword(tempPassword);
  const u = await prisma.user.create({
    data: {
      email,
      name: body.name,
      role: body.role as UserRole,
      passwordHash,
      tempPassword,
      emailVerified: new Date(),
    },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      tempPassword: true,
    },
  });

  let emailSent = false;
  let emailError: string | undefined;
  if (body.sendEmail !== false) {
    const mail = await sendTempPasswordEmail({
      to: email,
      tempPassword,
      reason: "created",
    });
    emailSent = mail.ok;
    if (!mail.ok) emailError = mail.error;
  }

  await logActivity(
    s.user,
    `${s.user.name || s.user.email} created account ${email} (${body.role})`,
    `${s.user.name || s.user.email} 님이 계정 ${email} (${body.role})을(를) 만들었습니다`
  );

  return NextResponse.json({ ...u, emailSent, emailError });
}

export async function PATCH(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const raw = await req.json();

  if (raw.action === "resetTempPassword") {
    const body = resetPasswordSchema.parse(raw);
    const user = await prisma.user.findUnique({
      where: { id: body.id },
      select: { id: true, email: true },
    });
    if (!user?.email) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    const tempPassword = generateTempPassword(8);
    const passwordHash = await hashPassword(tempPassword);
    await prisma.user.update({
      where: { id: body.id },
      data: { passwordHash, tempPassword },
    });

    let emailSent = false;
    let emailError: string | undefined;
    if (body.sendEmail !== false) {
      const mail = await sendTempPasswordEmail({
        to: user.email,
        tempPassword,
        reason: "reset",
      });
      emailSent = mail.ok;
      if (!mail.ok) emailError = mail.error;
    }
    await logActivity(
      s.user,
      `${s.user.name || s.user.email} issued a new temporary password for ${user.email}`,
      `${s.user.name || s.user.email} 님이 ${user.email}의 임시 비밀번호를 다시 만들었습니다`
    );
    return NextResponse.json({
      ok: true,
      tempPassword,
      emailSent,
      emailError,
    });
  }

  const body = patchSchema.parse(raw);
  const data: { role?: UserRole; name?: string | null } = {};
  if (body.role !== undefined) {
    data.role = body.role as UserRole;
  }
  if (body.name !== undefined) {
    const n = body.name?.trim();
    data.name = n ? n : null;
  }
  await prisma.user.update({
    where: { id: body.id },
    data,
  });
  await logActivity(
    s.user,
    `${s.user.name || s.user.email} updated a user account`,
    `${s.user.name || s.user.email} 님이 사용자 계정을 수정했습니다`
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
  if (!id) {
    return NextResponse.json({ error: "id" }, { status: 400 });
  }
  if (id === s.user.id) {
    return NextResponse.json({ error: "cannot delete self" }, { status: 400 });
  }
  await prisma.user.delete({ where: { id } });
  await logActivity(
    s.user,
    `${s.user.name || s.user.email} deleted a user account`,
    `${s.user.name || s.user.email} 님이 사용자 계정을 삭제했습니다`
  );
  return NextResponse.json({ ok: true });
}
