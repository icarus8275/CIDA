import { auth } from "@/auth";
import { respondToShareRequest } from "@/lib/section-share";
import { NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  requestId: z.string().min(1),
  accept: z.boolean(),
});

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = schema.parse(await req.json());
  try {
    const result = await respondToShareRequest({
      actor: { id: s.user.id, name: s.user.name, email: s.user.email },
      requestId: body.requestId,
      accept: body.accept,
    });
    return NextResponse.json(result);
  } catch (e) {
    const code = e instanceof Error ? e.message : "failed";
    return NextResponse.json({ error: code }, { status: 400 });
  }
}
