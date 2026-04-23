"use client";

import { useCallback, useEffect, useState } from "react";
import { formatTermForDisplay } from "@/lib/term-display";
import { useI18n } from "@/components/locale/locale-provider";

export function AddOfferingForm() {
  const { t } = useI18n();
  const [courses, setCourses] = useState<{ id: string; name: string }[]>([]);
  const [terms, setTerms] = useState<{ id: string; label: string }[]>([]);
  const [courseId, setCourseId] = useState("");
  const [termId, setTermId] = useState("");
  const [formErr, setFormErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [c, tList] = await Promise.all([
      fetch("/api/admin/courses", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/terms", { cache: "no-store" }).then((r) => r.json()),
    ]);
    setCourses(c);
    const termsFlat = (tList as {
      id: string;
      academicYear: { label: string; startYear: number };
      termSeason: { key: string; label: string };
    }[]).map((t) => ({
      id: t.id,
      label: formatTermForDisplay(t),
    }));
    setTerms(termsFlat);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const fn = () => {
      void load();
    };
    window.addEventListener("schedule-refresh", fn);
    return () => window.removeEventListener("schedule-refresh", fn);
  }, [load]);

  return (
    <form
      className="glass glass-dashed mb-4 flex flex-col gap-1 p-3 text-sm text-app-fg/92"
      onSubmit={async (e) => {
        e.preventDefault();
        setFormErr(null);
        if (!courseId || !termId) return;
        const r = await fetch("/api/admin/course-offerings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ courseId, termId }),
        });
        if (r.status === 409) {
          const j = (await r.json().catch(() => ({}))) as { message?: string };
          setFormErr(j.message || t("admin.schedErrCourseInTerm"));
          return;
        }
        if (r.ok) {
          setCourseId("");
          window.dispatchEvent(new Event("schedule-refresh"));
        } else {
          setFormErr(t("admin.schedErrAddFail"));
        }
      }}
    >
      <div className="flex flex-wrap items-end gap-2">
      <span className="font-medium text-app-fg/92">
        {t("admin.schedAddCourseRow")}
      </span>
      <select
        className="input-glass px-2 py-1.5"
        value={courseId}
        onChange={(e) => setCourseId(e.target.value)}
        required
      >
        <option value="">{t("admin.schedCourse")}</option>
        {courses.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <select
        className="input-glass px-2 py-1.5"
        value={termId}
        onChange={(e) => setTermId(e.target.value)}
        required
      >
        <option value="">{t("admin.schedTerm")}</option>
        {terms.map((t) => (
          <option key={t.id} value={t.id}>
            {t.label}
          </option>
        ))}
      </select>
      <button type="submit" className="btn-glass-primary px-3 py-1.5 text-sm">
        {t("admin.schedAdd")}
      </button>
      </div>
      {formErr && <p className="text-xs text-app-danger">{formErr}</p>}
    </form>
  );
}
