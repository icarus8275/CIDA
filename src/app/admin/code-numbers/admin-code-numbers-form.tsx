"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

type Row = {
  id: string;
  value: string;
  label: string | null;
  isActive: boolean;
  sortOrder: number;
};

export function AdminCodeNumbersForm() {
  const { t } = useI18n();
  const [list, setList] = useState<Row[]>([]);
  const [value, setValue] = useState("");
  const [label, setLabel] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/code-numbers", { cache: "no-store" });
    if (r.ok) setList(await r.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {err && <p className="text-sm text-red-300">{err}</p>}
      {info && <p className="text-sm text-amber-200/90">{info}</p>}
      <form
        className="glass space-y-2 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setInfo(null);
          const r = await fetch("/api/admin/code-numbers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              value: value.trim(),
              label: label.trim() || null,
            }),
          });
          if (!r.ok) {
            const j = (await r.json().catch(() => ({}))) as { message?: string };
            setErr(j.message || t("admin.cnCreateFail"));
            return;
          }
          setValue("");
          setLabel("");
          await load();
        }}
      >
        <h2 className="text-sm font-medium text-slate-200">
          {t("admin.cnAdd")}
        </h2>
        <p className="text-xs text-slate-500">{t("admin.cnAddHint")}</p>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder={t("admin.cnValuePh")}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="input-glass w-32 px-2 py-1.5"
            required
          />
          <input
            placeholder={t("admin.cnLabelPh")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input-glass max-w-sm flex-1 px-2 py-1.5"
          />
          <button
            type="submit"
            className="btn-glass-primary px-3 py-1.5 text-sm"
          >
            {t("admin.cnAddButton")}
          </button>
        </div>
      </form>

      <ul className="space-y-2">
        {list.map((row) => (
          <li
            key={row.id}
            className="glass flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
          >
            {editing?.id === row.id ? (
              <form
                className="flex flex-1 flex-wrap items-end gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await fetch("/api/admin/code-numbers", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: row.id,
                      value: editing.value,
                      label: editing.label,
                      isActive: editing.isActive,
                      sortOrder: editing.sortOrder,
                    }),
                  });
                  if (r.ok) {
                    setEditing(null);
                    await load();
                  } else {
                    setErr(t("admin.cnUpdateFail"));
                  }
                }}
              >
                <input
                  value={editing.value}
                  onChange={(e) =>
                    setEditing({ ...editing, value: e.target.value })
                  }
                  className="input-glass w-28 px-2 py-1"
                  required
                />
                <input
                  value={editing.label ?? ""}
                  onChange={(e) =>
                    setEditing({ ...editing, label: e.target.value || null })
                  }
                  className="input-glass min-w-0 flex-1 px-2 py-1"
                />
                <label className="flex items-center gap-1 text-sm text-slate-300">
                  <input
                    type="checkbox"
                    checked={editing.isActive}
                    onChange={(e) =>
                      setEditing({ ...editing, isActive: e.target.checked })
                    }
                  />
                  {t("admin.itActive")}
                </label>
                <input
                  type="number"
                  className="input-glass w-20 px-2 py-1"
                  value={editing.sortOrder}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      sortOrder: +e.target.value || 0,
                    })
                  }
                />
                <button
                  type="submit"
                  className="btn-glass-primary px-2 py-1 text-sm"
                >
                  {t("admin.coursesSave")}
                </button>
                <button
                  type="button"
                  className="btn-glass px-2 py-1 text-sm"
                  onClick={() => setEditing(null)}
                >
                  {t("admin.coursesCancel")}
                </button>
              </form>
            ) : (
              <>
                <span className="font-mono text-cyan-100/90">{row.value}</span>
                {row.label && (
                  <span className="text-sm text-slate-400">— {row.label}</span>
                )}
                <span className="text-xs text-slate-500">#{row.sortOrder}</span>
                {!row.isActive && (
                  <span className="text-xs text-amber-300">
                    {t("admin.itInactive")}
                  </span>
                )}
                <div className="ml-auto flex flex-wrap gap-1">
                  <button
                    type="button"
                    className="btn-glass px-2 py-1 text-sm"
                    onClick={() => setEditing({ ...row })}
                  >
                    {t("admin.itEdit")}
                  </button>
                  <button
                    type="button"
                    className="btn-glass px-2 py-1 text-sm text-amber-200"
                    onClick={async () => {
                      if (!confirm(t("admin.cnDeleteConfirm"))) return;
                      setInfo(null);
                      const r = await fetch(
                        `/api/admin/code-numbers?id=${encodeURIComponent(row.id)}`,
                        { method: "DELETE" }
                      );
                      if (r.ok) {
                        setErr(null);
                        await load();
                        const j = (await r.json().catch(() => ({}))) as {
                          soft?: boolean;
                        };
                        if (j.soft) {
                          setInfo(t("admin.cnSoftDeleteNote"));
                        }
                      }
                    }}
                  >
                    {t("admin.itDelete")}
                  </button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
