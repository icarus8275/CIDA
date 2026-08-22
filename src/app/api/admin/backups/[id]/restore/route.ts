import { auth } from "@/auth";
import { logActivity } from "@/lib/activity-log";
import { restoreBackup } from "@/lib/backup";
import { NextResponse } from "next/server";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const s = await auth();
  if (!s?.user || s.user.role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  try {
    await restoreBackup(id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : "restore_failed";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
  await logActivity(
    s.user,
    `${s.user.name || s.user.email} restored academic data from a backup`,
    `${s.user.name || s.user.email} 님이 백업에서 학사 데이터를 복원했습니다`
  );
  return NextResponse.json({ ok: true });
}
