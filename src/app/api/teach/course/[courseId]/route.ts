import { auth } from "@/auth";
import { canEditCourse } from "@/lib/guards";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const s = await auth();
  if (!s?.user) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { courseId } = await params;
  const allow = await canEditCourse(s.user.id, s.user.role, courseId);
  if (!allow) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      items: {
        orderBy: [{ sortOrder: "asc" }, { number: "asc" }],
        include: { itemType: true, codes: true, driveLinks: true },
      },
    },
  });
  if (!course) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  return NextResponse.json(course);
}
