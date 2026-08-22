import { auth } from "@/auth";
import { leaveCourseShare } from "@/lib/section-share";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  courseOfferingId: z.string().min(1),
});

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = schema.parse(await req.json());
  try {
    await leaveCourseShare({
      actor: { id: s.user.id, name: s.user.name, email: s.user.email },
      courseOfferingId: body.courseOfferingId,
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
