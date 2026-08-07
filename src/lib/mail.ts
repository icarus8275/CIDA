import nodemailer from "nodemailer";

export type SendMailResult =
  | { ok: true; messageId?: string }
  | { ok: false; error: string };

function smtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || "smtp.hostinger.com";
  const port = parseInt(process.env.SMTP_PORT?.trim() || "465", 10);
  const user = process.env.SMTP_USER?.trim() || "professor@jakeson.net";
  const pass = process.env.SMTP_PASS?.trim() || "";
  const from =
    process.env.SMTP_FROM?.trim() ||
    process.env.SMTP_USER?.trim() ||
    "professor@jakeson.net";
  return { host, port, user, pass, from };
}

export function isSmtpConfigured(): boolean {
  const { user, pass } = smtpConfig();
  return Boolean(user && pass);
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}): Promise<SendMailResult> {
  const { host, port, user, pass, from } = smtpConfig();
  if (!user || !pass) {
    return {
      ok: false,
      error:
        "SMTP is not configured. Set SMTP_PASS (and SMTP_USER if needed) in Hostinger environment variables.",
    };
  }

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
    });
    const info = await transporter.sendMail({
      from,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html ?? opts.text.replace(/\n/g, "<br>\n"),
    });
    return { ok: true, messageId: info.messageId };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}

export async function sendTempPasswordEmail(opts: {
  to: string;
  tempPassword: string;
  reason: "created" | "reset";
}): Promise<SendMailResult> {
  const site = process.env.AUTH_URL?.trim().replace(/\/$/, "") || "";
  const subject =
    opts.reason === "created"
      ? "Your CIDA temporary password"
      : "Your CIDA temporary password (reset)";
  const text = [
    "Ball State Interior Design — CIDA",
    "",
    opts.reason === "created"
      ? "An account was created for you. Use this temporary password to sign in:"
      : "A temporary password was issued for your account. Use it to sign in:",
    "",
    `Email: ${opts.to}`,
    `Temporary password: ${opts.tempPassword}`,
    "",
    site ? `Sign in: ${site}/auth/signin` : "Sign in on the CIDA website.",
    "",
    "After signing in, please change your password (Change password in the menu).",
    "",
    "If you did not request this, contact your program administrator.",
  ].join("\n");

  return sendMail({ to: opts.to, subject, text });
}
