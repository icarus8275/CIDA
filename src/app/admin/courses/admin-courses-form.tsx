"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

type Course = { id: string; name: string; sortOrder: number };

export function AdminCoursesForm() {
  const { t } = useI18n();
  const [list, setList] = useState<Course[]>([]);
  const [name, setName] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [editing, setEditing] = useState<Course | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch("/api/admin/courses", { cache: "no-store" });
    if (!r.ok) {
      setErr(t("admin.coursesLoadFail"));
      return;
    }
    setList(await r.json());
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      {err && <p className="text-sm text-red-600">{err}</p>}
      <form
        className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          const r = await fetch("/api/admin/courses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim() }),
          });
          if (!r.ok) {
            setErr(t("admin.coursesCreateFail"));
            return;
          }
          setName("");
          await load();
        }}
      >
        <div>
          <label className="text-xs text-slate-500">
            {t("admin.coursesNameLabel")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-0.5 block w-72 rounded border border-slate-200 px-2 py-1.5"
            required
          />
        </div>
        <button
          type="submit"
          className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm text-white"
        >
          {t("admin.coursesAdd")}
        </button>
      </form>

      <form
        className="space-y-2 rounded-lg border border-slate-200 bg-white p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          const names = bulkText
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (names.length === 0) return;
          const r = await fetch("/api/admin/courses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bulkNames: names }),
          });
          if (!r.ok) {
            setErr(t("admin.coursesCreateFail"));
            return;
          }
          setBulkText("");
          await load();
        }}
      >
        <label className="text-xs text-slate-500">Bulk add (one per line or comma)</label>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          className="mt-0.5 block w-full min-h-24 rounded border border-slate-200 p-2 text-sm"
          placeholder="CS 101&#10;CS 102"
        />
        <button
          type="submit"
          className="mt-2 rounded-lg bg-slate-700 px-3 py-1.5 text-sm text-white"
        >
          Add all
        </button>
      </form>

      <ul className="space-y-2">
        {list.map((c) => (
          <li
            key={c.id}
            className="flex flex-col gap-2 rounded-lg border border-slate-200 bg-white p-3 sm:flex-row sm:items-center"
          >
            {editing?.id === c.id ? (
              <form
                className="flex flex-1 flex-wrap items-end gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await fetch("/api/admin/courses", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: c.id,
                      name: editing.name,
                      sortOrder: editing.sortOrder,
                    }),
                  });
                  if (r.ok) {
                    setEditing(null);
                    await load();
                  }
                }}
              >
                <input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1"
                />
                <input
                  type="number"
                  value={editing.sortOrder}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      sortOrder: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="w-24 rounded border border-slate-200 px-2 py-1"
                />
                <button type="submit" className="text-sm text-indigo-600">
                  {t("admin.coursesSave")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-sm text-slate-500"
                >
                  {t("admin.coursesCancel")}
                </button>
              </form>
            ) : (
              <>
                <div className="flex-1">
                  <span className="font-medium text-slate-900">{c.name}</span>
                  <span className="ml-2 text-sm text-slate-500">
                    {t("admin.coursesOrder")} {c.sortOrder}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEditing(c)}
                    className="text-sm text-indigo-600"
                  >
                    {t("admin.coursesEdit")}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm(t("admin.coursesDeleteConfirm"))) return;
                      const r = await fetch(
                        `/api/admin/courses?id=${encodeURIComponent(c.id)}`,
                        { method: "DELETE" }
                      );
                      if (r.ok) await load();
                    }}
                    className="text-sm text-red-600"
                  >
                    {t("admin.coursesDelete")}
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
