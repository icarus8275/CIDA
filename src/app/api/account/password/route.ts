import { auth } from "@/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const schema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: z.string().min(8).max(200),
});

export async function PATCH(req: Request) {
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = schema.parse(await req.json());
  if (body.currentPassword === body.newPassword) {
    return NextResponse.json(
      { error: "same_password", message: "New password must differ from the current one." },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: s.user.id },
    select: { passwordHash: true },
  });
  if (!user) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ok = await verifyPassword(body.currentPassword, user.passwordHash);
  if (!ok) {
    return NextResponse.json(
      { error: "bad_current", message: "Current password is incorrect." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(body.newPassword);
  await prisma.user.update({
    where: { id: s.user.id },
    data: {
      passwordHash,
      tempPassword: null,
    },
  });

  const { logActivity } = await import("@/lib/activity-log");
  await logActivity(
    s.user,
    `${s.user.name || s.user.email} changed their password`,
    `${s.user.name || s.user.email} 님이 비밀번호를 변경했습니다`
  );

  return NextResponse.json({ ok: true });
}
