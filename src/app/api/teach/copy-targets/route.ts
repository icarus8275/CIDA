import { auth } from "@/auth";
import { listCopyTargetSections } from "@/lib/copy-course-contents";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (s.user.role === "CIDA") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const url = new URL(req.url);
  const fromSectionId = url.searchParams.get("fromSectionId")?.trim();
  if (!fromSectionId) {
    return NextResponse.json({ error: "fromSectionId" }, { status: 400 });
  }

  const requestedUser = url.searchParams.get("forUserId")?.trim();
  const userId =
    s.user.role === "ADMIN" && requestedUser ? requestedUser : s.user.id;

  const targets = await listCopyTargetSections({
    userId,
    fromSectionId,
  });
  return NextResponse.json(targets);
}
