import { auth } from "@/auth";
import { isSmtpConfigured, sendMail } from "@/lib/mail";
import { z } from "zod";
import { NextResponse } from "next/server";

const schema = z.object({
  to: z.string().email(),
});

export async function GET() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    configured: isSmtpConfigured(),
    host: process.env.SMTP_HOST?.trim() || "smtp.hostinger.com",
    port: process.env.SMTP_PORT?.trim() || "465",
    user: process.env.SMTP_USER?.trim() || "professor@jakeson.net",
    from:
      process.env.SMTP_FROM?.trim() ||
      process.env.SMTP_USER?.trim() ||
      "professor@jakeson.net",
    hasPass: Boolean(process.env.SMTP_PASS?.trim()),
  });
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = schema.parse(await req.json());
  const result = await sendMail({
    to: body.to,
    subject: "CIDA email test",
    text: [
      "This is a test message from the CIDA admin email test page.",
      "",
      `Sent at: ${new Date().toISOString()}`,
      `Requested by: ${s.user.email ?? s.user.id}`,
    ].join("\n"),
  });
  if (!result.ok) {
    return NextResponse.json(
      { ok: false, error: result.error },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, messageId: result.messageId });
}
