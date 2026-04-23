import { Suspense } from "react";
import { AdminFacultyClient } from "./admin-faculty-client";

function FacultyFallback() {
  return <p className="text-app-muted/90">Loading…</p>;
}

export const dynamic = "force-dynamic";

export default function AdminFacultyPage() {
  return (
    <Suspense fallback={<FacultyFallback />}>
      <AdminFacultyClient />
    </Suspense>
  );
}
