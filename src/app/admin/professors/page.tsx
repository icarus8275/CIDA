import Link from "next/link";

export default function ProfessorsPage() {
  return (
    <div className="glass space-y-3 p-4 text-sm text-slate-300">
      <p>
        Faculty-to-section assignment has moved to the Schedule page (drag courses
        by term, add sections, assign instructors).
      </p>
      <Link href="/admin/schedule" className="font-medium text-cyan-200 hover:underline">
        Open Schedule
      </Link>
    </div>
  );
}
