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

  return (
    <div className="mb-6 flex flex-wrap gap-4 rounded border border-slate-200 bg-white p-3 text-sm">
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
          <div className="text-xs text-slate-500">Academic year label</div>
          <input
            className="rounded border border-slate-200 px-2 py-1"
            value={yLabel}
            onChange={(e) => setYLabel(e.target.value)}
            placeholder="2025–2026"
          />
        </div>
        <div>
          <div className="text-xs text-slate-500">Start year</div>
          <input
            type="number"
            className="w-24 rounded border border-slate-200 px-2 py-1"
            value={yStart}
            onChange={(e) => setYStart(+e.target.value || 0)}
          />
        </div>
        <button type="submit" className="rounded bg-slate-200 px-2 py-1">
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
          <div className="text-xs text-slate-500">Season key (slug)</div>
          <input
            className="w-32 rounded border border-slate-200 px-2 py-1"
            value={sKey}
            onChange={(e) => setSKey(e.target.value)}
            placeholder="winter"
          />
        </div>
        <div>
          <div className="text-xs text-slate-500">Label</div>
          <input
            className="rounded border border-slate-200 px-2 py-1"
            value={sLabel}
            onChange={(e) => setSLabel(e.target.value)}
            placeholder="Winter"
          />
        </div>
        <button type="submit" className="rounded bg-slate-200 px-2 py-1">
          Add season
        </button>
      </form>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!termY || !termS) return;
          await fetch("/api/admin/terms", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ academicYearId: termY, termSeasonId: termS }),
          });
          await load();
        }}
      >
        <select
          className="rounded border border-slate-200 px-2 py-1"
          value={termY}
          onChange={(e) => setTermY(e.target.value)}
        >
          {years.map((y) => (
            <option key={y.id} value={y.id}>
              {y.label}
            </option>
          ))}
        </select>
        <select
          className="rounded border border-slate-200 px-2 py-1"
          value={termS}
          onChange={(e) => setTermS(e.target.value)}
        >
          {seasons.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <button type="submit" className="rounded bg-slate-200 px-2 py-1">
          Add term
        </button>
      </form>
    </div>
  );
}
