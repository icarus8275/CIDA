import { auth } from "@/auth";
import { assertItemCodesWithinSection, CodeNumberAssignError } from "@/lib/code-number-assign";
import { canEditSection } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { id: sourceId } = await params;

  const source = await prisma.courseItem.findUnique({
    where: { id: sourceId },
    include: {
      codes: { include: { codeNumber: true } },
    },
  });
  if (!source) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  const ok = await canEditSection(s.user.id, s.user.role, source.sectionId);
  if (!ok) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const codeNumberIds = source.codes.map((c) => c.codeNumberId);
  try {
    await assertItemCodesWithinSection(
      source.sectionId,
      null,
      codeNumberIds
    );
  } catch (e) {
    if (e instanceof CodeNumberAssignError) {
      return NextResponse.json(
        {
          error: e.errCode,
          message: "One or more code numbers are invalid or inactive.",
        },
        { status: 400 }
      );
    }
    throw e;
  }

  const agg = await prisma.courseItem.aggregate({
    where: {
      sectionId: source.sectionId,
      itemTypeId: source.itemTypeId,
    },
    _max: { number: true },
  });
  const nextNumber = (agg._max.number ?? 0) + 1;

  try {
    const item = await prisma.courseItem.create({
      data: {
        sectionId: source.sectionId,
        itemTypeId: source.itemTypeId,
        number: nextNumber,
        sortOrder: nextNumber,
        title: source.title,
        oneDriveUrl: source.oneDriveUrl,
        linkTitle: source.linkTitle,
        onSiteDisplay: source.onSiteDisplay,
        codes: codeNumberIds.length
          ? {
              create: codeNumberIds.map((codeNumberId) => ({ codeNumberId })),
            }
          : undefined,
      },
      include: {
        itemType: true,
        codes: { include: { codeNumber: true } },
      },
    });
    const { logActivity } = await import("@/lib/activity-log");
    const { describeCourseItem } = await import("@/lib/item-labels");
    const desc = await describeCourseItem(item.id);
    if (desc) {
      await logActivity(
        s.user,
        `${s.user.name || s.user.email} duplicated ${desc.itemLabel} in ${desc.path}`,
        `${s.user.name || s.user.email} 님이 ${desc.path}의 ${desc.itemLabel}을(를) 복사했습니다`
      );
    }
    return NextResponse.json(item);
  } catch (e) {
    return NextResponse.json(
      { error: "copy failed", detail: String(e) },
      { status: 400 }
    );
  }
}
