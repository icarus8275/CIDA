import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canEditCourse } from "@/lib/guards";
import { TeachCourseEditor } from "./teach-course-editor";

export default async function TeachCoursePage({
  params,
}: {
  params: Promise<{ courseId: string }>;
}) {
  const { courseId } = await params;
  const s = await auth();
  if (!s?.user) {
    redirect("/auth/signin");
  }
  const ok = await canEditCourse(s.user.id, s.user.role, courseId);
  if (!ok) {
    redirect("/teach?error=course");
  }
  return <TeachCourseEditor courseId={courseId} />;
}
