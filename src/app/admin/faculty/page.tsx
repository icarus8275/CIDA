import { Suspense } from "react";
import { AdminFacultyClient } from "./admin-faculty-client";

function FacultyFallback() {
  return <p className="text-slate-400">…</p>;
}

export const dynamic = "force-dynamic";

export default function AdminFacultyPage() {
  return (
    <Suspense fallback={<FacultyFallback />}>
      <AdminFacultyClient />
    </Suspense>
  );
}
