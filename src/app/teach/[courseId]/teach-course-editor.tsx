"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/locale/locale-provider";

type Code = { id: string; code: string };
type DriveL = {
  id: string;
  name: string;
  webUrl: string;
  driveId: string;
  driveItemId: string;
};

type Item = {
  id: string;
  number: number;
  sortOrder: number;
  itemType: { id: string; key: string; label: string };
  codes: Code[];
  driveLinks: DriveL[];
};

type ItemType = { id: string; key: string; label: string };

type Course = {
  id: string;
  name: string;
  items: Item[];
};

type GraphDriveItem = {
  id: string;
  name: string;
  webUrl: string;
  folder?: { childCount: number };
  file?: object;
  parentReference?: { driveId: string; id: string; path: string };
};

type GraphList = { value?: GraphDriveItem[] };

export function TeachCourseEditor({ courseId }: { courseId: string }) {
  const { t } = useI18n();
  const [course, setCourse] = useState<Course | null>(null);
  const [types, setTypes] = useState<ItemType[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [odErr, setOdErr] = useState<string | null>(null);
  const [odStack, setOdStack] = useState<{ id: string | null; name: string }[]>(
    () => [{ id: null, name: t("teach.odRoot") }]
  );
  const [odList, setOdList] = useState<GraphDriveItem[] | null>(null);
  const [newItem, setNewItem] = useState({ typeId: "", number: 1, codes: "" });
  const [codeEdit, setCodeEdit] = useState<Record<string, string>>({});
  const [linkTarget, setLinkTarget] = useState<string | null>(null);

  const currentFolderId = odStack[odStack.length - 1]?.id ?? null;

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch(`/api/teach/course/${courseId}`, { cache: "no-store" });
    if (r.status === 403) {
      setErr(t("teach.errForbidden"));
      return;
    }
    if (!r.ok) {
      setErr(t("teach.errLoad"));
      return;
    }
    setCourse(await r.json());
  }, [courseId, t]);

  const loadTypes = useCallback(async () => {
    const r = await fetch("/api/teach/item-types", { cache: "no-store" });
    if (r.ok) setTypes(await r.json());
  }, []);

  const loadOd = useCallback(async () => {
    setOdErr(null);
    const q = currentFolderId
      ? `?itemId=${encodeURIComponent(currentFolderId)}`
      : "";
    const r = await fetch(`/api/onedrive/children${q}`);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setOdList([]);
      setOdErr(
        (j as { message?: string }).message || t("teach.odApiFail")
      );
      return;
    }
    const j = (await r.json()) as GraphList;
    setOdList(j.value ?? []);
  }, [currentFolderId, t]);

  useEffect(() => {
    setOdStack((s) => {
      if (s.length && s[0].id === null) {
        const next = [...s];
        next[0] = { id: null, name: t("teach.odRoot") };
        return next;
      }
      return s;
    });
  }, [t]);

  useEffect(() => {
    void load();
    void loadTypes();
  }, [load, loadTypes]);

  useEffect(() => {
    void loadOd();
  }, [loadOd, currentFolderId]);

  if (err) {
    return <p className="text-sm text-red-600">{err}</p>;
  }
  if (!course) {
    return <p className="text-slate-500">{t("teach.loading")}</p>;
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-slate-900">{course.name}</h1>
        <Link
          href="/teach"
          className="text-sm text-slate-600 hover:underline"
        >
          {t("teach.backList")}
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h2 className="mb-2 font-medium text-slate-800">
          {t("teach.addItem")}
        </h2>
        <form
          className="flex flex-wrap items-end gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newItem.typeId) return;
            const codes = newItem.codes
              .split(/[,\s]+/)
              .map((s) => s.trim().toUpperCase())
              .filter(Boolean);
            const r = await fetch("/api/teach/course-items", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                courseId,
                itemTypeId: newItem.typeId,
                number: newItem.number,
                codes: codes.length ? codes : undefined,
              }),
            });
            if (r.ok) {
              setNewItem({ typeId: newItem.typeId, number: newItem.number + 1, codes: "" });
              await load();
            }
          }}
        >
          <select
            className="rounded border border-slate-200 px-2 py-1.5"
            value={newItem.typeId}
            onChange={(e) =>
              setNewItem((x) => ({ ...x, typeId: e.target.value }))
            }
            required
          >
            <option value="">{t("teach.type")}</option>
            {types.map((ty) => (
              <option key={ty.id} value={ty.id}>
                {ty.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            className="w-20 rounded border border-slate-200 px-2 py-1.5"
            value={newItem.number}
            onChange={(e) =>
              setNewItem((x) => ({ ...x, number: +e.target.value || 0 }))
            }
            min={0}
          />
          <input
            placeholder={t("teach.codesPlaceholder")}
            className="w-40 rounded border border-slate-200 px-2 py-1.5"
            value={newItem.codes}
            onChange={(e) =>
              setNewItem((x) => ({ ...x, codes: e.target.value }))
            }
          />
          <button
            type="submit"
            className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
          >
            {t("teach.add")}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-slate-800">
          {t("teach.itemsCodes")}
        </h2>
        <ul className="space-y-3">
          {course.items.map((it) => {
            const ce = codeEdit[it.id] ?? it.codes.map((c) => c.code).join(", ");
            return (
              <li
                key={it.id}
                className="rounded-lg border border-slate-200 bg-white p-3"
              >
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-slate-900">
                    {it.itemType.label} {it.number}
                  </span>
                  <button
                    type="button"
                    className="text-xs text-amber-800"
                    onClick={() => setLinkTarget((x) => (x === it.id ? null : it.id))}
                  >
                    {linkTarget === it.id
                      ? t("teach.closeLink")
                      : t("teach.openLink")}
                  </button>
                </div>
                <div className="mb-1 flex flex-wrap gap-1">
                  <input
                    className="min-w-0 flex-1 rounded border border-slate-200 px-2 py-1 text-sm"
                    value={ce}
                    onChange={(e) =>
                      setCodeEdit((m) => ({ ...m, [it.id]: e.target.value }))
                    }
                    placeholder={t("teach.codesPlaceholder")}
                  />
                  <button
                    type="button"
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm"
                    onClick={async () => {
                      const raw = (codeEdit[it.id] ?? ce)
                        .split(/[,\s]+/)
                        .map((s) => s.trim().toUpperCase())
                        .filter(Boolean);
                      await fetch(`/api/teach/course-items/${it.id}/codes`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ codes: raw }),
                      });
                      setCodeEdit((m) => {
                        const c = { ...m };
                        delete c[it.id];
                        return c;
                      });
                      await load();
                    }}
                  >
                    {t("teach.saveCodes")}
                  </button>
                </div>
                {it.driveLinks.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm">
                    {it.driveLinks.map((d) => (
                      <li key={d.id} className="flex items-center justify-between">
                        <a
                          className="text-indigo-600 hover:underline"
                          href={d.webUrl}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {d.name}
                        </a>
                        <button
                          type="button"
                          className="text-red-600"
                          onClick={async () => {
                            await fetch(
                              `/api/teach/course-items/${it.id}/links?linkId=${encodeURIComponent(d.id)}`,
                              { method: "DELETE" }
                            );
                            await load();
                          }}
                        >
                          {t("teach.unlink")}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                {linkTarget === it.id && (
                  <div className="mt-3 border-t border-slate-100 pt-3 text-sm">
                    {odErr && <p className="mb-2 text-amber-800">{odErr}</p>}
                    <div className="mb-1 flex flex-wrap gap-1 text-xs text-slate-500">
                      {odStack.map((s, i) => (
                        <span key={s.name + i}>
                          {i > 0 && " / "}
                          {i < odStack.length - 1 ? (
                            <button
                              type="button"
                              className="text-indigo-600"
                              onClick={() => {
                                setOdStack(odStack.slice(0, i + 1));
                              }}
                            >
                              {s.name}
                            </button>
                          ) : (
                            s.name
                          )}
                        </span>
                      ))}
                    </div>
                    <form
                      className="mb-2 flex flex-wrap gap-1"
                      onSubmit={async (e) => {
                        e.preventDefault();
                        const fd = new FormData(e.currentTarget);
                        const n = String(fd.get("fn") || "").trim();
                        if (!n) return;
                        await fetch("/api/onedrive/mkdir", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            name: n,
                            parentItemId: currentFolderId,
                          }),
                        });
                        (e.currentTarget as HTMLFormElement).reset();
                        await loadOd();
                      }}
                    >
                      <input
                        name="fn"
                        placeholder={t("teach.newFolderName")}
                        className="rounded border border-slate-200 px-2 py-1"
                      />
                      <button type="submit" className="rounded bg-slate-100 px-2 py-1">
                        {t("teach.createFolder")}
                      </button>
                    </form>
                    <ul className="max-h-48 space-y-0.5 overflow-y-auto">
                      {(odList ?? []).map((f) => (
                        <li key={f.id} className="flex items-center justify-between gap-1">
                          {f.folder ? (
                            <button
                              type="button"
                              className="text-left text-indigo-700 hover:underline"
                              onClick={() =>
                                setOdStack((st) => [
                                  ...st,
                                  { id: f.id, name: f.name },
                                ])
                              }
                            >
                              {f.name}/
                            </button>
                          ) : (
                            <span>{f.name}</span>
                          )}
                          <button
                            type="button"
                            className="shrink-0 text-xs text-slate-600"
                            onClick={async () => {
                              const driveId =
                                f.parentReference?.driveId || "";
                              if (!driveId) return;
                              await fetch(`/api/teach/course-items/${it.id}/links`, {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                  driveId,
                                  driveItemId: f.id,
                                  webUrl: f.webUrl,
                                  name: f.name,
                                }),
                              });
                              await load();
                            }}
                          >
                            {t("teach.linkToItem")}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-1">
                  <button
                    type="button"
                    className="text-xs text-red-600"
                    onClick={async () => {
                      if (!confirm(t("teach.deleteConfirm"))) return;
                      await fetch(`/api/teach/course-items/${it.id}`, {
                        method: "DELETE",
                      });
                      await load();
                    }}
                  >
                    {t("teach.deleteItem")}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
