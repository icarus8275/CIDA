"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  BookOpen,
  CalendarRange,
  ChevronDown,
  ChevronRight,
  Hash,
  ListTree,
  Search,
} from "lucide-react";
import type { ExploreCourse } from "@/lib/explore-data";
import { buildCodeIndex, type CodeRef } from "@/lib/build-code-index";
import { useI18n } from "@/components/locale/locale-provider";
import { CodesReadonlyGrouped } from "@/app/teach/section/[sectionId]/section-codes-shared";

type Selection =
  | { kind: "item"; course: ExploreCourse; item: ExploreCourse["items"][0] }
  | { kind: "code"; code: string; refs: CodeRef[] }
  | null;

const Section = ({
  title,
  icon,
  children,
  right,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
}) => (
  <div className="glass p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 font-semibold text-slate-100">
        {icon}
        <span>{title}</span>
      </div>
      {right}
    </div>
    {children}
  </div>
);

const Row = ({
  left,
  right,
  onClick,
  isOpen,
}: {
  left: React.ReactNode;
  right?: React.ReactNode;
  onClick?: () => void;
  isOpen: boolean;
}) => (
  <div
    role="button"
    tabIndex={0}
    onClick={onClick}
    onKeyDown={(e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onClick?.();
      }
    }}
    className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-white/5"
  >
    <div className="flex items-center gap-2">
      {isOpen ? (
        <ChevronDown size={18} className="shrink-0 text-slate-400" />
      ) : (
        <ChevronRight size={18} className="shrink-0 text-slate-400" />
      )}
      {left}
    </div>
    {right != null && <div className="text-sm text-slate-400">{right}</div>}
  </div>
);

function labelOf(item: ExploreCourse["items"][0]) {
  if (item.title?.trim()) return item.title.trim();
  return `${item.typeLabel} ${item.number}`;
}

function groupByType(items: ExploreCourse["items"]) {
  const groups: Record<string, ExploreCourse["items"]> = {};
  for (const it of items) {
    (groups[it.typeLabel] ??= []).push(it);
  }
  for (const arr of Object.values(groups)) {
    arr.sort((a, b) => a.number - b.number);
  }
  return groups;
}

type Tab = "tree" | "codes";

function matchesQuery(
  text: string | undefined,
  query: string
) {
  if (!query) return true;
  return (text || "").toLowerCase().includes(query.trim().toLowerCase());
}

export function CourseCodeExplorer({
  initialData,
  codeLabels = {},
  accountLine,
}: {
  initialData: ExploreCourse[];
  /** Admin 카탈로그 설명 (value 대문자 키) — Codes 탭 툴팁 */
  codeLabels?: Record<string, string | null>;
  accountLine?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<Tab>("tree");
  const [selection, setSelection] = useState<Selection>(null);
  const { t } = useI18n();

  const codeIndex = useMemo(
    () => buildCodeIndex(initialData),
    [initialData]
  );

  const allCodes = useMemo(() => {
    return [...codeIndex.keys()].sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true })
    );
  }, [codeIndex]);

  const codeIndexEntries = useMemo(() => {
    return allCodes.map((v) => ({
      value: v,
      label: codeLabels[v] ?? null,
    }));
  }, [allCodes, codeLabels]);

  const data = useMemo(() => {
    if (!query) return initialData;
    return initialData
      .map((c) => {
        const courseMatch =
          matchesQuery(c.name, query) || matchesQuery(c.pathLabel, query);
        const items = c.items
          .map((it) => ({
            ...it,
            codes: it.codes.filter(
              (cd) =>
                matchesQuery(cd.value, query) ||
                (cd.label != null && matchesQuery(cd.label, query))
            ),
          }))
          .filter(
            (it) =>
              courseMatch ||
              matchesQuery(`${it.typeLabel} ${it.number}`, query) ||
              it.codes.length > 0
          );
        if (courseMatch || items.length > 0) {
          return { ...c, items };
        }
        return null;
      })
      .filter(Boolean) as ExploreCourse[];
  }, [query, initialData]);

  const termsGrouped = useMemo(() => {
    const map = new Map<
      string,
      { termId: string; termLabel: string; termSort: number; courses: ExploreCourse[] }
    >();
    for (const c of data) {
      const ex = map.get(c.termId);
      if (ex) {
        ex.courses.push(c);
      } else {
        map.set(c.termId, {
          termId: c.termId,
          termLabel: c.termLabel,
          termSort: c.termSort,
          courses: [c],
        });
      }
    }
    for (const g of map.values()) {
      g.courses.sort((a, b) =>
        a.pathLabel.localeCompare(b.pathLabel, undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );
    }
    return [...map.values()].sort((a, b) => a.termSort - b.termSort);
  }, [data]);

  const setParams = useCallback(
    (p: {
      courseId?: string | null;
      itemId?: string | null;
      code?: string | null;
    }) => {
      const next = new URLSearchParams(searchParams.toString());
      if (p.courseId !== undefined) {
        if (p.courseId) next.set("course", p.courseId);
        else next.delete("course");
      }
      if (p.itemId !== undefined) {
        if (p.itemId) next.set("item", p.itemId);
        else next.delete("item");
      }
      if (p.code !== undefined) {
        if (p.code) next.set("code", p.code);
        else next.delete("code");
      }
      const s = next.toString();
      router.replace(s ? `?${s}` : "?", { scroll: false });
    },
    [router, searchParams]
  );

  const showItemDetails = (course: ExploreCourse, item: ExploreCourse["items"][0]) => {
    setSelection({ kind: "item", course, item });
    setParams({ courseId: course.id, itemId: item.id, code: null });
  };

  const showCodeDetails = (code: string) => {
    const c = code.toUpperCase();
    setSelection({
      kind: "code",
      code: c,
      refs: codeIndex.get(c) || [],
    });
    setParams({ code: c, itemId: null });
  };

  // Hydrate from URL
  useEffect(() => {
    const cid = searchParams.get("course");
    const iid = searchParams.get("item");
    const cd = searchParams.get("code");
    if (cd) {
      const c = cd.toUpperCase();
      setSelection({
        kind: "code",
        code: c,
        refs: codeIndex.get(c) || [],
      });
      return;
    }
    if (cid && iid) {
      const course = initialData.find((c) => c.id === cid);
      const item = course?.items.find((x) => x.id === iid);
      if (course && item) {
        setSelection({ kind: "item", course, item });
      }
    }
  }, [searchParams, initialData, codeIndex]);

  const kTerm = (termId: string) => `term:${termId}`;
  const kCourse = (c: ExploreCourse) => `course:${c.id}`;
  const kGroup = (c: ExploreCourse, g: string) => `group:${c.id}:${g}`;

  const DetailsPanel = () => {
    if (!selection) {
      return (
        <p className="text-sm text-slate-400">{t("explore.emptySelect")}</p>
      );
    }
    if (selection.kind === "item") {
      const { course, item } = selection;
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">{t("explore.selectedItem")}</p>
          <p className="text-xs text-slate-500">{course.pathLabel}</p>
          <p className="text-sm font-medium text-slate-300">{course.name}</p>
          <p className="text-xs text-slate-500">
            {t("explore.itemDetailType")}:{" "}
            <span className="text-slate-200">
              {item.typeLabel} {item.number}
            </span>
          </p>
          <p className="text-lg font-semibold text-white">
            {labelOf(item)}
          </p>
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">
              {t("explore.itemDetailFile")}
            </p>
            {item.oneDriveUrl ? (
              <a
                href={item.oneDriveUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex text-sm font-medium text-cyan-200 hover:underline"
              >
                {item.linkTitle || t("explore.fileLinkDefault")}
              </a>
            ) : (
              <p className="text-sm text-slate-500">
                {t("explore.itemDetailNoLink")}
              </p>
            )}
          </div>
          <div>
            <p className="mb-1.5 text-xs font-medium text-slate-500">
              {t("explore.itemDetailCodes")}
            </p>
            {item.codes.length === 0 ? (
              <span className="text-sm text-slate-500">—</span>
            ) : (
              <CodesReadonlyGrouped
                codes={item.codes}
                onCodeClick={(v) => showCodeDetails(v)}
                idPrefix={`panel-${item.id}`}
              />
            )}
          </div>
        </div>
      );
    }
    if (selection.kind === "code") {
      const { code, refs } = selection;
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">{t("explore.selectedCode")}</p>
          <p className="flex items-center gap-2 text-xl font-semibold text-white">
            <Hash size={18} />
            {code}
          </p>
          {codeLabels[code] != null && codeLabels[code] !== "" && (
            <p className="text-sm leading-relaxed text-slate-400">
              {codeLabels[code]}
            </p>
          )}
          <p className="text-sm text-slate-400">{t("explore.codeUsedIn")}</p>
          <ul className="space-y-2">
            {refs.length === 0 && (
              <li className="text-sm text-slate-500">{t("explore.noMatch")}</li>
            )}
            {refs.map((r) => {
              const crs = initialData.find((c) => c.id === r.courseId);
              const itm = crs?.items.find((i) => i.id === r.itemId);
              return (
                <li
                  key={`${r.itemId}-${r.code}`}
                  className="flex items-start gap-2"
                >
                  <BookOpen size={16} className="mt-1 shrink-0" />
                  <button
                    type="button"
                    className="text-left hover:underline"
                    onClick={() => {
                      if (crs && itm) {
                        showItemDetails(crs, itm);
                        setQuery("");
                      }
                    }}
                  >
                    <div className="font-medium text-slate-100">{r.course}</div>
                    <div className="text-xs text-slate-500">{r.pathLabel}</div>
                    <div className="text-sm text-slate-400">
                      {r.type} {r.number}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-dvh">
      <header className="glass-nav sticky top-0 z-20">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <h1 className="text-xl font-bold text-white">
            {t("explore.title")}
          </h1>
          {accountLine && (
            <span
              className="max-w-[min(18rem,50vw)] truncate text-xs text-slate-400 sm:text-sm"
              title={accountLine}
            >
              {accountLine}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("explore.searchPlaceholder")}
                className="input-glass w-64 rounded-xl py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <div className="flex gap-1 rounded-xl border border-white/15 bg-white/5 p-0.5 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setTab("tree")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab === "tree"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {t("explore.tabTree")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab("codes");
                  setSelection(null);
                }}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab === "codes"
                    ? "bg-white/20 text-white shadow-sm"
                    : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <ListTree size={16} />
                {t("explore.tabCodes")}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start">
          <div className="min-w-0 flex-1 space-y-4">
            {tab === "tree" && (
              <>
                {termsGrouped.map((tg) => {
                  const isTermOpen = open[kTerm(tg.termId)] ?? true;
                  return (
                    <div
                      key={tg.termId}
                      className="glass overflow-hidden rounded-xl p-0"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2 font-semibold text-slate-100">
                          <CalendarRange
                            size={20}
                            className="shrink-0 text-cyan-300/90"
                            aria-hidden
                          />
                          <span className="truncate">{tg.termLabel}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() =>
                            setOpen((o) => ({
                              ...o,
                              [kTerm(tg.termId)]: !isTermOpen,
                            }))
                          }
                          className="shrink-0 text-sm text-slate-400 hover:text-cyan-200 hover:underline"
                        >
                          {isTermOpen
                            ? t("explore.collapse")
                            : t("explore.expand")}
                        </button>
                      </div>
                      {isTermOpen && (
                        <div className="space-y-4 p-4 pt-2">
                          {tg.courses.map((course) => {
                            const isCourseOpen = open[kCourse(course)] ?? true;
                            const groups = groupByType(course.items);
                            const groupKeys = Object.keys(groups).sort();
                            return (
                              <Section
                                key={course.id}
                                title={course.pathLabel}
                                icon={<BookOpen size={18} />}
                                right={
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpen((o) => ({
                                        ...o,
                                        [kCourse(course)]: !isCourseOpen,
                                      }))
                                    }
                                    className="text-sm text-slate-400 hover:text-cyan-200 hover:underline"
                                  >
                                    {isCourseOpen
                                      ? t("explore.collapse")
                                      : t("explore.expand")}
                                  </button>
                                }
                              >
                                {isCourseOpen && (
                                  <div className="divide-y divide-white/10">
                                    {groupKeys.map((g) => {
                                      const isGroupOpen =
                                        open[kGroup(course, g)] ?? true;
                                      return (
                                        <div key={g} className="py-2">
                                          <Row
                                            isOpen={isGroupOpen}
                                            onClick={() =>
                                              setOpen((o) => ({
                                                ...o,
                                                [kGroup(course, g)]:
                                                  !isGroupOpen,
                                              }))
                                            }
                                            left={
                                              <span className="font-medium text-slate-200">
                                                {g}
                                              </span>
                                            }
                                            right={`${groups[g].length}`}
                                          />
                                          {isGroupOpen && (
                                            <div className="space-y-1 pl-7 pt-1">
                                              {groups[g].map((it) => (
                                                <div
                                                  key={it.id}
                                                  role="button"
                                                  tabIndex={0}
                                                  onClick={() =>
                                                    showItemDetails(course, it)
                                                  }
                                                  onKeyDown={(e) => {
                                                    if (
                                                      e.key === "Enter" ||
                                                      e.key === " "
                                                    ) {
                                                      e.preventDefault();
                                                      showItemDetails(
                                                        course,
                                                        it
                                                      );
                                                    }
                                                  }}
                                                  className="rounded-lg border border-white/10 bg-white/5 p-2 text-left outline-none ring-cyan-400/40 transition hover:border-white/20 hover:bg-white/10 focus-visible:ring-2"
                                                >
                                                  <div className="flex flex-col gap-2">
                                                    <span className="font-medium text-slate-100">
                                                      {labelOf(it)}
                                                    </span>
                                                    {it.codes.length > 0 && (
                                                      <div
                                                        onClick={(e) =>
                                                          e.stopPropagation()
                                                        }
                                                        onKeyDown={(e) =>
                                                          e.stopPropagation()
                                                        }
                                                      >
                                                        <CodesReadonlyGrouped
                                                          codes={it.codes}
                                                          onCodeClick={(v) =>
                                                            showCodeDetails(v)
                                                          }
                                                          idPrefix={`row-${course.id}-${it.id}`}
                                                        />
                                                      </div>
                                                    )}
                                                  </div>
                                                </div>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </Section>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
                {data.length === 0 && (
                  <p className="text-slate-400">{t("explore.noResults")}</p>
                )}
              </>
            )}

            {tab === "codes" && (
              <Section
                title={t("explore.codeIndex")}
                icon={<ListTree size={18} />}
              >
                <div className="max-h-[70vh] overflow-y-auto p-1">
                  {allCodes.length > 0 ? (
                    <CodesReadonlyGrouped
                      codes={codeIndexEntries}
                      onCodeClick={(v) => {
                        setTab("tree");
                        showCodeDetails(v);
                      }}
                      idPrefix="code-index"
                    />
                  ) : (
                    <p className="text-sm text-slate-400">
                      {t("explore.noCodes")}
                    </p>
                  )}
                </div>
              </Section>
            )}
          </div>

          <aside className="w-full min-w-0 shrink-0 lg:sticky lg:top-20 lg:max-w-sm lg:self-start z-10 max-h-[min(100vh,56rem)] overflow-y-auto">
            <Section
              title={t("explore.panelTitle")}
              icon={<ChevronRight size={18} />}
              right={
                selection && (
                  <button
                    type="button"
                    className="text-sm text-slate-400 hover:text-cyan-200 hover:underline"
                    onClick={() => {
                      setSelection(null);
                      setParams({
                        courseId: null,
                        itemId: null,
                        code: null,
                      });
                    }}
                  >
                    {t("explore.clear")}
                  </button>
                )
              }
            >
              <DetailsPanel />
            </Section>
          </aside>
        </div>
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-slate-500/80">
        {t("explore.footer")}
      </footer>
    </div>
  );
}
