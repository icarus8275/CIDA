import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { canEditSection } from "@/lib/guards";
import { SectionEditor } from "./section-editor";

export default async function TeachSectionPage({
  params,
}: {
  params: Promise<{ sectionId: string }>;
}) {
  const { sectionId } = await params;
  const s = await auth();
  if (!s?.user) {
    redirect("/auth/signin");
  }
  if (s.user.role === "CIDA") {
    redirect("/explore");
  }
  const ok = await canEditSection(s.user.id, s.user.role, sectionId);
  if (!ok) {
    redirect("/teach?error=course");
  }
  return <SectionEditor sectionId={sectionId} />;
}
