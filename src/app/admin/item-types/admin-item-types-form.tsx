"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

type Row = {
  id: string;
  key: string;
  label: string;
  isActive: boolean;
  sortOrder: number;
};

export function AdminItemTypesForm() {
  const { t } = useI18n();
  const [list, setList] = useState<Row[]>([]);
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [editing, setEditing] = useState<Row | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/item-types", { cache: "no-store" });
    if (r.ok) setList(await r.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {err && <p className="text-sm text-red-300">{err}</p>}
      <form
        className="glass space-y-2 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          const r = await fetch("/api/admin/item-types", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              key: key.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-"),
              label: label.trim(),
            }),
          });
          if (!r.ok) {
            setErr(t("admin.itCreateFail"));
            return;
          }
          setKey("");
          setLabel("");
          await load();
        }}
      >
        <h2 className="text-sm font-medium text-slate-200">
          {t("admin.itAddType")}
        </h2>
        <div className="flex flex-wrap gap-2">
          <input
            placeholder={t("admin.itKeyPh")}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            className="input-glass w-40 px-2 py-1.5"
            required
          />
          <input
            placeholder={t("admin.itLabelPh")}
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="input-glass w-48 px-2 py-1.5"
            required
          />
          <button
            type="submit"
            className="btn-glass-primary px-3 py-1.5 text-sm"
          >
            {t("admin.itAdd")}
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
                  const r = await fetch("/api/admin/item-types", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: row.id,
                      label: editing.label,
                      isActive: editing.isActive,
                      sortOrder: editing.sortOrder,
                    }),
                  });
                  if (r.ok) {
                    setEditing(null);
                    await load();
                  }
                }}
              >
                <span className="text-slate-400">{row.key}</span>
                <input
                  value={editing.label}
                  onChange={(e) =>
                    setEditing({ ...editing, label: e.target.value })
                  }
                  className="input-glass flex-1 px-2 py-1"
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
                  className="input-glass w-20 px-1 py-1"
                  value={editing.sortOrder}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      sortOrder: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
                <button type="submit" className="text-sm text-cyan-200 hover:underline">
                  {t("admin.coursesSave")}
                </button>
                <button type="button" className="text-slate-400 hover:text-slate-200" onClick={() => setEditing(null)}>
                  {t("admin.coursesCancel")}
                </button>
              </form>
            ) : (
              <>
                <div className="flex-1">
                  <code className="text-xs text-slate-500">{row.key}</code>{" "}
                  <span className="font-medium text-slate-100">{row.label}</span>
                  {!row.isActive && (
                    <span className="ml-2 text-xs text-amber-300/90">
                      {t("admin.itInactive")}
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(row)}
                    className="text-sm text-cyan-200 hover:underline"
                  >
                    {t("admin.itEdit")}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(t("admin.itDeleteConfirm")))
                        return;
                      await fetch(
                        `/api/admin/item-types?id=${encodeURIComponent(row.id)}`,
                        { method: "DELETE" }
                      );
                      await load();
                    }}
                    className="text-sm text-red-300 hover:underline"
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
