"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

export function TermSetupForm() {
  const { t } = useI18n();
  const [years, setYears] = useState<{ id: string; label: string }[]>([]);
  const [seasons, setSeasons] = useState<{ id: string; label: string }[]>([]);
  const [yLabel, setYLabel] = useState("");
  const [yStart, setYStart] = useState(new Date().getFullYear());
  const [sKey, setSKey] = useState("");
  const [sLabel, setSLabel] = useState("");
  const [termY, setTermY] = useState("");
  const [termS, setTermS] = useState("");
  const [addTermError, setAddTermError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const [y, se] = await Promise.all([
      fetch("/api/admin/academic-years", { cache: "no-store" }).then((r) =>
        r.json()
      ),
      fetch("/api/admin/term-seasons", { cache: "no-store" }).then((r) =>
        r.json()
      ),
    ]);
    setYears(y);
    setSeasons(se);
    setTermY((prev) => prev || (y[0]?.id ?? ""));
    setTermS((prev) => prev || (se[0]?.id ?? ""));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => {
      void load();
    };
    window.addEventListener("schedule-refresh", onRefresh);
    return () => window.removeEventListener("schedule-refresh", onRefresh);
  }, [load]);

  return (
    <div className="glass glass-dashed mb-6 p-4 text-sm text-slate-200">
      <p className="mb-4 text-xs text-slate-400">{t("admin.schedYearBlurb")}</p>

      <div className="space-y-4">
        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("admin.sched1Title")}
          </h3>
          <form
            className="flex flex-wrap items-end gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!yLabel.trim()) return;
              await fetch("/api/admin/academic-years", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ label: yLabel.trim(), startYear: yStart }),
              });
              setYLabel("");
              await load();
            }}
          >
            <label className="flex min-w-[10rem] flex-col gap-1">
              <span className="text-xs text-slate-400">
                {t("admin.schedLabelDisplay")}
              </span>
              <input
                className="input-glass px-2 py-1.5"
                value={yLabel}
                onChange={(e) => setYLabel(e.target.value)}
                placeholder="2025–2026"
              />
            </label>
            <label className="flex w-28 flex-col gap-1">
              <span className="text-xs text-slate-400">
                {t("admin.schedStartYear")}
              </span>
              <input
                type="number"
                className="input-glass px-2 py-1.5"
                value={yStart}
                onChange={(e) => setYStart(+e.target.value || 0)}
              />
            </label>
            <button type="submit" className="btn-glass px-4 py-2 text-sm">
              {t("admin.schedAddYear")}
            </button>
          </form>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("admin.sched2Title")}
          </h3>
          <form
            className="flex flex-wrap items-end gap-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!sKey.trim() || !sLabel.trim()) return;
              await fetch("/api/admin/term-seasons", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  key: sKey.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
                  label: sLabel.trim(),
                }),
              });
              setSKey("");
              setSLabel("");
              await load();
            }}
          >
            <label className="flex w-32 flex-col gap-1">
              <span className="text-xs text-slate-400">{t("admin.schedKey")}</span>
              <input
                className="input-glass px-2 py-1.5"
                value={sKey}
                onChange={(e) => setSKey(e.target.value)}
                placeholder="fall"
              />
            </label>
            <label className="flex min-w-[8rem] flex-col gap-1">
              <span className="text-xs text-slate-400">{t("admin.schedLabel")}</span>
              <input
                className="input-glass px-2 py-1.5"
                value={sLabel}
                onChange={(e) => setSLabel(e.target.value)}
                placeholder="Fall Semester"
              />
            </label>
            <button type="submit" className="btn-glass px-4 py-2 text-sm">
              {t("admin.schedAddSeason")}
            </button>
          </form>
          <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
            {t("admin.schedSeasonHelp")}
          </p>
        </section>

        <section className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
            {t("admin.sched3Title")}
          </h3>
          <form
            className="flex flex-col gap-2"
            onSubmit={async (e) => {
              e.preventDefault();
              setAddTermError(null);
              if (!termY || !termS) return;
              const r = await fetch("/api/admin/terms", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  academicYearId: termY,
                  termSeasonId: termS,
                }),
              });
              if (!r.ok) {
                const j = (await r.json().catch(() => ({}))) as {
                  message?: string;
                };
                if (r.status === 409) {
                  setAddTermError(
                    j.message || t("admin.schedErrTermDup")
                  );
                } else {
                  setAddTermError(j.message || t("admin.schedErrTerm"));
                }
                return;
              }
              window.dispatchEvent(new Event("schedule-refresh"));
            }}
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex min-w-[11rem] flex-col gap-1">
                <span className="text-xs text-slate-400">
                  {t("admin.schedAcademicYear")}
                </span>
                <select
                  className="input-glass px-2 py-1.5"
                  value={termY}
                  onChange={(e) => setTermY(e.target.value)}
                >
                  {years.length === 0 && (
                    <option value="">{t("admin.schedPickYear")}</option>
                  )}
                  {years.map((y) => (
                    <option key={y.id} value={y.id}>
                      {y.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex min-w-[11rem] flex-col gap-1">
                <span className="text-xs text-slate-400">
                  {t("admin.schedSeason")}
                </span>
                <select
                  className="input-glass px-2 py-1.5"
                  value={termS}
                  onChange={(e) => setTermS(e.target.value)}
                >
                  {seasons.length === 0 && (
                    <option value="">{t("admin.schedPickSeason")}</option>
                  )}
                  {seasons.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <button type="submit" className="btn-glass px-4 py-2 text-sm">
                {t("admin.schedAddTerm")}
              </button>
            </div>
            {addTermError && (
              <p className="text-xs text-rose-200">{addTermError}</p>
            )}
          </form>
        </section>
      </div>
    </div>
  );
}
