"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/components/locale/locale-provider";
import { formatTermForDisplay } from "@/lib/term-display";

export type TermRow = {
  id: string;
  sortOrder: number;
  academicYear: { label: string; startYear: number };
  termSeason: { key: string; label: string };
};

type Props = {
  source: TermRow | null;
  allTerms: TermRow[];
  onClose: () => void;
};

export function TermCopyModal({ source, allTerms, onClose }: Props) {
  const { t } = useI18n();
  const [targetId, setTargetId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const candidates = useMemo(
    () => (source ? allTerms.filter((x) => x.id !== source.id) : []),
    [allTerms, source]
  );

  useEffect(() => {
    if (!source) {
      return;
    }
    setTargetId((prev) => {
      if (candidates.some((c) => c.id === prev)) {
        return prev;
      }
      return candidates[0]?.id ?? "";
    });
    setErr(null);
  }, [source, candidates]);

  useEffect(() => {
    if (!source) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [source, onClose]);

  if (!source) {
    return null;
  }

  const sourceLabel = formatTermForDisplay(source);

  const run = async () => {
    if (!targetId) {
      setErr(t("admin.schedCopyPickTarget"));
      return;
    }
    setErr(null);
    setBusy(true);
    try {
      const r = await fetch("/api/admin/terms/copy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceTermId: source.id,
          targetTermId: targetId,
        }),
      });
      const j = (await r.json().catch(() => ({}))) as {
        ok?: boolean;
        message?: string;
        copiedOfferings?: number;
        skippedOfferings?: number;
        skippedCourses?: string[];
      };
      if (!r.ok) {
        setErr(j.message || t("admin.schedCopyErr"));
        setBusy(false);
        return;
      }
      const n = j.copiedOfferings ?? 0;
      const sk = j.skippedOfferings ?? 0;
      const list = j.skippedCourses?.length
        ? j.skippedCourses.join(", ")
        : "";
      if (sk > 0) {
        alert(
          t("admin.schedCopyDoneWithSkip")
            .replace("{n}", String(n))
            .replace("{k}", String(sk))
            .replace("{list}", list)
        );
      } else {
        alert(t("admin.schedCopyDone").replace("{n}", String(n)));
      }
      onClose();
      window.dispatchEvent(new Event("schedule-refresh"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="term-copy-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label={t("admin.osmClose")}
        onClick={onClose}
      />
      <div className="relative w-full max-w-md overflow-y-auto glass p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2
            id="term-copy-title"
            className="pr-2 text-base font-semibold text-white"
          >
            {t("admin.schedCopyTitle")}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-1 text-sm text-slate-200">
          <span className="text-slate-400">{t("admin.schedCopyFrom")}</span>{" "}
          <span className="font-medium text-cyan-100/90">{sourceLabel}</span>
        </p>
        <p className="mb-4 text-xs text-slate-400">{t("admin.schedCopyBlurb")}</p>

        {err && <p className="mb-3 text-sm text-rose-300">{err}</p>}

        <label className="mb-1 block text-[11px] text-slate-500">
          {t("admin.schedCopyTarget")}
        </label>
        {candidates.length === 0 ? (
          <p className="mb-4 text-sm text-amber-200/90">
            {t("admin.schedCopyNoTarget")}
          </p>
        ) : (
          <select
            className="input-glass mb-4 w-full px-2 py-2 text-sm"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            disabled={busy}
          >
            {candidates.map((term) => (
              <option key={term.id} value={term.id}>
                {formatTermForDisplay(term)}
              </option>
            ))}
          </select>
        )}

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn-glass px-4 py-2 text-sm"
            onClick={onClose}
            disabled={busy}
          >
            {t("admin.coursesCancel")}
          </button>
          <button
            type="button"
            className="btn-glass-primary px-4 py-2 text-sm disabled:opacity-50"
            onClick={() => void run()}
            disabled={busy || candidates.length === 0}
          >
            {busy ? t("teach.loading") : t("admin.schedCopyRun")}
          </button>
        </div>
      </div>
    </div>
  );
}
