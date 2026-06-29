"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/locale/locale-provider";
import { formatTermForDisplay } from "@/lib/term-display";
import { CodePicker, buildOptions, type CatalogRow, type CodeLink } from "./section-codes-shared";
import { SectionItemRow } from "./section-item-row";

type Item = {
  id: string;
  number: number;
  sortOrder: number;
  title: string | null;
  oneDriveUrl: string | null;
  linkTitle: string | null;
  onSiteDisplay: boolean;
  itemType: { id: string; key: string; label: string };
  codes: CodeLink[];
};

/** Per item type in this section (assignment, quiz, exam, project, …); matches DB @@unique([sectionId, itemTypeId, number]). */
function nextNumberForType(items: Item[], typeId: string): number {
  const nums = items
    .filter((i) => i.itemType.id === typeId)
    .map((i) => i.number);
  if (nums.length === 0) return 1;
  return Math.max(...nums) + 1;
}

/** Group items under type headings; order groups by `typeOrder` (admin item-types list), then by number within each group. */
function groupItemsByType(
  items: Item[],
  typeOrder: ItemType[]
): { typeId: string; label: string; items: Item[] }[] {
  const byId = new Map<string, Item[]>();
  for (const it of items) {
    const id = it.itemType.id;
    const list = byId.get(id);
    if (list) {
      list.push(it);
    } else {
      byId.set(id, [it]);
    }
  }
  for (const list of byId.values()) {
    list.sort((a, b) => a.number - b.number);
  }
  const out: { typeId: string; label: string; items: Item[] }[] = [];
  const used = new Set<string>();
  for (const ty of typeOrder) {
    const list = byId.get(ty.id);
    if (list?.length) {
      out.push({ typeId: ty.id, label: ty.label, items: list });
      used.add(ty.id);
    }
  }
  for (const [id, list] of byId) {
    if (used.has(id) || !list.length) {
      continue;
    }
    out.push({
      typeId: id,
      label: list[0]!.itemType.label,
      items: list,
    });
  }
  return out;
}
type ItemType = { id: string; key: string; label: string };
type SectionPayload = {
  id: string;
  label: string;
  syllabusUrl: string | null;
  syllabusLinkTitle: string | null;
  sectionCodes: CodeLink[];
  courseOffering: {
    course: { id: string; name: string };
    term: {
      academicYear: { label: string; startYear: number };
      termSeason: { key: string; label: string };
    };
  };
  courseItems: Item[];
};

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
  const [addBusy, setAddBusy] = useState(false);
  const [syllabusUrl, setSyllabusUrl] = useState("");
  const [syllabusLabel, setSyllabusLabel] = useState("");
  const [sectionCodeIds, setSectionCodeIds] = useState<string[]>([]);
  const [sectionCodeFilter, setSectionCodeFilter] = useState("");
  const sectionRef = useRef(section);
  sectionRef.current = section;

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
    const data = await r.json();
    setSection(data);
    setSectionCodeIds(data.sectionCodes.map((c: CodeLink) => c.codeNumberId));
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

  useEffect(() => {
    if (!section) return;
    setSyllabusUrl(section.syllabusUrl ?? "");
    setSyllabusLabel(section.syllabusLinkTitle ?? "");
  }, [section?.id]);

  useEffect(() => {
    if (!section) return;
    const serverIds = [...section.sectionCodes.map((c) => c.codeNumberId)].sort();
    const localIds = [...sectionCodeIds].sort();
    if (serverIds.join("\0") === localIds.join("\0")) return;
    const timer = setTimeout(() => {
      const s = sectionRef.current;
      if (!s) return;
      const sIds = [...s.sectionCodes.map((c) => c.codeNumberId)].sort();
      const lIds = [...sectionCodeIds].sort();
      if (sIds.join("\0") === lIds.join("\0")) return;
      void (async () => {
        const r = await fetch(`/api/teach/section/${sectionId}/codes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codeNumberIds: sectionCodeIds }),
        });
        if (r.ok) {
          const data = await r.json();
          setSection(data);
          setSectionCodeIds(data.sectionCodes.map((c: CodeLink) => c.codeNumberId));
        } else {
          alert(t("teach.codeSaveFail"));
          await load();
        }
      })();
    }, 500);
    return () => clearTimeout(timer);
  }, [sectionCodeIds, section, sectionId, load, t]);

  useEffect(() => {
    if (!section) return;
    const serverUrl = section.syllabusUrl ?? "";
    const serverLabel = section.syllabusLinkTitle ?? "";
    if (syllabusUrl === serverUrl && syllabusLabel === serverLabel) return;
    const timer = setTimeout(() => {
      const s = sectionRef.current;
      if (!s) return;
      if (
        syllabusUrl === (s.syllabusUrl ?? "") &&
        syllabusLabel === (s.syllabusLinkTitle ?? "")
      ) {
        return;
      }
      void (async () => {
        const r = await fetch(`/api/teach/section/${sectionId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            syllabusUrl: syllabusUrl.trim() === "" ? null : syllabusUrl.trim(),
            syllabusLinkTitle:
              syllabusLabel.trim() === "" ? null : syllabusLabel.trim(),
          }),
        });
        if (r.ok) {
          setSection(await r.json());
        }
      })();
    }, 500);
    return () => clearTimeout(timer);
  }, [syllabusUrl, syllabusLabel, section, sectionId]);

  const itemsByType = useMemo(() => {
    if (!section) {
      return [];
    }
    return groupItemsByType(section.courseItems, types);
  }, [section, types]);

  const sectionCodeOptions = useMemo(
    () => buildOptions(catalog, undefined),
    [catalog]
  );

  if (err) {
    return <p className="text-sm text-app-danger">{err}</p>;
  }
  if (!section) {
    return <p className="text-app-muted/90">{t("teach.loading")}</p>;
  }

  const path = `${formatTermForDisplay(section.courseOffering.term)} · ${section.courseOffering.course.name} · ${section.label}`;

  return (
    <div className="space-y-8">
      <div>
        {surrogate && (
          <p className="mb-2 text-sm text-amber-900/90">
            {t("admin.facultySurrogateBanner").replace(
              "__NAME__",
              surrogate.facultyLabel
            )}
          </p>
        )}
        <h1 className="text-lg font-bold text-app-fg">{path}</h1>
        <Link
          href={surrogate ? surrogate.backHref : "/teach"}
          className="text-sm text-app-muted/90 hover:text-app-link hover:underline"
        >
          {surrogate ? t("admin.facultyBackToList") : t("teach.backList")}
        </Link>
      </div>

      <section className="glass p-4">
        <h2 className="mb-2 font-medium text-app-fg/92">
          {t("explore.courseDetailSyllabus")}
        </h2>
        <p className="mb-2 text-[11px] text-app-muted/85">{t("teach.autoSaveHint")}</p>
        <div className="space-y-2">
          <label className="block text-xs text-app-muted/90" htmlFor={`syllabus-url-${sectionId}`}>
            {t("teach.syllabusShareLink")}
          </label>
          <input
            id={`syllabus-url-${sectionId}`}
            className="input-glass w-full px-2 py-1.5 text-sm"
            value={syllabusUrl}
            onChange={(e) => setSyllabusUrl(e.target.value)}
            placeholder="https://..."
          />
          <input
            className="input-glass w-full px-2 py-1.5 text-sm sm:max-w-xs"
            value={syllabusLabel}
            onChange={(e) => setSyllabusLabel(e.target.value)}
            placeholder={t("teach.syllabusLinkLabel")}
            aria-label={t("teach.syllabusLinkLabel")}
          />
          {section.syllabusUrl && (
            <a
              href={section.syllabusUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex text-sm font-medium text-app-link hover:underline"
            >
              {section.syllabusLinkTitle || t("explore.syllabusLinkDefault")}
            </a>
          )}
        </div>
      </section>

      <section className="glass p-4">
        <h2 className="mb-2 font-medium text-app-fg/92">
          {t("teach.sectionCodesTitle")}
        </h2>
        <p className="mb-1 text-xs text-app-muted/85">{t("teach.sectionCodesHint")}</p>
        <p className="mb-2 text-[11px] text-app-muted/85">{t("teach.autoSaveHint")}</p>
        <CodePicker
          t={t}
          idPrefix="section-codes"
          options={sectionCodeOptions}
          valueIds={sectionCodeIds}
          onChange={setSectionCodeIds}
          filter={sectionCodeFilter}
          onFilterChange={setSectionCodeFilter}
        />
      </section>

      <section className="glass p-4">
        <h2 className="mb-2 font-medium text-app-fg/92">
          {t("teach.addItem")}
        </h2>
        <p className="mb-1 text-xs text-app-muted/85">{t("teach.howManyHint")}</p>
        <p className="mb-2 text-xs text-app-muted/85">{t("teach.addItemHint")}</p>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newItem.typeId || addBusy) return;
            const n = Math.min(50, Math.max(1, Math.floor(addCount) || 1));
            const start = nextNumberForType(section.courseItems, newItem.typeId);
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
              await load();
            } finally {
              setAddBusy(false);
            }
          }}
        >
          {addErr && (
            <p className="text-sm text-amber-900/90">{addErr}</p>
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
            <label className="flex flex-col text-xs text-app-muted/90">
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
        </form>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-app-fg/92">
          {t("teach.itemsCodes")}
        </h2>
        <p className="mb-1 text-xs text-app-muted/85">{t("teach.itemsCodesHint")}</p>
        <p className="mb-3 text-xs text-app-muted/85">{t("teach.copyItemHint")}</p>
        <div className="space-y-8">
          {itemsByType.map((group) => (
            <div key={group.typeId}>
              <h3 className="mb-2 border-b border-app-border/70 pb-1.5 text-sm font-semibold tracking-wide text-app-primary">
                {group.label}
                <span className="ml-2 font-normal text-app-muted/90">
                  ({group.items.length})
                </span>
              </h3>
              <ul className="space-y-3">
                {group.items.map((it) => (
                  <li
                    key={`${it.id}-${it.codes.map((c) => c.codeNumberId).sort().join(",")}`}
                  >
                    <SectionItemRow
                      t={t}
                      it={it}
                      catalog={catalog}
                      sectionCodeIds={sectionCodeIds}
                      onReload={load}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
