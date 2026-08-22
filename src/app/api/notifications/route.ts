import { auth } from "@/auth";
import { serializeNotification } from "@/lib/notifications";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const list = await prisma.notification.findMany({
    where: { userId: s.user.id },
    orderBy: { createdAt: "desc" },
    take: 80,
  });
  const unread = list.filter((n) => !n.readAt).length;
  return NextResponse.json({
    unread,
    items: list.map(serializeNotification),
  });
}

export async function PATCH() {
  const s = await auth();
  if (!s?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  await prisma.notification.updateMany({
    where: { userId: s.user.id, readAt: null },
    data: { readAt: new Date() },
  });
  return NextResponse.json({ ok: true });
}
