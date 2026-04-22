import Link from "next/link";

export default function ProfessorsPage() {
  return (
    <div className="space-y-3 text-sm text-slate-700">
      <p>
        Faculty-to-section assignment has moved to the Schedule page (drag courses
        by term, add sections, assign instructors).
      </p>
      <Link href="/admin/schedule" className="font-medium text-indigo-600 hover:underline">
        Open Schedule
      </Link>
    </div>
  );
}
