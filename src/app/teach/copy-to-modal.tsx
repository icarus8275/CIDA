"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/components/locale/locale-provider";

export type CopyCourseOption = {
  id: string;
  label: string;
};

export function CopyToModal({
  sourceId,
  sourceLabel,
  targets,
  onClose,
  onDone,
}: {
  sourceId: string;
  sourceLabel: string;
  targets: CopyCourseOption[];
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const [targetId, setTargetId] = useState(targets[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setTargetId(targets[0]?.id ?? "");
    setErr(null);
  }, [sourceId]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const run = async () => {
    if (!targetId) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/teach/section/${sourceId}/copy-to`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetSectionId: targetId }),
      });
      if (!r.ok) {
        setErr(t("teach.copyToFail"));
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
      aria-labelledby="copy-to-title"
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
            id="copy-to-title"
            className="pr-2 text-base font-semibold text-app-fg"
          >
            {t("teach.copyToTitle")}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-app-muted/90 hover:bg-app-card/75 hover:text-app-fg"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 text-xs text-app-muted/90">{t("teach.copyToLead")}</p>
        <p className="mb-3 text-sm text-app-fg/92">
          <span className="text-app-muted/90">{t("teach.copyToSource")}</span>{" "}
          <span className="font-medium">{sourceLabel}</span>
        </p>
        {err && <p className="mb-3 text-sm text-app-danger">{err}</p>}
        <label className="mb-1 block text-[11px] text-app-muted/85">
          {t("teach.copyToTarget")}
        </label>
        {targets.length === 0 ? (
          <p className="mb-4 text-sm text-app-muted/90">{t("teach.copyToNoTarget")}</p>
        ) : (
          <select
            className="input-glass mb-4 w-full px-2 py-2 text-sm"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            disabled={busy}
          >
            {targets.map((s) => (
              <option key={s.id} value={s.id}>
                {s.label}
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
            {t("teach.copyFromCancel")}
          </button>
          <button
            type="button"
            className="btn-glass-primary px-4 py-2 text-sm disabled:opacity-50"
            onClick={() => void run()}
            disabled={busy || !targetId}
          >
            {busy ? t("teach.loading") : t("teach.copyToRun")}
          </button>
        </div>
      </div>
    </div>
  );
}
