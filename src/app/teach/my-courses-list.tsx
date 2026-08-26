"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BookOpen,
  CalendarRange,
  ChevronRight,
  Copy,
  X,
} from "lucide-react";
import { useI18n } from "@/components/locale/locale-provider";

export type MyCourseCard = {
  id: string;
  courseId: string;
  courseName: string;
  sectionLabel: string;
  termId: string;
  termLabel: string;
  termRank: number;
  fingerprint: string;
  writeSectionId: string;
};

function cardLabel(c: MyCourseCard, sectionBadge: string) {
  return `${c.termLabel} · ${c.courseName} · ${sectionBadge} ${c.sectionLabel}`;
}

function compatibleSources(target: MyCourseCard, all: MyCourseCard[]) {
  if (!target.fingerprint) return [];
  return all.filter(
    (s) =>
      s.id !== target.id &&
      s.courseId === target.courseId &&
      s.fingerprint === target.fingerprint &&
      s.writeSectionId !== target.writeSectionId
  );
}

function CopyFromModal({
  target,
  sources,
  onClose,
  onDone,
}: {
  target: MyCourseCard;
  sources: MyCourseCard[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [sourceId, setSourceId] = useState(sources[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setSourceId(sources[0]?.id ?? "");
    setErr(null);
  }, [target.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async () => {
    if (!sourceId) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/teach/section/${target.id}/copy-from`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sourceSectionId: sourceId }),
      });
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) {
        setErr(
          j.error === "mismatch" || j.error === "empty"
            ? t("teach.copyFromMismatch")
            : t("teach.copyFromFail")
        );
        return;
      }
      onDone();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="copy-from-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-app-fg/45 backdrop-blur-sm"
        aria-label={t("teach.copyFromClose")}
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-y-auto glass p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2
            id="copy-from-title"
            className="pr-2 text-base font-semibold text-app-fg"
          >
            {t("teach.copyFromTitle")}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-app-muted/90 hover:bg-app-card/75 hover:text-app-fg"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 text-xs text-app-muted/90">{t("teach.copyFromLead")}</p>
        <p className="mb-3 text-sm text-app-fg/92">
          <span className="text-app-muted/90">{t("teach.copyFromTarget")}</span>{" "}
          <span className="font-medium">
            {cardLabel(target, t("teach.sectionBadge"))}
          </span>
        </p>
        {err && <p className="mb-3 text-sm text-app-danger">{err}</p>}
        <label className="mb-1 block text-[11px] text-app-muted/85">
          {t("teach.copyFromSource")}
        </label>
        <select
          className="input-glass mb-4 w-full px-2 py-2 text-sm"
          value={sourceId}
          onChange={(e) => setSourceId(e.target.value)}
          disabled={busy}
        >
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {cardLabel(s, t("teach.sectionBadge"))}
            </option>
          ))}
        </select>
        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-glass px-4 py-2 text-sm"
            onClick={onClose}
            disabled={busy}
          >
            {t("teach.copyFromCancel")}
          </button>
          <button
            type="button"
            className="btn-glass-primary px-4 py-2 text-sm disabled:opacity-50"
            onClick={() => void run()}
            disabled={busy || !sourceId}
          >
            {busy ? t("teach.loading") : t("teach.copyFromRun")}
          </button>
        </div>
      </div>
    </div>
  );
}

export function MyCoursesList({ courses }: { courses: MyCourseCard[] }) {
  const { t } = useI18n();
  const [copyTarget, setCopyTarget] = useState<MyCourseCard | null>(null);
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

  const copySources = copyTarget
    ? compatibleSources(copyTarget, courses)
    : [];

  return (
    <>
      {savedMsg && (
        <div
          role="status"
          className="rounded-lg border border-emerald-300/80 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
        >
          {t("teach.copyFromDone")}
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
              const sources = compatibleSources(sec, courses);
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
                    {sources.length > 0 && (
                      <div className="border-t border-app-border/60 px-4 py-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1.5 text-sm text-app-muted/90 hover:text-app-link"
                          onClick={() => setCopyTarget(sec)}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {t("teach.copyFrom")}
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
      {copyTarget && copySources.length > 0 && (
        <CopyFromModal
          target={copyTarget}
          sources={copySources}
          onClose={() => setCopyTarget(null)}
          onDone={() => {
            setSavedMsg(true);
            window.setTimeout(() => setSavedMsg(false), 2500);
          }}
        />
      )}
    </>
  );
}
