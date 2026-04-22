import { auth } from "@/auth";
import { assertAssignableCodeNumberIds, CodeNumberAssignError } from "@/lib/code-number-assign";
import { canEditSection } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { NextResponse } from "next/server";

const postSchema = z.object({
  sectionId: z.string().min(1),
  itemTypeId: z.string().min(1),
  number: z.number().int().min(0),
  sortOrder: z.number().int().optional(),
  title: z.string().max(500).optional().nullable(),
  /** Catalog IDs (admin-defined). Multiple allowed. */
  codeNumberIds: z.array(z.string().min(1)).optional(),
  oneDriveUrl: z.string().max(2000).optional().nullable(),
  linkTitle: z.string().max(500).optional().nullable(),
});

function normalizeShareUrl(
  u: string | null | undefined
): string | null {
  if (u == null) return null;
  const t = u.trim();
  if (!t) return null;
  if (!/^https?:\/\//i.test(t)) {
    return null;
  }
  return t;
}

export async function POST(req: Request) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = postSchema.parse(await req.json());
  const ok = await canEditSection(s.user.id, s.user.role, body.sectionId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const url = normalizeShareUrl(body.oneDriveUrl);
  try {
    try {
      await assertAssignableCodeNumberIds(null, body.codeNumberIds ?? []);
    } catch (e) {
      if (e instanceof CodeNumberAssignError) {
        return NextResponse.json(
          { error: e.errCode, message: "One or more code numbers are invalid or inactive." },
          { status: 400 }
        );
      }
      throw e;
    }
    const item = await prisma.courseItem.create({
      data: {
        sectionId: body.sectionId,
        itemTypeId: body.itemTypeId,
        number: body.number,
        title: body.title,
        sortOrder: body.sortOrder ?? body.number,
        oneDriveUrl: url,
        linkTitle: body.linkTitle,
        codes: body.codeNumberIds?.length
          ? {
              create: body.codeNumberIds.map((codeNumberId) => ({ codeNumberId })),
            }
          : undefined,
      },
      include: {
        itemType: true,
        codes: { include: { codeNumber: true } },
      },
    });
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json(
      { error: "create failed", detail: String(e) },
      { status: 400 }
    );
  }
}
