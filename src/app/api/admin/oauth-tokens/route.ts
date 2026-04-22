import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { encryptOptional } from "@/lib/crypto";
import { z } from "zod";
import { NextResponse } from "next/server";

const postSchema = z.object({
  label: z.string().min(1).max(120),
  refreshToken: z.string().min(10),
  accessToken: z.string().optional(),
  expiresAt: z.string().datetime().optional(),
});

/**
 * Optional extra OAuth connection (e.g. alternate admin account).
 * If OAUTH_ENCRYPTION_KEY is set, values are stored with AES-GCM.
 */
export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const body = postSchema.parse(await req.json());
  const r = encryptOptional(body.refreshToken);
  const a = body.accessToken
    ? encryptOptional(body.accessToken)
    : null;
  const row = await prisma.oauthTokenStore.upsert({
    where: { userId_label: { userId: s.user.id, label: body.label } },
    create: {
      userId: s.user.id,
      label: body.label,
      encRefresh: r.payload,
      encAccess: a?.payload ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
    update: {
      encRefresh: r.payload,
      encAccess: a?.payload ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
    },
  });
  return NextResponse.json({ id: row.id, label: row.label, stored: true });
}
