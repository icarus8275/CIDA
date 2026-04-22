import { auth } from "@/auth";
import { isReadOnlyRole } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

/** Active code catalog for faculty (assignment to items). */
export async function GET() {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (isReadOnlyRole(s.user.role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const list = await prisma.codeNumber.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { value: "asc" }],
    select: { id: true, value: true, label: true, sortOrder: true },
  });
  return NextResponse.json(list);
}
