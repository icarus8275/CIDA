import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (s.user.role === "ADMIN") {
    const all = await prisma.course.findMany({
      orderBy: { sortOrder: "asc" },
    });
    return NextResponse.json(all);
  }
  const rows = await prisma.courseProfessor.findMany({
    where: { userId: s.user.id },
    include: { course: true },
  });
  return NextResponse.json(rows.map((r) => r.course));
}
