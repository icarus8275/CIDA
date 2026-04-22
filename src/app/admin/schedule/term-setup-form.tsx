"use client";

import { useCallback, useEffect, useState } from "react";

export function TermSetupForm() {
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
      fetch("/api/admin/academic-years", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/term-seasons", { cache: "no-store" }).then((r) => r.json()),
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
    <div className="glass glass-dashed mb-6 flex flex-wrap gap-4 p-3 text-sm text-slate-200">
      <form
        className="flex flex-wrap items-end gap-2"
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
        <div>
          <div className="text-xs text-slate-400">Academic year label</div>
          <input
            className="input-glass px-2 py-1"
            value={yLabel}
            onChange={(e) => setYLabel(e.target.value)}
            placeholder="2025–2026"
          />
        </div>
        <div>
          <div className="text-xs text-slate-400">Start year</div>
          <input
            type="number"
            className="input-glass w-24 px-2 py-1"
            value={yStart}
            onChange={(e) => setYStart(+e.target.value || 0)}
          />
        </div>
        <button type="submit" className="btn-glass px-2 py-1 text-sm">
          Add year
        </button>
      </form>

      <form
        className="flex flex-wrap items-end gap-2"
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
        <div>
          <div className="text-xs text-slate-400">Season key (slug)</div>
          <input
            className="input-glass w-32 px-2 py-1"
            value={sKey}
            onChange={(e) => setSKey(e.target.value)}
            placeholder="winter"
          />
          <p className="mt-1 max-w-xs text-[11px] text-slate-500">
            Short id for a season <span className="italic">type</span> (e.g. fall, spring), not a full
            term. You pair it with a year below using &quot;Add term&quot;.
          </p>
        </div>
        <div>
          <div className="text-xs text-slate-400">Label</div>
          <input
            className="input-glass px-2 py-1"
            value={sLabel}
            onChange={(e) => setSLabel(e.target.value)}
            placeholder="Winter"
          />
        </div>
        <button type="submit" className="btn-glass px-2 py-1 text-sm">
          Add season
        </button>
      </form>

      <form
        className="flex flex-col gap-1"
        onSubmit={async (e) => {
          e.preventDefault();
          setAddTermError(null);
          if (!termY || !termS) return;
          const r = await fetch("/api/admin/terms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ academicYearId: termY, termSeasonId: termS }),
          });
          if (!r.ok) {
            const j = (await r.json().catch(() => ({}))) as { message?: string };
            if (r.status === 409) {
              setAddTermError(
                j.message ||
                  "This year + season is already a term. Duplicates are not allowed."
              );
            } else {
              setAddTermError(j.message || "Could not add term.");
            }
            return;
          }
          window.dispatchEvent(new Event("schedule-refresh"));
        }}
      >
        <div className="flex flex-wrap items-end gap-2">
        <select
          className="input-glass px-2 py-1"
          value={termY}
          onChange={(e) => setTermY(e.target.value)}
        >
          {years.length === 0 && (
            <option value="">Add a year first</option>
          )}
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
        <select
          className="input-glass px-2 py-1"
          value={termS}
          onChange={(e) => setTermS(e.target.value)}
        >
          {seasons.length === 0 && (
            <option value="">Add a season first</option>
          )}
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="btn-glass px-2 py-1 text-sm">
          Add term
        </button>
        </div>
        {addTermError && (
          <p className="text-xs text-rose-200">{addTermError}</p>
        )}
      </form>
    </div>
  );
}
