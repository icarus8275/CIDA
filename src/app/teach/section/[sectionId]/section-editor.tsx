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

function nextNumberForType(items: Item[], typeId: string): number {
  const nums = items
    .filter((i) => i.itemType.id === typeId)
    .map((i) => i.number);
  if (nums.length === 0) return 1;
  return Math.max(...nums) + 1;
}
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

type Opt = {
  id: string;
  value: string;
  label: string | null;
  isActive: boolean;
  sortOrder: number;
};

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
      sortOrder: c.sortOrder,
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
        sortOrder: 999_999,
      });
    }
  }
  return [...m.values()].sort((a, b) => {
    if (a.sortOrder !== b.sortOrder) {
      return a.sortOrder - b.sortOrder;
    }
    return a.value.localeCompare(b.value, undefined, { numeric: true });
  });
}

function CodePicker({
  t,
  options,
  valueIds,
  onChange,
  filter,
  onFilterChange,
  disabled,
  idPrefix,
}: {
  t: (k: string) => string;
  options: Opt[];
  valueIds: string[];
  onChange: (ids: string[]) => void;
  filter: string;
  onFilterChange: (v: string) => void;
  disabled?: boolean;
  /** 안정적인 DOM id(여러 pickers) */
  idPrefix: string;
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
        autoComplete="off"
      />
      <div className="glass min-h-16 max-h-52 overflow-y-auto p-2">
        {options.length === 0 ? (
          <p className="text-sm text-amber-200/90">{t("teach.noCodeCatalog")}</p>
        ) : shown.length === 0 ? (
          <p className="text-sm text-slate-500">{t("teach.codeNoMatch")}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {shown.map((o) => {
              const isOn = selected.has(o.id);
              const isDisabled = disabled || (!o.isActive && !isOn);
              return (
                <button
                  key={o.id}
                  type="button"
                  id={`${idPrefix}-${o.id}`}
                  title={
                    o.label && o.label.trim()
                      ? o.label
                      : isOn && !o.isActive
                        ? "inactive (saved)"
                        : undefined
                  }
                  aria-pressed={isOn}
                  disabled={isDisabled}
                  onClick={() => {
                    const next = new Set(valueIds);
                    if (next.has(o.id)) {
                      next.delete(o.id);
                    } else {
                      next.add(o.id);
                    }
                    onChange([...next]);
                  }}
                  className={[
                    "min-h-[2.25rem] min-w-[2.5rem] rounded border px-2 font-mono text-xs transition",
                    isOn
                      ? "border-cyan-400/50 bg-cyan-500/20 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.2)]"
                      : "border-white/10 bg-white/5 text-slate-200 hover:border-white/25 hover:bg-white/10",
                    isDisabled ? "cursor-not-allowed opacity-40" : "cursor-pointer",
                    !o.isActive && isOn ? "text-amber-200/90" : "",
                  ].join(" ")}
                >
                  {o.value}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export function SectionEditor({
  sectionId,
  surrogate = null,
}: {
  sectionId: string;
  /** Admin: 편집 대상 교수와 관리자 화면으로의 복귀 링크 */
  surrogate?: { facultyLabel: string; backHref: string } | null;
}) {
  const { t } = useI18n();
  const [section, setSection] = useState<SectionPayload | null>(null);
  const [types, setTypes] = useState<ItemType[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [addErr, setAddErr] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({ typeId: "" });
  const [addCount, setAddCount] = useState(1);
  const [newItemCodes, setNewItemCodes] = useState<string[]>([]);
  const [addBusy, setAddBusy] = useState(false);
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
        {surrogate && (
          <p className="mb-2 text-sm text-amber-200/90">
            {t("admin.facultySurrogateBanner").replace(
              "__NAME__",
              surrogate.facultyLabel
            )}
          </p>
        )}
        <h1 className="text-lg font-bold text-white">{path}</h1>
        <Link
          href={surrogate ? surrogate.backHref : "/teach"}
          className="text-sm text-slate-400 hover:text-cyan-200 hover:underline"
        >
          {surrogate ? t("admin.facultyBackToList") : t("teach.backList")}
        </Link>
      </div>

      <section className="glass p-4">
        <h2 className="mb-2 font-medium text-slate-200">
          {t("teach.addItem")}
        </h2>
        <p className="mb-1 text-xs text-slate-500">{t("teach.howManyHint")}</p>
        <p className="mb-2 text-xs text-slate-500">{t("teach.codeNumbersHint")}</p>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newItem.typeId || addBusy) return;
            const n = Math.min(50, Math.max(1, Math.floor(addCount) || 1));
            const start = nextNumberForType(section.courseItems, newItem.typeId);
            const codesToAttach = n === 1 ? newItemCodes : [];
            setAddBusy(true);
            setAddErr(null);
            try {
              for (let i = 0; i < n; i++) {
                const r = await fetch("/api/teach/course-items", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    sectionId,
                    itemTypeId: newItem.typeId,
                    number: start + i,
                    codeNumberIds: i === 0 ? codesToAttach : [],
                  }),
                });
                if (!r.ok) {
                  setAddErr(t("teach.errAddItems"));
                  await load();
                  return;
                }
              }
              setNewItem({ typeId: newItem.typeId });
              setAddCount(1);
              setNewItemCodes([]);
              setNewFilter("");
              await load();
            } finally {
              setAddBusy(false);
            }
          }}
        >
          {addErr && (
            <p className="text-sm text-amber-200/90">{addErr}</p>
          )}
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
            <label className="flex flex-col text-xs text-slate-400">
              <span>{t("teach.howMany")}</span>
              <input
                type="number"
                className="input-glass mt-0.5 w-20 px-2 py-1.5"
                value={addCount}
                onChange={(e) =>
                  setAddCount(
                    Math.min(50, Math.max(1, +e.target.value || 1))
                  )
                }
                min={1}
                max={50}
              />
            </label>
            <button
              type="submit"
              disabled={addBusy}
              className="btn-glass-primary px-3 py-1.5 text-sm disabled:opacity-50"
            >
              {addBusy ? t("teach.loading") : t("teach.add")}
            </button>
          </div>
          <CodePicker
            t={t}
            idPrefix="add-new"
            options={buildOptions(catalog, undefined)}
            valueIds={newItemCodes}
            onChange={setNewItemCodes}
            filter={newFilter}
            onFilterChange={setNewFilter}
            disabled={addBusy}
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
                      className="btn-glass-primary px-2 py-1 text-sm"
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
                      {t("teach.saveLink")}
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
                    {t("teach.codeCatalogPicks")} — {t("teach.saveCodeSelectionHint")}
                  </label>
                  <CodePicker
                    t={t}
                    idPrefix={`item-${it.id}`}
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
                    className="btn-glass-primary mt-2 px-3 py-1.5 text-sm"
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
                    {t("teach.saveCodeSelection")}
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
