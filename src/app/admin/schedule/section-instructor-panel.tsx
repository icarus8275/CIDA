"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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

/** Fall → Spring → Summer within the same academic year, then by season key. */
function seasonOrder(key: string): number {
  const k = key.toLowerCase();
  if (k.includes("fall")) return 0;
  if (k.includes("spring")) return 1;
  if (k.includes("summer")) return 2;
  return 3;
}

function compareByTermCourseSectionUser(a: SiRow, b: SiRow): number {
  const A = a.section.courseOffering;
  const B = b.section.courseOffering;
  const ta = A.term;
  const tb = B.term;
  const yA = ta.academicYear.startYear;
  const yB = tb.academicYear.startYear;
  if (yA != null && yB != null && yA !== yB) {
    return yA - yB;
  }
  if (yA == null && yB != null) {
    return 1;
  }
  if (yA != null && yB == null) {
    return -1;
  }
  if (yA == null && yB == null) {
    const l = ta.academicYear.label.localeCompare(tb.academicYear.label, undefined, {
      sensitivity: "base",
    });
    if (l !== 0) {
      return l;
    }
  }
  const sA = seasonOrder(ta.termSeason.key);
  const sB = seasonOrder(tb.termSeason.key);
  if (sA !== sB) {
    return sA - sB;
  }
  const tsk = ta.termSeason.key.localeCompare(tb.termSeason.key, undefined, {
    sensitivity: "base",
  });
  if (tsk !== 0) {
    return tsk;
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
      <p className="text-sm text-slate-400">{t("admin.schedPanelHint")}</p>

      <ul className="space-y-1 text-sm">
        {siRows.length === 0 && (
          <li className="text-sm text-slate-500">
            {t("admin.schedPanelEmpty")}
          </li>
        )}
        {sortedRows.map((r) => (
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
