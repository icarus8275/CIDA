"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
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
import { listUserLabel } from "@/lib/user-display";
import { useI18n } from "@/components/locale/locale-provider";
import { OnSiteBadge } from "@/components/on-site-badge";
import {
  LinkHealthDot,
  useLinkHealthMap,
  type LinkHealthStatus,
} from "@/components/link-health-dot";
import { CodesReadonlyGrouped } from "@/app/teach/section/[sectionId]/section-codes-shared";

type Selection =
  | { kind: "item"; course: ExploreCourse; item: ExploreCourse["items"][0] }
  | { kind: "course"; course: ExploreCourse }
  | { kind: "code"; code: string; refs: CodeRef[] }
  | null;

const Section = ({
  title,
  icon,
  children,
  right,
  badge,
  onTitleClick,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  right?: React.ReactNode;
  badge?: React.ReactNode;
  onTitleClick?: () => void;
}) => (
  <div className="glass p-4">
    <div className="mb-3 flex items-center justify-between gap-3">
      <div className="flex min-w-0 items-center gap-2 font-semibold text-app-fg">
        {icon}
        {onTitleClick ? (
          <button
            type="button"
            onClick={onTitleClick}
            className="min-w-0 !cursor-pointer truncate text-left transition-colors hover:text-app-link hover:underline"
          >
            {title}
          </button>
        ) : (
          <span className="min-w-0 truncate">{title}</span>
        )}
        {badge}
      </div>
      {right}
    </div>
    {children}
  </div>
);

function courseLinkUrls(course: ExploreCourse): string[] {
  const urls: string[] = [];
  if (course.syllabusUrl?.trim()) urls.push(course.syllabusUrl.trim());
  for (const it of course.items) {
    if (it.oneDriveUrl?.trim()) urls.push(it.oneDriveUrl.trim());
  }
  return urls;
}

function worstLinkStatus(
  urls: string[],
  map: Record<string, LinkHealthStatus>
): LinkHealthStatus | null {
  let sawUnknown = false;
  let sawOk = false;
  for (const raw of urls) {
    const s = map[raw.trim()];
    if (s === "dead") return "dead";
    if (s === "unknown") sawUnknown = true;
    if (s === "ok") sawOk = true;
  }
  if (sawUnknown) return "unknown";
  if (sawOk) return "ok";
  return null;
}

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
    className="group flex !cursor-pointer select-none items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-app-card/55"
  >
    <div className="flex items-center gap-2">
      {isOpen ? (
        <ChevronDown size={18} className="shrink-0 text-app-muted/90" />
      ) : (
        <ChevronRight size={18} className="shrink-0 text-app-muted/90" />
      )}
      {left}
    </div>
    {right != null && <div className="text-sm text-app-muted/90">{right}</div>}
  </div>
);

function labelOf(item: ExploreCourse["items"][0]) {
  if (item.title?.trim()) return item.title.trim();
  return `${item.typeLabel} ${item.number}`;
}

function courseHeading(course: ExploreCourse) {
  const n = course.name.trim();
  const cut = n.lastIndexOf(" — ");
  return cut > 0 ? n.slice(0, cut) : n;
}

function DetailEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-app-primary/75">
      {children}
    </p>
  );
}

function DetailTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="mt-1 text-base font-semibold leading-snug tracking-tight text-app-fg">
      {children}
    </h3>
  );
}

function DetailMeta({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-1 text-xs italic leading-relaxed text-app-muted/75">
      {children}
    </p>
  );
}

function DetailField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-app-border/55 pt-3">
      <p className="mb-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-app-muted/70">
        {label}
      </p>
      <div className="text-sm leading-relaxed text-app-fg">{children}</div>
    </div>
  );
}

function DetailEmpty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm italic text-app-muted/65">{children}</p>;
}

function facultyNames(
  instructors: { name: string | null; email: string | null }[] | undefined
) {
  return (instructors ?? [])
    .map((i) => i.name?.trim() || i.email?.trim() || "")
    .filter(Boolean);
}

function DetailFaculty({
  instructors,
  empty,
}: {
  instructors: { name: string | null; email: string | null }[] | undefined;
  empty: string;
}) {
  if (!instructors?.length) {
    return <DetailEmpty>{empty}</DetailEmpty>;
  }
  return (
    <ul className="space-y-1">
      {instructors.map((i, idx) => {
        const name = i.name?.trim();
        const email = i.email?.trim();
        return (
          <li key={idx}>
            <span className="font-medium text-app-fg">{name || email || "—"}</span>
            {name && email ? (
              <span className="text-app-muted/70"> · {email}</span>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
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
  // Admin catalog tooltips for code values (UPPERCASE key); Codes tab.
  codeLabels?: Record<string, string | null>;
  accountLine?: string | null;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [tab, setTab] = useState<Tab>("tree");
  const [selection, setSelection] = useState<Selection>(null);
  const detailsRef = useRef<HTMLElement>(null);
  const { t } = useI18n();

  useEffect(() => {
    if (!selection) return;
    detailsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [selection]);

  const allLinkUrls = useMemo(() => {
    const urls: string[] = [];
    for (const c of initialData) urls.push(...courseLinkUrls(c));
    return urls;
  }, [initialData]);
  const { map: linkHealth } = useLinkHealthMap(allLinkUrls);

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
        const instrQ = (c.instructors ?? [])
          .map((i) => listUserLabel(i.name, i.email))
          .join(" ");
        const courseMatch =
          matchesQuery(c.name, query) ||
          matchesQuery(c.pathLabel, query) ||
          matchesQuery(instrQ, query);
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

  const showCourseDetails = (course: ExploreCourse) => {
    setSelection({ kind: "course", course });
    setParams({ courseId: course.id, itemId: null, code: null });
  };

  const showCodeDetails = (code: string) => {
    const c = code.toUpperCase();
    setSelection({
      kind: "code",
      code: c,
      refs: codeIndex.get(c) || [],
    });
    setParams({ code: c, itemId: null, courseId: null });
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
        return;
      }
      if (course) {
        setSelection({ kind: "course", course });
      }
      return;
    }
    if (cid) {
      const course = initialData.find((c) => c.id === cid);
      if (course) {
        setSelection({ kind: "course", course });
      }
    }
  }, [searchParams, initialData, codeIndex]);

  const kTerm = (termId: string) => `term:${termId}`;
  const kCourse = (c: ExploreCourse) => `course:${c.id}`;
  const kGroup = (c: ExploreCourse, g: string) => `group:${c.id}:${g}`;

  const DetailsPanel = () => {
    if (!selection) {
      return (
        <p className="py-6 text-center text-sm italic leading-relaxed text-app-muted/65">
          {t("explore.emptySelect")}
        </p>
      );
    }
    if (selection.kind === "course") {
      const { course } = selection;
      return (
        <div>
          <DetailEyebrow>{t("explore.selectedCourse")}</DetailEyebrow>
          <DetailTitle>{courseHeading(course)}</DetailTitle>
          <DetailMeta>{course.pathLabel}</DetailMeta>
          <div className="mt-4">
            <DetailField label={t("explore.itemDetailInstructors")}>
              <DetailFaculty
                instructors={course.instructors}
                empty={t("explore.itemDetailNoInstructors")}
              />
            </DetailField>
            <DetailField
              label={
                course.linkOnly
                  ? course.syllabusLinkTitle || t("explore.linkNameDefault")
                  : t("explore.courseDetailSyllabus")
              }
            >
              {course.syllabusUrl ? (
                <div className="space-y-0.5">
                  <span className="inline-flex items-center gap-2">
                    <a
                      href={course.syllabusUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-app-link hover:underline"
                    >
                      {course.syllabusLinkTitle ||
                        (course.linkOnly
                          ? t("explore.linkNameDefault")
                          : t("explore.syllabusLinkDefault"))}
                    </a>
                    <LinkHealthDot
                      status={linkHealth[course.syllabusUrl.trim()] ?? "checking"}
                    />
                  </span>
                  {course.linkOnly && (
                    <p className="break-all text-xs text-app-muted/70">
                      {course.syllabusUrl}
                    </p>
                  )}
                </div>
              ) : (
                <DetailEmpty>
                  {course.linkOnly
                    ? t("explore.linkOnlyEmpty")
                    : t("explore.courseDetailNoSyllabus")}
                </DetailEmpty>
              )}
            </DetailField>
          </div>
        </div>
      );
    }
    if (selection.kind === "item") {
      const { course, item } = selection;
      return (
        <div>
          <DetailEyebrow>{t("explore.selectedItem")}</DetailEyebrow>
          <DetailTitle>{labelOf(item)}</DetailTitle>
          <DetailMeta>{course.pathLabel}</DetailMeta>
          <div className="mt-4">
            <DetailField label={t("explore.itemDetailInstructors")}>
              <DetailFaculty
                instructors={course.instructors}
                empty={t("explore.itemDetailNoInstructors")}
              />
            </DetailField>
            <DetailField label={t("explore.itemDetailType")}>
              <span className="inline-flex rounded-md bg-app-primary/10 px-2 py-0.5 text-xs font-semibold text-app-primary">
                {item.typeLabel} {item.number}
              </span>
            </DetailField>
            <DetailField label={t("explore.itemDetailFile")}>
              {!item.onSiteDisplay && !item.oneDriveUrl ? (
                <DetailEmpty>{t("explore.itemDetailNoLink")}</DetailEmpty>
              ) : (
                <div className="space-y-1.5">
                  {item.onSiteDisplay && (
                    <OnSiteBadge label={t("teach.onSiteDisplay")} />
                  )}
                  {item.oneDriveUrl && (
                    <span className="inline-flex items-center gap-2">
                      <a
                        href={item.oneDriveUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-app-link hover:underline"
                      >
                        {item.linkTitle || t("explore.fileLinkDefault")}
                      </a>
                      <LinkHealthDot
                        status={
                          linkHealth[item.oneDriveUrl.trim()] ?? "checking"
                        }
                      />
                    </span>
                  )}
                </div>
              )}
            </DetailField>
            <DetailField label={t("explore.itemDetailCodes")}>
              {item.codes.length === 0 ? (
                <DetailEmpty>—</DetailEmpty>
              ) : (
                <CodesReadonlyGrouped
                  oneLine
                  codes={item.codes}
                  onCodeClick={(v) => showCodeDetails(v)}
                  idPrefix={`panel-${item.id}`}
                />
              )}
            </DetailField>
          </div>
        </div>
      );
    }
    if (selection.kind === "code") {
      const { code, refs } = selection;
      return (
        <div>
          <DetailEyebrow>{t("explore.selectedCode")}</DetailEyebrow>
          <DetailTitle>
            <span className="inline-flex items-center gap-1.5 font-mono tracking-tight">
              <Hash size={16} className="text-app-primary/80" aria-hidden />
              {code}
            </span>
          </DetailTitle>
          {codeLabels[code] != null && codeLabels[code] !== "" && (
            <DetailMeta>{codeLabels[code]}</DetailMeta>
          )}
          <div className="mt-4">
            <DetailField label={t("explore.codeUsedIn")}>
              {refs.length === 0 ? (
                <DetailEmpty>{t("explore.noMatch")}</DetailEmpty>
              ) : (
                <ul className="space-y-2">
                  {refs.map((r) => {
                    const crs = initialData.find((c) => c.id === r.courseId);
                    const itm = crs?.items.find((i) => i.id === r.itemId);
                    const itemLabel = `${r.type} ${r.number}`;
                    return (
                      <li key={`${r.itemId}-${r.code}`}>
                        <button
                          type="button"
                          className="group w-full min-w-0 !cursor-pointer rounded-lg border border-app-border/70 bg-app-card/40 px-2.5 py-2 text-left transition hover:border-app-primary/35 hover:bg-app-card/65 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-app-link/30"
                          onClick={() => {
                            if (crs && itm) {
                              showItemDetails(crs, itm);
                              setQuery("");
                            }
                          }}
                        >
                          <span className="inline-flex rounded-md bg-app-primary/10 px-1.5 py-0.5 text-[11px] font-semibold text-app-primary">
                            {itemLabel}
                          </span>
                          <p className="mt-1.5 text-sm font-medium text-app-fg transition-colors group-hover:text-app-link">
                            {r.course}
                          </p>
                          <p className="mt-0.5 text-xs italic text-app-muted/70">
                            {r.pathLabel}
                          </p>
                          {r.instructorsLabel ? (
                            <p className="mt-0.5 text-xs text-app-muted/70">
                              {r.instructorsLabel}
                            </p>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </DetailField>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="min-h-dvh">
      {/* Not sticky: a sticky sub-toolbar was overlapping the tree when scrolling. */}
      <header className="relative z-10 border-b border-app-border/50 bg-app-bg/95 backdrop-blur supports-[backdrop-filter]:bg-app-bg/80">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <h1 className="text-xl font-bold text-app-fg">
            {t("explore.title")}
          </h1>
          {accountLine && (
            <span
              className="max-w-[min(18rem,50vw)] truncate text-xs text-app-muted/90 sm:text-sm"
              title={accountLine}
            >
              {accountLine}
            </span>
          )}
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
            <div className="relative">
              <Search
                size={16}
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-app-muted/90"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("explore.searchPlaceholder")}
                className="input-glass w-64 rounded-xl py-2 pl-9 pr-3 text-sm"
              />
            </div>
            <div className="flex gap-1 rounded-xl border border-app-border/80 bg-app-card/55 p-0.5 backdrop-blur-sm">
              <button
                type="button"
                onClick={() => setTab("tree")}
                className={`rounded-lg px-3 py-1.5 text-sm font-medium ${
                  tab === "tree"
                    ? "bg-app-primary/12 text-app-primary shadow-sm"
                    : "text-app-muted/90 hover:text-app-fg"
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
                    ? "bg-app-primary/12 text-app-primary shadow-sm"
                    : "text-app-muted/90 hover:text-app-fg"
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
                      <div className="flex items-center justify-between gap-2 border-b border-app-border/70 px-4 py-3">
                        <div className="flex min-w-0 items-center gap-2 font-semibold text-app-fg">
                          <CalendarRange
                            size={20}
                            className="shrink-0 text-app-link/90"
                            aria-hidden
                          />
                          <span className="truncate">{tg.termLabel}</span>
                        </div>
                        <div className="flex shrink-0 flex-wrap items-center justify-end gap-x-3 gap-y-1">
                          {isTermOpen && tg.courses.length > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const anyOpen = tg.courses.some(
                                  (c) => open[kCourse(c)] ?? true
                                );
                                setOpen((o) => {
                                  const next = { ...o };
                                  for (const c of tg.courses) {
                                    next[kCourse(c)] = !anyOpen;
                                  }
                                  return next;
                                });
                              }}
                              className="cursor-pointer text-sm text-app-muted/90 hover:text-app-link hover:underline"
                            >
                              {tg.courses.some((c) => open[kCourse(c)] ?? true)
                                ? t("explore.collapseAllCourses")
                                : t("explore.expandAllCourses")}
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setOpen((o) => ({
                                ...o,
                                [kTerm(tg.termId)]: !isTermOpen,
                              }))
                            }
                            className="cursor-pointer text-sm text-app-muted/90 hover:text-app-link hover:underline"
                          >
                            {isTermOpen
                              ? t("explore.collapse")
                              : t("explore.expand")}
                          </button>
                        </div>
                      </div>
                      {isTermOpen && (
                        <div className="space-y-4 p-4 pt-2">
                          {tg.courses.map((course) => {
                            const isCourseOpen = open[kCourse(course)] ?? true;
                            const groups = groupByType(course.items);
                            const groupKeys = Object.keys(groups).sort();
                            const courseStatus = worstLinkStatus(
                              courseLinkUrls(course),
                              linkHealth
                            );
                            return (
                              <Section
                                key={course.id}
                                title={course.pathLabel}
                                icon={<BookOpen size={18} />}
                                badge={
                                  courseStatus === "dead" ? (
                                    <LinkHealthDot status="dead" />
                                  ) : null
                                }
                                onTitleClick={() => showCourseDetails(course)}
                                right={
                                  course.linkOnly ? undefined : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpen((o) => ({
                                        ...o,
                                        [kCourse(course)]: !isCourseOpen,
                                      }))
                                    }
                                    className="cursor-pointer text-sm text-app-muted/90 hover:text-app-link hover:underline"
                                  >
                                    {isCourseOpen
                                      ? t("explore.collapse")
                                      : t("explore.expand")}
                                  </button>
                                  )
                                }
                              >
                                {course.linkOnly ? (
                                  <button
                                    type="button"
                                    className="group w-full !cursor-pointer rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-app-card/55"
                                    onClick={() => showCourseDetails(course)}
                                  >
                                    <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-app-muted/70">
                                      {t("explore.itemDetailInstructors")}
                                    </p>
                                    {facultyNames(course.instructors).length > 0 ? (
                                      <p className="mt-1 text-sm font-medium text-app-fg transition-colors group-hover:text-app-link">
                                        {facultyNames(course.instructors).join(" · ")}
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-sm italic text-app-muted/65">
                                        {t("explore.itemDetailNoInstructors")}
                                      </p>
                                    )}
                                    <p className="mt-3 text-[11px] font-medium uppercase tracking-[0.12em] text-app-muted/70">
                                      {course.syllabusLinkTitle ||
                                        t("explore.linkNameDefault")}
                                    </p>
                                    {course.syllabusUrl ? (
                                      <span className="mt-1 inline-flex items-center gap-2 text-sm font-medium text-app-link">
                                        {course.syllabusLinkTitle ||
                                          t("explore.linkNameDefault")}
                                        <LinkHealthDot
                                          status={
                                            linkHealth[course.syllabusUrl.trim()] ??
                                            "checking"
                                          }
                                        />
                                      </span>
                                    ) : (
                                      <p className="mt-1 text-sm italic text-app-muted/65">
                                        {t("explore.linkOnlyEmpty")}
                                      </p>
                                    )}
                                  </button>
                                ) : (
                                isCourseOpen && (
                                  <div className="divide-y divide-app-border/70">
                                    {(course.syllabusUrl || course.linkOnly) && (
                                      <div className="py-2">
                                        <button
                                          type="button"
                                          className="group flex w-full !cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-app-card/55"
                                          onClick={() => showCourseDetails(course)}
                                        >
                                          <span className="font-medium text-app-fg/92 transition-colors group-hover:text-app-link">
                                            {course.linkOnly
                                              ? course.syllabusLinkTitle ||
                                                t("explore.linkNameDefault")
                                              : t("explore.treeSyllabus")}
                                          </span>
                                          {course.syllabusUrl ? (
                                            <LinkHealthDot
                                              status={
                                                linkHealth[course.syllabusUrl.trim()] ??
                                                "checking"
                                              }
                                            />
                                          ) : null}
                                        </button>
                                      </div>
                                    )}
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
                                              <span className="font-medium text-app-fg/92 transition-colors group-hover:text-app-link">
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
                                                  className="group !cursor-pointer rounded-lg border border-app-border/70 bg-app-card/55 p-2 text-left outline-none ring-app-link/30 transition hover:border-app-link/35 hover:bg-app-card/75 focus-visible:ring-2"
                                                >
                                                  <div className="flex min-w-0 flex-col gap-1.5">
                                                    <span className="flex flex-wrap items-center gap-2">
                                                      <span className="font-medium text-app-fg transition-colors group-hover:text-app-link">
                                                        {labelOf(it)}
                                                      </span>
                                                      {it.oneDriveUrl ? (
                                                        <LinkHealthDot
                                                          status={
                                                            linkHealth[it.oneDriveUrl.trim()] ??
                                                            "checking"
                                                          }
                                                        />
                                                      ) : null}
                                                      {it.onSiteDisplay && (
                                                        <OnSiteBadge
                                                          label={t("teach.onSiteDisplay")}
                                                          size="sm"
                                                        />
                                                      )}
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
                                                          oneLine
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
                                )
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
                  <p className="text-app-muted/90">{t("explore.noResults")}</p>
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
                      oneLine
                      codes={codeIndexEntries}
                      onCodeClick={(v) => {
                        setTab("tree");
                        showCodeDetails(v);
                      }}
                      idPrefix="code-index"
                    />
                  ) : (
                    <p className="text-sm text-app-muted/90">
                      {t("explore.noCodes")}
                    </p>
                  )}
                </div>
              </Section>
            )}
          </div>

          <aside
            ref={detailsRef}
            className="z-10 w-full min-w-0 shrink-0 overflow-y-auto lg:sticky lg:top-20 lg:max-h-[min(100vh,56rem)] lg:max-w-sm lg:self-start"
          >
            <div className="glass p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-app-muted/65">
                  {t("explore.panelTitle")}
                </p>
                {selection && (
                  <button
                    type="button"
                    className="cursor-pointer text-xs font-medium text-app-muted/75 hover:text-app-link hover:underline"
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
                )}
              </div>
              <DetailsPanel />
            </div>
          </aside>
        </div>
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-10 text-xs text-app-muted/70">
        {t("explore.footer")}
      </footer>
    </div>
  );
}
