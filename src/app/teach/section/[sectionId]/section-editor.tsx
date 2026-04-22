"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/locale/locale-provider";
import { formatTermForDisplay } from "@/lib/term-display";

type CodeLink = {
  id: string;
  codeNumberId: string;
  codeNumber: {
    id: string;
    value: string;
    label: string | null;
    isActive: boolean;
  };
};
type Item = {
  id: string;
  number: number;
  sortOrder: number;
  title: string | null;
  oneDriveUrl: string | null;
  linkTitle: string | null;
  itemType: { id: string; key: string; label: string };
  codes: CodeLink[];
};
type ItemType = { id: string; key: string; label: string };
type SectionPayload = {
  id: string;
  label: string;
  courseOffering: {
    course: { id: string; name: string };
    term: {
      academicYear: { label: string; startYear: number };
      termSeason: { key: string; label: string };
    };
  };
  courseItems: Item[];
};

type CatalogRow = { id: string; value: string; label: string | null; sortOrder: number };

type Opt = { id: string; value: string; label: string | null; isActive: boolean };

function buildOptions(
  catalog: CatalogRow[],
  itemCodes: CodeLink[] | undefined
): Opt[] {
  const m = new Map<string, Opt>();
  for (const c of catalog) {
    m.set(c.id, {
      id: c.id,
      value: c.value,
      label: c.label,
      isActive: true,
    });
  }
  for (const link of itemCodes ?? []) {
    const n = link.codeNumber;
    if (!m.has(n.id)) {
      m.set(n.id, {
        id: n.id,
        value: n.value,
        label: n.label,
        isActive: n.isActive,
      });
    }
  }
  return [...m.values()].sort((a, b) => a.value.localeCompare(b.value));
}

function CodePicker({
  t,
  options,
  valueIds,
  onChange,
  filter,
  onFilterChange,
  disabled,
}: {
  t: (k: string) => string;
  options: Opt[];
  valueIds: string[];
  onChange: (ids: string[]) => void;
  filter: string;
  onFilterChange: (v: string) => void;
  disabled?: boolean;
}) {
  const selected = new Set(valueIds);
  const q = filter.trim().toLowerCase();
  const shown = useMemo(
    () =>
      !q
        ? options
        : options.filter(
            (o) =>
              o.value.toLowerCase().includes(q) ||
              (o.label && o.label.toLowerCase().includes(q))
          ),
    [options, q]
  );

  return (
    <div className="space-y-2">
      <input
        type="search"
        className="input-glass w-full max-w-md px-2 py-1 text-sm"
        placeholder={t("teach.codeFilter")}
        value={filter}
        onChange={(e) => onFilterChange(e.target.value)}
        disabled={disabled}
      />
      <div className="max-h-40 overflow-y-auto rounded border border-white/10 p-2">
        {options.length === 0 ? (
          <p className="text-sm text-amber-200/90">{t("teach.noCodeCatalog")}</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {shown.map((o) => {
              const isOn = selected.has(o.id);
              const isDisabled = disabled || (!o.isActive && !isOn);
              return (
                <li key={o.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    id={`c-${o.id}`}
                    checked={isOn}
                    disabled={isDisabled}
                    onChange={(e) => {
                      const next = new Set(valueIds);
                      if (e.target.checked) next.add(o.id);
                      else next.delete(o.id);
                      onChange([...next]);
                    }}
                  />
                  <label
                    htmlFor={`c-${o.id}`}
                    className={
                      o.isActive || isOn
                        ? "cursor-pointer text-slate-200"
                        : "cursor-not-allowed text-slate-500"
                    }
                  >
                    <span className="font-mono text-cyan-100/90">{o.value}</span>
                    {o.label && (
                      <span className="ml-1 text-slate-500">({o.label})</span>
                    )}
                    {!o.isActive && isOn && (
                      <span className="ml-1 text-xs text-amber-300">
                        (inactive)
                      </span>
                    )}
                  </label>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

export function SectionEditor({ sectionId }: { sectionId: string }) {
  const { t } = useI18n();
  const [section, setSection] = useState<SectionPayload | null>(null);
  const [types, setTypes] = useState<ItemType[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ typeId: "", number: 1 });
  const [newItemCodes, setNewItemCodes] = useState<string[]>([]);
  const [newFilter, setNewFilter] = useState("");
  const [codeSel, setCodeSel] = useState<Record<string, string[] | undefined>>(
    {}
  );
  const [itemFilter, setItemFilter] = useState<Record<string, string>>({});
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

  const loadCatalog = useCallback(async () => {
    const r = await fetch("/api/teach/code-numbers", { cache: "no-store" });
    if (r.ok) setCatalog(await r.json());
  }, []);

  useEffect(() => {
    void load();
    void loadTypes();
    void loadCatalog();
  }, [load, loadTypes, loadCatalog]);

  if (err) {
    return <p className="text-sm text-red-300">{err}</p>;
  }
  if (!section) {
    return <p className="text-slate-400">{t("teach.loading")}</p>;
  }

  const path = `${formatTermForDisplay(section.courseOffering.term)} · ${section.courseOffering.course.name} · ${section.label}`;

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
        <p className="mb-2 text-xs text-slate-500">{t("teach.codeNumbersHint")}</p>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newItem.typeId) return;
            const r = await fetch("/api/teach/course-items", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                sectionId,
                itemTypeId: newItem.typeId,
                number: newItem.number,
                codeNumberIds: newItemCodes,
              }),
            });
            if (r.ok) {
              setNewItem({ typeId: newItem.typeId, number: newItem.number + 1 });
              setNewItemCodes([]);
              setNewFilter("");
              await load();
            }
          }}
        >
          <div className="flex flex-wrap items-end gap-2">
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
            <button
              type="submit"
              className="btn-glass-primary px-3 py-1.5 text-sm"
            >
              {t("teach.add")}
            </button>
          </div>
          <CodePicker
            t={t}
            options={buildOptions(catalog, undefined)}
            valueIds={newItemCodes}
            onChange={setNewItemCodes}
            filter={newFilter}
            onFilterChange={setNewFilter}
          />
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-slate-200">
          {t("teach.itemsCodes")}
        </h2>
        <ul className="space-y-3">
          {section.courseItems.map((it) => {
            const ce = codeSel[it.id] ?? it.codes.map((c) => c.codeNumberId);
            const le = linkEdit[it.id] ?? {
              url: it.oneDriveUrl ?? "",
              title: it.linkTitle ?? "",
            };
            const title = titleEdit[it.id] ?? it.title ?? "";
            const f = itemFilter[it.id] ?? "";
            return (
              <li key={it.id} className="glass p-3">
                <div className="mb-2">
                  <span className="font-medium text-slate-100">
                    {it.itemType.label} {it.number}
                  </span>
                </div>
                <div className="mb-2 space-y-1">
                  <label className="text-xs text-slate-400">
                    {t("teach.itemTitleOpt")}
                  </label>
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
                    placeholder={t("teach.customTitle")}
                  />
                </div>
                <div className="mb-2 space-y-1">
                  <label className="text-xs text-slate-400">
                    {t("teach.odShareLink")}
                  </label>
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
                      placeholder={t("teach.linkLabelOpt")}
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
                      {it.linkTitle || t("teach.openFile")}
                    </a>
                  )}
                </div>
                <div className="mb-2 space-y-1">
                  <label className="text-xs text-slate-400">
                    {t("teach.itemsCodes")} — {t("teach.codeNumbersHint")}
                  </label>
                  <CodePicker
                    t={t}
                    options={buildOptions(catalog, it.codes)}
                    valueIds={ce}
                    onChange={(ids) =>
                      setCodeSel((m) => ({ ...m, [it.id]: ids }))
                    }
                    filter={f}
                    onFilterChange={(v) =>
                      setItemFilter((m) => ({ ...m, [it.id]: v }))
                    }
                  />
                  <button
                    type="button"
                    className="btn-glass mt-1 px-2 py-1 text-sm"
                    onClick={async () => {
                      const ids = codeSel[it.id] ?? it.codes.map((c) => c.codeNumberId);
                      const r = await fetch(`/api/teach/course-items/${it.id}/codes`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ codeNumberIds: ids }),
                      });
                      if (r.ok) {
                        setCodeSel((m) => {
                          const c = { ...m };
                          delete c[it.id];
                          return c;
                        });
                        await load();
                      } else {
                        alert(t("teach.codeSaveFail"));
                        await load();
                      }
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
