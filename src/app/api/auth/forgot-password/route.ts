import { sendTempPasswordEmail } from "@/lib/mail";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { generateTempPassword } from "@/lib/temp-password";
import { z } from "zod";
import { NextResponse } from "next/server";

const schema = z.object({
  email: z.string().email(),
});

/**
 * Always returns a generic success payload to avoid email enumeration.
 * If the account exists, a new 8-char temp password is set and emailed.
 */
export async function POST(req: Request) {
  const body = schema.safeParse(await req.json());
  if (!body.success) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  const email = body.data.email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, email: true },
  });

  if (user?.email) {
    const tempPassword = generateTempPassword(8);
    const passwordHash = await hashPassword(tempPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, tempPassword },
    });
    await sendTempPasswordEmail({
      to: user.email,
      tempPassword,
      reason: "reset",
    });
  }

  return NextResponse.json({
    ok: true,
    message:
      "If an account exists for that email, a temporary password has been sent.",
  });
}
