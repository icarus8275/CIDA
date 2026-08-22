import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { searchParams } = new URL(req.url);
  const take = Math.min(200, Math.max(1, Number(searchParams.get("take")) || 80));
  const list = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take,
    select: {
      id: true,
      actorName: true,
      actorEmail: true,
      summaryEn: true,
      summaryKo: true,
      createdAt: true,
    },
  });
  return NextResponse.json(list);
}
