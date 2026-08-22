import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { createBackup, ensureScheduledBackup } from "@/lib/backup";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await ensureScheduledBackup();
  const list = await prisma.dataBackup.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      trigger: true,
      itemCount: true,
    },
  });
  return NextResponse.json(list);
}

export async function POST() {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const row = await createBackup("MANUAL");
  await logActivity(
    s.user,
    `${s.user.name || s.user.email} created a manual backup`,
    `${s.user.name || s.user.email} 님이 수동 백업을 만들었습니다`
  );
  return NextResponse.json(row);
}
