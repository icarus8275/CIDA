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
  ChevronDown,
  ChevronRight,
  Hash,
  ListTree,
  Search,
} from "lucide-react";
import type { ExploreCourse } from "@/lib/explore-data";
import { buildCodeIndex, type CodeRef } from "@/lib/build-code-index";
import { useI18n } from "@/components/locale/locale-provider";

type Selection =
  | { kind: "item"; course: ExploreCourse; item: ExploreCourse["items"][0] }
  | { kind: "code"; code: string; refs: CodeRef[] }
  | null;

const Chip = ({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="rounded-full border border-slate-200 bg-white px-3 py-1 text-sm whitespace-nowrap transition hover:bg-slate-50"
  >
    {children}
  </button>
);

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
  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex items-center gap-2 font-semibold text-slate-800">
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
    className="flex cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-slate-50"
  >
    <div className="flex items-center gap-2">
      {isOpen ? (
        <ChevronDown size={18} className="shrink-0" />
      ) : (
        <ChevronRight size={18} className="shrink-0" />
      )}
      {left}
    </div>
    {right != null && <div className="text-sm text-slate-500">{right}</div>}
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
}: {
  initialData: ExploreCourse[];
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

  const data = useMemo(() => {
    if (!query) return initialData;
    return initialData
      .map((c) => {
        const courseMatch =
          matchesQuery(c.name, query) || matchesQuery(c.pathLabel, query);
        const items = c.items
          .map((it) => ({
            ...it,
            codes: it.codes.filter((cd) => matchesQuery(cd, query)),
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

  const kCourse = (c: ExploreCourse) => `course:${c.id}`;
  const kGroup = (c: ExploreCourse, g: string) => `group:${c.id}:${g}`;

  const DetailsPanel = () => {
    if (!selection) {
      return (
        <p className="text-sm text-slate-500">{t("explore.emptySelect")}</p>
      );
    }
    if (selection.kind === "item") {
      const { course, item } = selection;
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{t("explore.selectedItem")}</p>
          <p className="text-xs text-slate-500">{course.pathLabel}</p>
          <p className="text-lg font-semibold text-slate-900">{course.name}</p>
          <p className="text-base font-medium text-slate-800">
            {labelOf(item)}
          </p>
          {item.oneDriveUrl && (
            <a
              href={item.oneDriveUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-block text-sm text-indigo-600 hover:underline"
            >
              {item.linkTitle || "OneDrive / file link"}
            </a>
          )}
          <div className="flex flex-wrap gap-2 pt-2">
            {item.codes.map((cd) => (
              <Chip key={cd} onClick={() => showCodeDetails(cd)}>
                <span className="inline-flex items-center gap-1">
                  <Hash size={14} />
                  {cd}
                </span>
              </Chip>
            ))}
          </div>
        </div>
      );
    }
    if (selection.kind === "code") {
      const { code, refs } = selection;
      return (
        <div className="space-y-3">
          <p className="text-sm text-slate-500">{t("explore.selectedCode")}</p>
          <p className="flex items-center gap-2 text-xl font-semibold text-slate-900">
            <Hash size={18} />
            {code}
          </p>
          <p className="text-sm text-slate-600">{t("explore.codeUsedIn")}</p>
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
                    <div className="font-medium text-slate-900">{r.course}</div>
                    <div className="text-xs text-slate-500">{r.pathLabel}</div>
                    <div className="text-sm text-slate-600">
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
    <div className="min-h-dvh bg-slate-100">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <h1 className="text-xl font-bold text-slate-900">
            {t("explore.title")}
          </h1>
          <div className="ml-auto flex items-center gap-2">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("explore.searchPlaceholder")}
                className="w-64 rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="hidden gap-1 rounded-xl border border-slate-200 bg-slate-50 p-0.5 sm:flex">
              <button
                type="button"
                onClick={() => setTab("tree")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab === "tree"
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-600"
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
                    ? "bg-white text-slate-900 shadow"
                    : "text-slate-600"
                }`}
              >
                <ListTree size={16} />
                {t("explore.tabCodes")}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-6 px-4 py-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {tab === "tree" && (
            <>
              {data.map((course) => {
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
                        className="text-sm text-slate-600 hover:underline"
                      >
                        {isCourseOpen
                          ? t("explore.collapse")
                          : t("explore.expand")}
                      </button>
                    }
                  >
                    {isCourseOpen && (
                      <div className="divide-y divide-slate-100">
                        {groupKeys.map((g) => {
                          const isGroupOpen = open[kGroup(course, g)] ?? true;
                          return (
                            <div key={g} className="py-2">
                              <Row
                                isOpen={isGroupOpen}
                                onClick={() =>
                                  setOpen((o) => ({
                                    ...o,
                                    [kGroup(course, g)]: !isGroupOpen,
                                  }))
                                }
                                left={
                                  <span className="font-medium text-slate-800">
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
                                      className="rounded-lg border border-slate-100 bg-slate-50/80 p-2"
                                    >
                                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                        <button
                                          type="button"
                                          className="font-medium text-slate-900 hover:underline"
                                          onClick={() =>
                                            showItemDetails(course, it)
                                          }
                                        >
                                          {labelOf(it)}
                                        </button>
                                        <div className="flex flex-wrap gap-2">
                                          {it.codes.map((cd) => (
                                            <Chip
                                              key={cd}
                                              onClick={() =>
                                                showCodeDetails(cd)
                                              }
                                            >
                                              <span className="inline-flex items-center gap-1">
                                                <Hash size={14} />
                                                {cd}
                                              </span>
                                            </Chip>
                                          ))}
                                        </div>
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
              {data.length === 0 && (
                <p className="text-slate-500">{t("explore.noResults")}</p>
              )}
            </>
          )}

          {tab === "codes" && (
            <Section
              title={t("explore.codeIndex")}
              icon={<ListTree size={18} />}
            >
              <div className="flex max-h-[70vh] flex-wrap content-start gap-2 overflow-y-auto">
                {allCodes.map((c) => (
                  <Chip key={c} onClick={() => {
                    setTab("tree");
                    showCodeDetails(c);
                  }}>
                    <span className="inline-flex items-center gap-1">
                      <Hash size={14} />
                      {c}
                    </span>
                  </Chip>
                ))}
                {allCodes.length === 0 && (
                  <p className="text-sm text-slate-500">{t("explore.noCodes")}</p>
                )}
              </div>
            </Section>
          )}
        </div>

        <Section
          title={t("explore.panelTitle")}
          icon={<ChevronRight size={18} />}
          right={
            selection && (
              <button
                type="button"
                className="text-sm text-slate-600 hover:underline"
                onClick={() => {
                  setSelection(null);
                  setParams({ courseId: null, itemId: null, code: null });
                }}
              >
                {t("explore.clear")}
              </button>
            )
          }
        >
          <DetailsPanel />
        </Section>
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-slate-500">
        {t("explore.footer")}
      </footer>
    </div>
  );
}
