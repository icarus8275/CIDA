import { auth } from "@/auth";
import {
  CopyMatchingItemsError,
  copyMatchingAssessments,
} from "@/lib/copy-matching-items";
import { z } from "zod";
import { NextResponse } from "next/server";

const bodySchema = z.object({
  sourceSectionId: z.string().min(1),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ sectionId: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (s.user.role === "CIDA") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { sectionId } = await params;
  const body = bodySchema.parse(await req.json());

  try {
    const result = await copyMatchingAssessments({
      actor: {
        id: s.user.id,
        role: s.user.role,
        name: s.user.name,
        email: s.user.email,
      },
      sourceSectionId: body.sourceSectionId,
      targetSectionId: sectionId,
    });
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    if (e instanceof CopyMatchingItemsError) {
      const status =
        e.code === "forbidden"
          ? 403
          : e.code === "not_found"
            ? 404
            : 400;
      return NextResponse.json({ error: e.code }, { status });
    }
    throw e;
  }
}
