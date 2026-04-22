import { auth } from "@/auth";
import { listChildren } from "@/lib/graph-drive";
import { getValidAccessTokenForUser } from "@/lib/ms-token";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const token = await getValidAccessTokenForUser(s.user.id);
  if ("error" in token) {
    return NextResponse.json(
      {
        error: token.error,
        message: "Sign in with your Microsoft (Entra / school) account.",
      },
      { status: 400 }
    );
  }
  const { searchParams } = new URL(req.url);
  const itemId = searchParams.get("itemId");
  try {
    const data = await listChildren(
      token.accessToken,
      itemId || null
    );
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json(
      { error: "graph", detail: String(e) },
      { status: 500 }
    );
  }
}
