import { redirect } from "next/navigation";

/** 북마크용: 교수·섹션 배정은 Schedule에서만 합니다. */
export default function ProfessorsPage() {
  redirect("/admin/schedule");
}
