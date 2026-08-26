"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarRange,
  ChevronRight,
  Copy,
} from "lucide-react";
import { useI18n } from "@/components/locale/locale-provider";
import { CopyToModal } from "./copy-to-modal";

export type MyCourseCard = {
  id: string;
  courseName: string;
  sectionLabel: string;
  termId: string;
  termLabel: string;
  termRank: number;
  writeSectionId: string;
  hasContent: boolean;
};

function cardLabel(c: MyCourseCard, sectionBadge: string) {
  return `${c.termLabel} · ${c.courseName} · ${sectionBadge} ${c.sectionLabel}`;
}

function copyTargets(source: MyCourseCard, all: MyCourseCard[]) {
  return all.filter(
    (s) => s.id !== source.id && s.writeSectionId !== source.writeSectionId
  );
}

export function MyCoursesList({ courses }: { courses: MyCourseCard[] }) {
  const { t } = useI18n();
  const [copySource, setCopySource] = useState<MyCourseCard | null>(null);
  const [savedMsg, setSavedMsg] = useState(false);

  const groups = useMemo(() => {
    const byTerm = new Map<
      string,
      { termId: string; termLabel: string; termRank: number; courses: MyCourseCard[] }
    >();
    for (const c of courses) {
      const g = byTerm.get(c.termId);
      if (g) {
        g.courses.push(c);
      } else {
        byTerm.set(c.termId, {
          termId: c.termId,
          termLabel: c.termLabel,
          termRank: c.termRank,
          courses: [c],
        });
      }
    }
    return [...byTerm.values()].sort((a, b) => b.termRank - a.termRank);
  }, [courses]);

  const targets = copySource ? copyTargets(copySource, courses) : [];

  return (
    <>
      {savedMsg && (
        <div
          role="status"
          className="rounded-lg border border-emerald-300/80 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
        >
          {t("teach.copyToDone")}
        </div>
      )}
      {groups.map((group) => (
        <section key={group.termId} className="space-y-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wide text-app-muted/90">
            <CalendarRange className="h-4 w-4" />
            {group.termLabel}
          </h2>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {group.courses.map((sec) => {
              const dest = copyTargets(sec, courses);
              return (
                <li key={sec.id}>
                  <div className="flex h-full flex-col rounded-xl border border-app-border/80 bg-app-card/80 shadow-sm transition hover:border-app-primary/30 hover:shadow-md">
                    <Link
                      href={`/teach/section/${sec.id}`}
                      className="group flex flex-1 items-stretch gap-3 p-4"
                    >
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-app-primary/10 text-app-primary">
                        <BookOpen className="h-5 w-5" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-semibold text-app-fg group-hover:text-app-link">
                          {sec.courseName}
                        </span>
                        <span className="mt-1 text-sm text-app-muted/90">
                          {t("teach.sectionBadge")} {sec.sectionLabel}
                        </span>
                        <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-app-link">
                          {t("teach.editCourse")}
                          <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                        </span>
                      </span>
                    </Link>
                    {dest.length > 0 && (
                      <div className="border-t border-app-border/60 px-4 py-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-sm text-app-muted/90 hover:text-app-link disabled:opacity-50"
                          disabled={!sec.hasContent}
                          onClick={() => setCopySource(sec)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {t("teach.copyTo")}
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
      {copySource && targets.length > 0 && (
        <CopyToModal
          sourceId={copySource.id}
          sourceLabel={cardLabel(copySource, t("teach.sectionBadge"))}
          targets={targets.map((s) => ({
            id: s.id,
            label: cardLabel(s, t("teach.sectionBadge")),
          }))}
          onClose={() => setCopySource(null)}
          onDone={() => {
            setSavedMsg(true);
            window.setTimeout(() => setSavedMsg(false), 2500);
          }}
        />
      )}
    </>
  );
}
