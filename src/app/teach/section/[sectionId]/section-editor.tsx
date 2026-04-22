"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/locale/locale-provider";

type Code = { id: string; code: string };
type Item = {
  id: string;
  number: number;
  sortOrder: number;
  title: string | null;
  oneDriveUrl: string | null;
  linkTitle: string | null;
  itemType: { id: string; key: string; label: string };
  codes: Code[];
};
type ItemType = { id: string; key: string; label: string };
type SectionPayload = {
  id: string;
  label: string;
  courseOffering: {
    course: { id: string; name: string };
    term: {
      academicYear: { label: string };
      termSeason: { label: string };
    };
  };
  courseItems: Item[];
};

export function SectionEditor({ sectionId }: { sectionId: string }) {
  const { t } = useI18n();
  const [section, setSection] = useState<SectionPayload | null>(null);
  const [types, setTypes] = useState<ItemType[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ typeId: "", number: 1, codes: "" });
  const [codeEdit, setCodeEdit] = useState<Record<string, string>>({});
  const [linkEdit, setLinkEdit] = useState<Record<string, { url: string; title: string }>>({});
  const [titleEdit, setTitleEdit] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch(`/api/teach/section/${sectionId}`, { cache: "no-store" });
    if (r.status === 403) {
      setErr(t("teach.errForbidden"));
      return;
    }
    if (!r.ok) {
      setErr(t("teach.errLoad"));
      return;
    }
    setSection(await r.json());
  }, [sectionId, t]);

  const loadTypes = useCallback(async () => {
    const r = await fetch("/api/teach/item-types", { cache: "no-store" });
    if (r.ok) setTypes(await r.json());
  }, []);

  useEffect(() => {
    void load();
    void loadTypes();
  }, [load, loadTypes]);

  if (err) {
    return <p className="text-sm text-red-300">{err}</p>;
  }
  if (!section) {
    return <p className="text-slate-400">{t("teach.loading")}</p>;
  }

  const path = `${section.courseOffering.term.academicYear.label} · ${section.courseOffering.term.termSeason.label} · ${section.courseOffering.course.name} · ${section.label}`;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-bold text-white">{path}</h1>
        <Link
          href="/teach"
          className="text-sm text-slate-400 hover:text-cyan-200 hover:underline"
        >
          {t("teach.backList")}
        </Link>
      </div>

      <section className="glass p-4">
        <h2 className="mb-2 font-medium text-slate-200">
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
                sectionId,
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
            className="input-glass px-2 py-1.5"
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
            className="input-glass w-20 px-2 py-1.5"
            value={newItem.number}
            onChange={(e) =>
              setNewItem((x) => ({ ...x, number: +e.target.value || 0 }))
            }
            min={0}
          />
          <input
            placeholder={t("teach.codesPlaceholder")}
            className="input-glass w-40 px-2 py-1.5"
            value={newItem.codes}
            onChange={(e) =>
              setNewItem((x) => ({ ...x, codes: e.target.value }))
            }
          />
          <button
            type="submit"
            className="btn-glass-primary px-3 py-1.5 text-sm"
          >
            {t("teach.add")}
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-slate-200">
          {t("teach.itemsCodes")}
        </h2>
        <ul className="space-y-3">
          {section.courseItems.map((it) => {
            const ce = codeEdit[it.id] ?? it.codes.map((c) => c.code).join(", ");
            const le = linkEdit[it.id] ?? {
              url: it.oneDriveUrl ?? "",
              title: it.linkTitle ?? "",
            };
            const title =
              titleEdit[it.id] ?? it.title ?? "";
            return (
              <li
                key={it.id}
                className="glass p-3"
              >
                <div className="mb-2">
                  <span className="font-medium text-slate-100">
                    {it.itemType.label} {it.number}
                  </span>
                </div>
                <div className="mb-2 space-y-1">
                  <label className="text-xs text-slate-400">Title (optional)</label>
                  <input
                    className="input-glass w-full px-2 py-1 text-sm"
                    value={title}
                    onChange={(e) =>
                      setTitleEdit((m) => ({ ...m, [it.id]: e.target.value }))
                    }
                    onBlur={async () => {
                      const v = titleEdit[it.id] ?? it.title ?? "";
                      if (v === (it.title ?? "")) return;
                      await fetch(`/api/teach/course-items/${it.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ title: v || null }),
                      });
                      await load();
                    }}
                    placeholder="Custom title"
                  />
                </div>
                <div className="mb-2 space-y-1">
                  <label className="text-xs text-slate-400">OneDrive share link</label>
                  <div className="flex flex-wrap gap-2">
                    <input
                      className="input-glass min-w-0 flex-1 px-2 py-1 text-sm"
                      value={le.url}
                      onChange={(e) =>
                        setLinkEdit((m) => ({
                          ...m,
                          [it.id]: { ...le, url: e.target.value },
                        }))
                      }
                      placeholder="https://..."
                    />
                    <input
                      className="input-glass w-40 px-2 py-1 text-sm"
                      value={le.title}
                      onChange={(e) =>
                        setLinkEdit((m) => ({
                          ...m,
                          [it.id]: { ...le, title: e.target.value },
                        }))
                      }
                      placeholder="Link label (optional)"
                    />
                    <button
                      type="button"
                      className="btn-glass px-2 py-1 text-sm"
                      onClick={async () => {
                        const cur = linkEdit[it.id] ?? {
                          url: it.oneDriveUrl ?? "",
                          title: it.linkTitle ?? "",
                        };
                        await fetch(`/api/teach/course-items/${it.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            oneDriveUrl: cur.url || null,
                            linkTitle: cur.title || null,
                          }),
                        });
                        await load();
                      }}
                    >
                      {t("teach.saveCodes")}
                    </button>
                  </div>
                  {it.oneDriveUrl && (
                    <a
                      href={it.oneDriveUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-cyan-200 hover:underline"
                    >
                      {it.linkTitle || "Open file"}
                    </a>
                  )}
                </div>
                <div className="mb-1 flex flex-wrap gap-1">
                  <input
                    className="input-glass min-w-0 flex-1 px-2 py-1 text-sm"
                    value={ce}
                    onChange={(e) =>
                      setCodeEdit((m) => ({ ...m, [it.id]: e.target.value }))
                    }
                    placeholder={t("teach.codesPlaceholder")}
                  />
                  <button
                    type="button"
                    className="btn-glass px-2 py-1 text-sm"
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
                <div className="mt-1">
                  <button
                    type="button"
                    className="text-xs text-red-300"
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
