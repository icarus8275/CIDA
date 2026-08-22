import { auth } from "@/auth";
import { canEditSection } from "@/lib/guards";
import { requestCourseShare } from "@/lib/section-share";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  sectionId: z.string().min(1),
});

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = schema.parse(await req.json());
  const ok = await canEditSection(s.user.id, s.user.role, body.sectionId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const result = await requestCourseShare({
      actor: { id: s.user.id, name: s.user.name, email: s.user.email },
      sectionId: body.sectionId,
    });
    return NextResponse.json(result);
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
