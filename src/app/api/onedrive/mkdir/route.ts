import { auth } from "@/auth";
import { createFolder } from "@/lib/graph-drive";
import { getValidAccessTokenForUser } from "@/lib/ms-token";
import { z } from "zod";
import { NextResponse } from "next/server";

const bodySchema = z.object({
  name: z.string().min(1).max(255),
  parentItemId: z.string().nullable().optional(),
});

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = await getValidAccessTokenForUser(s.user.id);
  if ("error" in token) {
    return NextResponse.json(
      { error: token.error },
      { status: 400 }
    );
  }
  const body = bodySchema.parse(await req.json());
  try {
    const item = await createFolder(
      token.accessToken,
      body.parentItemId ?? null,
      body.name
    );
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json(
      { error: "graph", detail: String(e) },
      { status: 500 }
    );
  }
}
