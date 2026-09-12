"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";
import { compareTerms, formatTermForDisplay } from "@/lib/term-display";
import { listUserLabel } from "@/lib/user-display";

type TermRef = {
  kind?: "ACADEMIC" | "GROUP";
  groupLabel?: string | null;
  academicYear: { label: string; startYear?: number | null } | null;
  termSeason: { key: string; label: string } | null;
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

function compareByTermCourseSectionUser(a: SiRow, b: SiRow): number {
  const A = a.section.courseOffering;
  const B = b.section.courseOffering;
  const termCmp = compareTerms(A.term, B.term);
  if (termCmp !== 0) {
    return termCmp;
  }
  const c = A.course.name.localeCompare(B.course.name, undefined, { sensitivity: "base" });
  if (c !== 0) {
    return c;
  }
  const sl = a.section.label.localeCompare(b.section.label, undefined, { numeric: true });
  if (sl !== 0) {
    return sl;
  }
  return listUserLabel(a.user.name, a.user.email).localeCompare(
    listUserLabel(b.user.name, b.user.email),
    undefined,
    { sensitivity: "base" }
  );
}

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

  const sortedRows = useMemo(
    () => [...siRows].sort(compareByTermCourseSectionUser),
    [siRows]
  );

  return (
    <div className="space-y-6">
      <p className="text-sm text-app-muted/90">{t("admin.schedPanelHint")}</p>

      <ul className="space-y-1 text-sm">
        {siRows.length === 0 && (
          <li className="text-sm text-app-muted/85">
            {t("admin.schedPanelEmpty")}
          </li>
        )}
        {sortedRows.map((r) => (
          <li
            key={`${r.userId}-${r.sectionId}`}
            className="glass flex items-center justify-between gap-2 px-2 py-1.5"
          >
            <span className="text-app-fg/92">
              {listUserLabel(r.user.name, r.user.email)} ·{" "}
              {r.section.courseOffering.course.name} · {r.section.label} (
              {formatTermForDisplay(r.section.courseOffering.term)})
            </span>
            <button
              type="button"
              className="text-sm text-app-danger hover:underline"
              onClick={async () => {
                const res = await fetch("/api/admin/section-instructors", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: r.userId,
                    sectionId: r.sectionId,
                  }),
                });
                if (res.ok) {
                  await load();
                  window.dispatchEvent(new Event("schedule-refresh"));
                }
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
