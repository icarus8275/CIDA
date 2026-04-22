"use client";

import { useCallback, useEffect, useState } from "react";

export function AddOfferingForm() {
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [terms, setTerms] = useState<{ id: string; label: string }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [termId, setTermId] = useState("");

  const load = useCallback(async () => {
    const [c, tList] = await Promise.all([
      fetch("/api/admin/courses", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/terms", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setCourses(c);
    const termsFlat = (tList as {
      id: string;
      academicYear: { label: string };
      termSeason: { label: string };
    }[]).map((t) => ({
      id: t.id,
      label: `${t.academicYear.label} · ${t.termSeason.label}`,
    }));
    setTerms(termsFlat);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <form
      className="mb-4 flex flex-wrap items-end gap-2 rounded border border-dashed border-slate-300 bg-white p-3 text-sm"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!courseId || !termId) return;
        const r = await fetch("/api/admin/course-offerings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, termId }),
        });
        if (r.ok) {
          setCourseId("");
          window.location.reload();
        }
      }}
    >
      <span className="font-medium text-slate-700">Schedule a course in a term:</span>
      <select
        className="rounded border border-slate-200 px-2 py-1"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        required
      >
        <option value="">Course</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className="rounded border border-slate-200 px-2 py-1"
        value={termId}
        onChange={(e) => setTermId(e.target.value)}
        required
      >
        <option value="">Term</option>
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <button type="submit" className="rounded bg-indigo-600 px-2 py-1 text-white">
        Add
      </button>
    </form>
  );
}
