"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";
import { formatTermForDisplay } from "@/lib/term-display";
import { listUserLabel } from "@/lib/user-display";

type TermRef = {
  academicYear: { label: string; startYear?: number | null };
  termSeason: { key: string; label: string };
};

type SiRow = {
  userId: string;
  sectionId: string;
  user: { email: string | null; name: string | null };
  section: {
    id: string;
    label: string;
    courseOffering: {
      course: { name: string };
      term: TermRef;
    };
  };
};

export function SectionInstructorPanel() {
  const { t } = useI18n();
  const [siRows, setSiRows] = useState<SiRow[]>([]);

  const load = useCallback(async () => {
    const raw = await fetch("/api/admin/section-instructors", {
      cache: "no-store",
    }).then((r) => r.json());
    setSiRows(raw);
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
    <div className="space-y-6">
      <p className="text-sm text-slate-400">{t("admin.schedPanelHint")}</p>

      <ul className="space-y-1 text-sm">
        {siRows.length === 0 && (
          <li className="text-sm text-slate-500">
            {t("admin.schedPanelEmpty")}
          </li>
        )}
        {siRows.map((r) => (
          <li
            key={`${r.userId}-${r.sectionId}`}
            className="glass flex items-center justify-between gap-2 px-2 py-1.5"
          >
            <span className="text-slate-200">
              {listUserLabel(r.user.name, r.user.email)} —{" "}
              {r.section.courseOffering.course.name} ·{r.section.label} (
              {formatTermForDisplay(r.section.courseOffering.term)})
            </span>
            <button
              type="button"
              className="text-sm text-red-300 hover:underline"
              onClick={async () => {
                await fetch("/api/admin/section-instructors", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: r.userId,
                    sectionId: r.sectionId,
                  }),
                });
                await load();
              }}
            >
              {t("admin.schedRemove")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
