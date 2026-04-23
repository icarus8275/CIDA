import { redirect } from "next/navigation";

// Bookmark route: /admin/schedule is the source of truth for faculty and sections.
export default function ProfessorsPage() {
  redirect("/admin/schedule");
}
