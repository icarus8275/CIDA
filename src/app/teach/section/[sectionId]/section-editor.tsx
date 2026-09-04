"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useI18n } from "@/components/locale/locale-provider";
import { formatTermForDisplay } from "@/lib/term-display";
import { CopyToModal, type CopyCourseOption } from "@/app/teach/copy-to-modal";
import { LiveLinkHealthDot } from "@/components/link-health-dot";
import { type CatalogRow, type CodeLink } from "./section-codes-shared";
import {
  SectionItemRow,
  type SectionItemRowHandle,
} from "./section-item-row";

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
  courseOffering: {
    course: {
      id: string;
      name: string;
      courseCodes: CodeLink[];
    };
    term: {
      academicYear: { label: string; startYear: number };
      termSeason: { key: string; label: string };
    };
  };
  courseItems: Item[];
  share?: {
    courseOfferingId: string;
    active: boolean;
    isMember: boolean;
    canRequest: boolean;
    poolSectionLabel: string | null;
    members: { id: string; label: string }[];
    otherFaculty: { id: string; label: string }[];
    pendingOutgoing: { id: string; targetLabel: string }[];
    pendingIncoming: { id: string; requesterLabel: string }[];
  } | null;
};

export function SectionEditor({
  sectionId,
  surrogate = null,
}: {
  sectionId: string;
  /** Admin: 편집 대상 교수와 관리자 화면으로의 복귀 링크 */
  surrogate?: { facultyLabel: string; backHref: string; facultyUserId?: string } | null;
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
  const [savedMsg, setSavedMsg] = useState(false);
  const [shareBusy, setShareBusy] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTargets, setCopyTargets] = useState<CopyCourseOption[]>([]);
  const [clearBusy, setClearBusy] = useState(false);
  const itemRefs = useRef(new Map<string, SectionItemRowHandle>());
  const sectionRef = useRef(section);
  sectionRef.current = section;

  const flashSaved = useCallback(() => {
    setSavedMsg(true);
    window.setTimeout(() => setSavedMsg(false), 2500);
  }, []);

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

  const courseCodeIds = useMemo(() => {
    if (!section) return [];
    return section.courseOffering.course.courseCodes.map((c) => c.codeNumberId);
  }, [section]);

  if (err) {
    return <p className="text-sm text-app-danger">{err}</p>;
  }
  if (!section) {
    return <p className="text-app-muted/90">{t("teach.loading")}</p>;
  }

  const path = `${formatTermForDisplay(section.courseOffering.term)} · ${section.courseOffering.course.name} · ${section.label}`;
  const share = section.share;

  async function saveSyllabus() {
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
      flashSaved();
    }
  }

  async function saveGroup(ids: string[]) {
    const results = await Promise.all(
      ids.map((id) => itemRefs.current.get(id)?.save() ?? Promise.resolve(true))
    );
    if (results.every(Boolean)) flashSaved();
  }

  async function openCopyTo() {
    const params = new URLSearchParams({ fromSectionId: sectionId });
    if (surrogate?.facultyUserId) {
      params.set("forUserId", surrogate.facultyUserId);
    }
    const r = await fetch(`/api/teach/copy-targets?${params}`, { cache: "no-store" });
    if (!r.ok) return;
    const rows = (await r.json()) as { id: string; label: string }[];
    setCopyTargets(rows);
    setCopyOpen(true);
  }

  async function clearItems(itemTypeId?: string, typeLabel?: string) {
    const ok = window.confirm(
      itemTypeId
        ? t("teach.deleteAllTypeConfirm").replace("__TYPE__", typeLabel || "")
        : t("teach.deleteAllConfirm")
    );
    if (!ok) return;
    setClearBusy(true);
    try {
      const r = await fetch(`/api/teach/section/${sectionId}/clear-items`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(itemTypeId ? { itemTypeId } : {}),
      });
      if (!r.ok) {
        setAddErr(t("teach.deleteAllFail"));
        return;
      }
      await load();
      flashSaved();
    } finally {
      setClearBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      {savedMsg && (
        <div
          role="status"
          className="rounded-lg border border-emerald-300/80 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900"
        >
          {t("teach.savedToast")}
        </div>
      )}
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
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-glass px-3 py-1.5 text-sm"
            onClick={() => void openCopyTo()}
          >
            {t("teach.copyTo")}
          </button>
          {section.courseItems.length > 0 && (
            <button
              type="button"
              className="btn-glass px-3 py-1.5 text-sm text-app-danger disabled:opacity-50"
              disabled={clearBusy}
              onClick={() => void clearItems()}
            >
              {t("teach.deleteAllItems")}
            </button>
          )}
        </div>
      </div>

      {share && (
        <section className="glass p-4">
          <h2 className="mb-2 font-medium text-app-fg/92">{t("share.title")}</h2>
          <p className="mb-3 text-xs text-app-muted/85">{t("share.lead")}</p>
          {share.active && (
            <p className="mb-2 text-sm text-app-fg">
              {t("share.activeWith")}{" "}
              {share.members.map((m) => m.label).join(", ")}
            </p>
          )}
          {share.pendingOutgoing.length > 0 && (
            <p className="mb-2 text-sm text-app-muted/90">
              {t("share.waitingOn")}{" "}
              {share.pendingOutgoing.map((p) => p.targetLabel).join(", ")}
            </p>
          )}
          {share.pendingIncoming.length > 0 && (
            <div className="mb-3 space-y-2">
              {share.pendingIncoming.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-wrap items-center gap-2 text-sm"
                >
                  <span>
                    {t("share.incomingFrom").replace("__NAME__", p.requesterLabel)}
                  </span>
                  <button
                    type="button"
                    disabled={shareBusy}
                    className="btn-glass-primary px-2 py-1 text-xs disabled:opacity-50"
                    onClick={async () => {
                      setShareBusy(true);
                      try {
                        await fetch("/api/teach/share/respond", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ requestId: p.id, accept: true }),
                        });
                        await load();
                      } finally {
                        setShareBusy(false);
                      }
                    }}
                  >
                    {t("share.accept")}
                  </button>
                  <button
                    type="button"
                    disabled={shareBusy}
                    className="btn-glass px-2 py-1 text-xs disabled:opacity-50"
                    onClick={async () => {
                      setShareBusy(true);
                      try {
                        await fetch("/api/teach/share/respond", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ requestId: p.id, accept: false }),
                        });
                        await load();
                      } finally {
                        setShareBusy(false);
                      }
                    }}
                  >
                    {t("share.decline")}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {share.canRequest && !share.active && (
              <button
                type="button"
                disabled={shareBusy || share.otherFaculty.length === 0}
                className="btn-glass-primary px-3 py-1.5 text-sm disabled:opacity-50"
                onClick={async () => {
                  if (!confirm(t("share.requestConfirm"))) return;
                  setShareBusy(true);
                  try {
                    const r = await fetch("/api/teach/share/request", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ sectionId }),
                    });
                    if (!r.ok) {
                      alert(t("share.requestFail"));
                      return;
                    }
                    await load();
                  } finally {
                    setShareBusy(false);
                  }
                }}
              >
                {t("share.request")}
              </button>
            )}
            {share.active && (
              <button
                type="button"
                disabled={shareBusy}
                className="btn-glass px-3 py-1.5 text-sm text-app-danger disabled:opacity-50"
                onClick={async () => {
                  if (!confirm(t("share.leaveConfirm"))) return;
                  setShareBusy(true);
                  try {
                    const r = await fetch("/api/teach/share/leave", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        courseOfferingId: share.courseOfferingId,
                      }),
                    });
                    if (!r.ok) {
                      alert(t("share.leaveFail"));
                      return;
                    }
                    await load();
                  } finally {
                    setShareBusy(false);
                  }
                }}
              >
                {t("share.leave")}
              </button>
            )}
          </div>
        </section>
      )}

      <section className="glass p-4">
        <h2 className="mb-2 font-medium text-app-fg/92">
          {t("explore.courseDetailSyllabus")}
        </h2>
        <p className="mb-2 text-[11px] text-app-muted/85">{t("teach.autoSaveHint")}</p>
        <div className="space-y-2">
          <label className="block text-xs text-app-muted/90" htmlFor={`syllabus-url-${sectionId}`}>
            {t("teach.syllabusShareLink")}
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`syllabus-url-${sectionId}`}
              className="input-glass min-w-0 flex-1 px-2 py-1.5 text-sm"
              value={syllabusUrl}
              onChange={(e) => setSyllabusUrl(e.target.value)}
              placeholder="https://..."
            />
            <LiveLinkHealthDot url={syllabusUrl} />
          </div>
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
          <button
            type="button"
            className="btn-glass-primary px-3 py-1.5 text-sm"
            onClick={() => void saveSyllabus()}
          >
            {t("teach.save")}
          </button>
        </div>
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
        <p className="mb-1 text-xs text-app-muted/85">{t("teach.courseCodesNotice")}</p>
        {courseCodeIds.length === 0 && (
          <p className="mb-3 text-xs text-amber-900/90">{t("teach.courseCodesEmpty")}</p>
        )}
        <p className="mb-3 text-xs text-app-muted/85">{t("teach.copyItemHint")}</p>
        <div className="space-y-8">
          {itemsByType.map((group) => (
            <div key={group.typeId}>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-app-border/70 pb-1.5">
                <h3 className="text-sm font-semibold tracking-wide text-app-primary">
                  {group.label}
                  <span className="ml-2 font-normal text-app-muted/90">
                    ({group.items.length})
                  </span>
                </h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="btn-glass px-3 py-1 text-xs text-app-danger disabled:opacity-50"
                    disabled={clearBusy}
                    onClick={() => void clearItems(group.typeId, group.label)}
                  >
                    {t("teach.deleteAllType")}
                  </button>
                  <button
                    type="button"
                    className="btn-glass-primary px-3 py-1 text-xs"
                    onClick={() =>
                      void saveGroup(group.items.map((it) => it.id))
                    }
                  >
                    {t("teach.saveSection")}
                  </button>
                </div>
              </div>
              <ul className="space-y-3">
                {group.items.map((it) => (
                  <li
                    key={`${it.id}-${it.codes.map((c) => c.codeNumberId).sort().join(",")}`}
                  >
                    <SectionItemRow
                      ref={(el) => {
                        if (el) itemRefs.current.set(it.id, el);
                        else itemRefs.current.delete(it.id);
                      }}
                      t={t}
                      it={it}
                      catalog={catalog}
                      courseCodeIds={courseCodeIds}
                      onReload={load}
                      onSaved={flashSaved}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
      {copyOpen && (
        <CopyToModal
          sourceId={sectionId}
          sourceLabel={path}
          targets={copyTargets}
          onClose={() => setCopyOpen(false)}
          onDone={() => flashSaved()}
        />
      )}
    </div>
  );
}
