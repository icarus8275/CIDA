"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/components/locale/locale-provider";
import { formatTermForDisplay } from "@/lib/term-display";
import { listUserLabel } from "@/lib/user-display";
import { hasFacultyAccess } from "@/lib/role-utils";

type TermRow = {
  id: string;
  sortOrder: number;
  academicYear: { label: string; startYear: number };
  termSeason: { key: string; label: string };
};

type OffRow = {
  id: string;
  sortOrder: number;
  courseId: string;
  course: { name: string };
  termId: string;
};

export type ConfigOffering = OffRow & { term: TermRow };

type UserOpt = { id: string; email: string | null; name: string | null; role: string };

type SectionApi = {
  id: string;
  label: string;
  sortOrder: number;
  instructors: { user: UserOpt }[];
};

type Props = {
  offering: ConfigOffering | null;
  onClose: () => void;
};

function nextDefaultLabel(sections: { label: string }[]): string {
  return String(sections.length + 1).padStart(3, "0");
}

export function OfferingSectionsModal({ offering, onClose }: Props) {
  const { t } = useI18n();
  const [sections, setSections] = useState<SectionApi[]>([]);
  const [users, setUsers] = useState<UserOpt[]>([]);
  const [countInput, setCountInput] = useState(1);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!offering) {
      return;
    }
    setErr(null);
    setLoading(true);
    const [sRes, uRes] = await Promise.all([
      fetch(
        `/api/admin/sections?courseOfferingId=${encodeURIComponent(offering.id)}`,
        { cache: "no-store" }
      ),
      fetch("/api/admin/users", { cache: "no-store" }),
    ]);
    if (sRes.ok) {
      const list = (await sRes.json()) as SectionApi[];
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      setSections(list);
      setCountInput(Math.max(1, list.length));
    }
    if (uRes.ok) {
      const u = (await uRes.json()) as UserOpt[];
      setUsers(u.filter((x) => hasFacultyAccess(x.role)));
    }
    setLoading(false);
  }, [offering]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!offering) {
      return;
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [offering, onClose]);

  const applySectionCount = async () => {
    if (!offering) return;
    setErr(null);
    const target = Math.max(1, Math.min(200, countInput));
    const sorted = [...sections].sort((a, b) => a.sortOrder - b.sortOrder);
    if (target === sorted.length) return;

    if (target > sorted.length) {
      let remaining = target - sorted.length;
      while (remaining > 0) {
        const cur = await fetch(
          `/api/admin/sections?courseOfferingId=${encodeURIComponent(offering.id)}`,
          { cache: "no-store" }
        );
        if (!cur.ok) break;
        const list = ((await cur.json()) as SectionApi[]).sort(
          (a, b) => a.sortOrder - b.sortOrder
        );
        const label = nextDefaultLabel(list);
        const r = await fetch("/api/admin/sections", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            courseOfferingId: offering.id,
            label,
          }),
        });
        if (!r.ok) {
          setErr(t("admin.osmErrCreate"));
          return;
        }
        remaining -= 1;
        await load();
      }
      window.dispatchEvent(new Event("schedule-refresh"));
      return;
    }

    const toRemove = sorted.length - target;
    if (toRemove <= 0) return;
    if (!confirm(t("admin.osmConfirmTrim").replace("{n}", String(toRemove)))) {
      return;
    }
    const drop = sorted.slice(-toRemove);
    for (const s of drop) {
      const r = await fetch(
        `/api/admin/sections?id=${encodeURIComponent(s.id)}`,
        { method: "DELETE" }
      );
      if (!r.ok) {
        setErr(t("admin.osmErrDelete"));
        return;
      }
    }
    await load();
    setCountInput(target);
    window.dispatchEvent(new Event("schedule-refresh"));
  };

  const addOneSection = async () => {
    if (!offering) return;
    setErr(null);
    const label = nextDefaultLabel(sections);
    const r = await fetch("/api/admin/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseOfferingId: offering.id,
        label,
      }),
    });
    if (!r.ok) {
      setErr(t("admin.osmErrCreate"));
      return;
    }
    await load();
    window.dispatchEvent(new Event("schedule-refresh"));
  };

  const saveLabel = async (id: string, label: string) => {
    const tLabel = label.trim();
    if (!tLabel) return;
    const r = await fetch("/api/admin/sections", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, label: tLabel }),
    });
    if (r.ok) {
      await load();
      window.dispatchEvent(new Event("schedule-refresh"));
    }
  };

  const assign = async (sectionId: string, userId: string) => {
    if (!userId) return;
    setErr(null);
    const r = await fetch("/api/admin/section-instructors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, userId }),
    });
    if (r.ok) {
      await load();
      window.dispatchEvent(new Event("schedule-refresh"));
    } else if (r.status === 409) {
      setErr(t("admin.osmErrExists"));
    }
  };

  const unassign = async (sectionId: string, userId: string) => {
    const r = await fetch("/api/admin/section-instructors", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sectionId, userId }),
    });
    if (r.ok) {
      await load();
      window.dispatchEvent(new Event("schedule-refresh"));
    }
  };

  if (!offering) {
    return null;
  }

  const head = `${formatTermForDisplay(offering.term)} · ${offering.course.name}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="osm-title"
    >
      <button
        type="button"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        aria-label={t("admin.osmClose")}
        onClick={onClose}
      />
      <div className="relative max-h-[min(90vh,42rem)] w-full max-w-lg overflow-y-auto glass p-4 shadow-xl">
        <div className="mb-3 flex items-start justify-between gap-2">
          <h2
            id="osm-title"
            className="pr-2 text-base font-semibold leading-snug text-white"
          >
            {head}
          </h2>
          <button
            type="button"
            className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white"
            onClick={onClose}
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-3 text-xs text-slate-400">{t("admin.osmSub")}</p>

        {err && <p className="mb-2 text-sm text-rose-300">{err}</p>}

        <div className="mb-4 flex flex-wrap items-end gap-2 border-b border-white/10 pb-3">
          <div>
            <label className="text-[11px] text-slate-500">
              {t("admin.osmSectionCount")}
            </label>
            <div className="mt-0.5 flex items-center gap-2">
              <input
                type="number"
                className="input-glass w-20 px-2 py-1.5"
                min={1}
                max={200}
                value={countInput}
                onChange={(e) => setCountInput(+e.target.value || 1)}
              />
              <button
                type="button"
                className="btn-glass-primary px-3 py-1.5 text-sm"
                onClick={() => void applySectionCount()}
              >
                {t("admin.osmApply")}
              </button>
            </div>
          </div>
          <button
            type="button"
            className="btn-glass mb-0.5 px-3 py-1.5 text-sm"
            onClick={() => void addOneSection()}
          >
            {t("admin.osmAddOne")}
          </button>
        </div>

        {loading ? (
          <p className="text-sm text-slate-400">{t("teach.loading")}</p>
        ) : sections.length === 0 ? (
          <p className="text-sm text-slate-500">{t("admin.osmNone")}</p>
        ) : (
          <ul className="space-y-3">
            {sections
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((sec) => {
                const assigned = new Set(
                  sec.instructors.map((i) => i.user.id)
                );
                const canAdd = users.filter((u) => !assigned.has(u.id));
                return (
                  <li
                    key={sec.id}
                    className="rounded-lg border border-white/10 bg-white/[0.04] p-3"
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-[11px] uppercase text-slate-500">
                        {t("admin.osmLabel")}
                      </span>
                      <input
                        key={`${sec.id}-${sec.label}`}
                        className="input-glass w-28 px-2 py-1 text-sm"
                        defaultValue={sec.label}
                        onBlur={(e) => {
                          const v = e.target.value;
                          if (v.trim() && v !== sec.label) {
                            void saveLabel(sec.id, v);
                          }
                        }}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {sec.instructors.map((ins) => (
                        <span
                          key={ins.user.id}
                          className="inline-flex items-center gap-1 rounded-md bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-100"
                        >
                          {listUserLabel(ins.user.name, ins.user.email)}
                          <button
                            type="button"
                            className="text-rose-300/90 hover:underline"
                            onClick={() => void unassign(sec.id, ins.user.id)}
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                    <div className="mt-2">
                      <label className="text-[11px] text-slate-500">
                        {t("admin.osmPickFaculty")}
                      </label>
                      <select
                        className="input-glass mt-0.5 w-full max-w-sm px-2 py-1.5 text-sm"
                        defaultValue=""
                        onChange={(e) => {
                          const v = e.target.value;
                          e.currentTarget.value = "";
                          if (v) void assign(sec.id, v);
                        }}
                      >
                        <option value="">{t("admin.schedSelect")}</option>
                        {canAdd.map((u) => (
                          <option key={u.id} value={u.id}>
                            {listUserLabel(u.name, u.email)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
}
