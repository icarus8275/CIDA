import { auth } from "@/auth";
import { checkLinkHealth, checkLinkHealthMany } from "@/lib/link-health";
import { z } from "zod";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url).searchParams.get("url")?.trim() ?? "";
  if (!url) {
    return NextResponse.json({ error: "url" }, { status: 400 });
  }
  if (url.length > 2000) {
    return NextResponse.json({ status: "dead" });
  }
  const status = await checkLinkHealth(url);
  return NextResponse.json({ status });
}

const postSchema = z.object({
  urls: z.array(z.string().max(2000)).max(300),
});

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "urls" }, { status: 400 });
  }
  const statuses = await checkLinkHealthMany(parsed.data.urls);
  return NextResponse.json({ statuses });
}
