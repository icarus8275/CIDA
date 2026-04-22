import { auth } from "@/auth";
import { canEditCourse } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const postSchema = z.object({
  courseId: z.string().min(1),
  itemTypeId: z.string().min(1),
  number: z.number().int().min(0),
  sortOrder: z.number().int().optional(),
  codes: z.array(z.string().min(1).max(32)).optional(),
});

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = postSchema.parse(await req.json());
  const ok = await canEditCourse(
    s.user.id,
    s.user.role,
    body.courseId
  );
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  try {
    const item = await prisma.courseItem.create({
      data: {
        courseId: body.courseId,
        itemTypeId: body.itemTypeId,
        number: body.number,
        sortOrder: body.sortOrder ?? body.number,
        codes: body.codes
          ? {
              create: body.codes.map((c) => ({ code: c.toUpperCase() })),
            }
          : undefined,
      },
      include: { itemType: true, codes: true },
    });
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json(
      { error: "create failed", detail: String(e) },
      { status: 400 }
    );
  }
}
