"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { X } from "lucide-react";
import { formatTermForDisplay } from "@/lib/term-display";
import { useI18n } from "@/components/locale/locale-provider";

const POOL = "__pool__";
const D_TERM = (id: string) => `term:${id}`;
const D_OFFER = (id: string) => `offer:${id}`;
const D_CAT = (id: string) => `cat:${id}`;

type TermRow = {
  id: string;
  sortOrder: number;
  academicYear: { label: string; startYear: number };
  termSeason: { key: string; label: string };
};

type OffRow = {
  id: string;
  sortOrder: number;
  courseId: string;
  course: { name: string };
  termId: string;
};

type CourseRow = { id: string; name: string; sortOrder: number };

function parseDropTarget(
  overId: string,
  offers: OffRow[]
): { kind: "term" | "pool"; termId: string } | null {
  if (overId.startsWith("term:")) {
    const rest = overId.slice(5);
    if (rest === POOL) {
      return { kind: "pool", termId: POOL };
    }
    return { kind: "term", termId: rest };
  }
  if (overId.startsWith("offer:")) {
    const oid = overId.slice(6);
    const t = offers.find((x) => x.id === oid)?.termId;
    return t ? { kind: "term", termId: t } : null;
  }
  return null;
}

/** When dragging an offering, landing on a catalog card still means "unscheduled" pool. */
function resolveDropTarget(
  overId: string,
  activeId: string,
  offers: OffRow[]
): { kind: "term" | "pool"; termId: string } | null {
  if (overId.startsWith("cat:") && activeId.startsWith("offer:")) {
    return { kind: "pool", termId: POOL };
  }
  return parseDropTarget(overId, offers);
}

/** Full course catalog as a drag palette. Same course can be added to many terms; each term is a separate offering (sections, items, faculty). */
function CourseCatalogPool({
  courseIds,
  courseById,
}: {
  courseIds: string[];
  courseById: Map<string, CourseRow>;
}) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: D_TERM(POOL) });
  return (
    <div
      ref={setNodeRef}
      className={`group/pool glass flex w-full flex-col gap-2 p-3 ${
        isOver ? "ring-1 ring-cyan-400/40" : ""
      }`}
    >
      <h3 className="text-sm font-semibold text-slate-100">
        {t("admin.schedUnscheduled")}
      </h3>
      <p className="text-xs text-slate-400">
        {t("admin.schedUnscheduledHelp")}
      </p>
      <div className="mt-1 min-h-24">
        {courseIds.length === 0 && (
          <p className="text-xs text-slate-500">
            {t("admin.schedNoCourses")}
          </p>
        )}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {courseIds.map((cid) => {
            const c = courseById.get(cid);
            if (!c) return null;
            return <CatalogDraggable key={cid} course={c} />;
          })}
        </div>
      </div>
    </div>
  );
}

function CatalogDraggable({ course }: { course: CourseRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: D_CAT(course.id) });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
      className="glass group/cat relative min-h-[2.75rem] cursor-grab p-2 pr-8 text-sm active:cursor-grabbing"
      {...listeners}
      {...attributes}
    >
      <div className="font-medium text-slate-100">{course.name}</div>
    </div>
  );
}

function OfferingCard({
  off,
  onRemove,
}: {
  off: OffRow;
  onRemove: (id: string) => void;
}) {
  const { t } = useI18n();
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({ id: D_OFFER(off.id) });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
      className="group/offer glass relative cursor-grab p-2 pr-8 text-sm active:cursor-grabbing"
      {...listeners}
      {...attributes}
    >
      <div className="font-medium text-slate-100">{off.course.name}</div>
      <button
        type="button"
        aria-label={t("admin.schedARemove")}
        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-md text-rose-300/90 opacity-0 transition hover:bg-rose-500/20 group-hover/offer:opacity-100"
        onPointerDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          onRemove(off.id);
        }}
      >
        <X className="h-3.5 w-3.5" strokeWidth={2.5} />
      </button>
    </div>
  );
}

function TermColumn({
  term,
  offerings,
  onDeleteTerm,
  onRemoveOffering,
}: {
  term: TermRow;
  offerings: OffRow[];
  onDeleteTerm: (id: string) => void;
  onRemoveOffering: (id: string) => void;
}) {
  const { t } = useI18n();
  const { setNodeRef, isOver } = useDroppable({ id: D_TERM(term.id) });
  return (
    <div
      ref={setNodeRef}
      className={`group/term glass relative flex min-h-56 min-w-[200px] flex-1 flex-col gap-2 p-2 ${
        isOver
          ? "border-cyan-400/40 bg-cyan-500/10 ring-1 ring-cyan-400/30"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-1 pr-1">
        <h3 className="text-sm font-semibold leading-tight text-slate-100">
          {formatTermForDisplay(term)}
        </h3>
        <button
          type="button"
          aria-label={t("admin.schedTDelete")}
          title={t("admin.schedTDeleteTitle")}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-rose-300/90 opacity-0 transition hover:bg-rose-500/20 group-hover/term:opacity-100"
          onClick={() => onDeleteTerm(term.id)}
        >
          <X className="h-3.5 w-3.5" strokeWidth={2.5} />
        </button>
      </div>
      <div className="flex flex-col gap-2">
        {offerings.map((o) => (
          <OfferingCard
            key={o.id}
            off={o}
            onRemove={onRemoveOffering}
          />
        ))}
      </div>
    </div>
  );
}

export function ScheduleBoard() {
  const { t } = useI18n();
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [offers, setOffers] = useState<OffRow[]>([]);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [tRes, oRes, cRes] = await Promise.all([
      fetch("/api/admin/terms", { cache: "no-store" }),
      fetch("/api/admin/course-offerings", { cache: "no-store" }),
      fetch("/api/admin/courses", { cache: "no-store" }),
    ]);
    if (tRes.ok) {
      setTerms(await tRes.json());
    }
    if (oRes.ok) {
      setOffers(await oRes.json());
    }
    if (cRes.ok) {
      setCourses(await cRes.json());
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onRefresh = () => {
      void load();
    };
    window.addEventListener("schedule-refresh", onRefresh);
    return () => window.removeEventListener("schedule-refresh", onRefresh);
  }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const courseById = new Map(courses.map((c) => [c.id, c]));
  /** All catalog courses always shown in the palette; each (course, term) creates a distinct offering. */
  const catalogCourseIds = [...courses]
    .sort((a, b) => {
      return (
        a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)
      );
    })
    .map((c) => c.id);

  const byTerm = (tid: string) =>
    offers
      .filter((o) => o.termId === tid)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const removeOffering = useCallback(async (offeringId: string) => {
    const r = await fetch(
      `/api/admin/course-offerings?id=${encodeURIComponent(offeringId)}`,
      { method: "DELETE" }
    );
    if (r.ok) {
      window.dispatchEvent(new Event("schedule-refresh"));
    }
  }, []);

  const deleteTerm = useCallback(async (termId: string) => {
    if (!confirm(t("admin.schedTDeleteConfirm"))) {
      return;
    }
    const r = await fetch(
      `/api/admin/terms?id=${encodeURIComponent(termId)}`,
      { method: "DELETE" }
    );
    if (r.ok) {
      window.dispatchEvent(new Event("schedule-refresh"));
    }
  }, [t]);

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const overId = String(over.id);
    const activeId = String(active.id);
    const target = resolveDropTarget(overId, activeId, offers);
    if (!target) return;

    if (activeId.startsWith("cat:")) {
      const courseId = activeId.slice(4);
      if (target.kind === "pool") return;
      const r = await fetch("/api/admin/course-offerings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId, termId: target.termId }),
      });
      if (r.status === 409) {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        alert(j.message || t("admin.schedAlrtDup"));
        return;
      }
      if (r.ok) {
        window.dispatchEvent(new Event("schedule-refresh"));
      } else {
        const j = (await r.json().catch(() => ({}))) as { message?: string };
        alert(j.message || t("admin.schedAlrtFail"));
      }
      return;
    }

    if (activeId.startsWith("offer:")) {
      const offerId = activeId.slice(6);
      const o = offers.find((x) => x.id === offerId);
      if (!o) return;
      if (target.kind === "pool") {
        await removeOffering(offerId);
        return;
      }
      if (o.termId === target.termId) return;

      const sourceTermId = o.termId;
      const sourceIds = offers
        .filter((x) => x.termId === sourceTermId && x.id !== offerId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((x) => x.id);
      const targetIds = offers
        .filter((x) => x.termId === target.termId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((x) => x.id);
      const newTarget = [...targetIds, offerId];

      const r1 = await fetch("/api/admin/course-offerings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termId: sourceTermId, offeringIds: sourceIds }),
      });
      const r2 = await fetch("/api/admin/course-offerings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ termId: target.termId, offeringIds: newTarget }),
      });
      if (r1.ok && r2.ok) {
        window.dispatchEvent(new Event("schedule-refresh"));
      }
    }
  };

  if (loading) {
    return <p className="text-sm text-slate-400">{t("teach.loading")}</p>;
  }

  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={pointerWithin}
        onDragEnd={onDragEnd}
      >
        <div className="flex w-full flex-col gap-4">
          <CourseCatalogPool
            courseIds={catalogCourseIds}
            courseById={courseById}
          />
          <div className="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
            {terms.map((term) => (
              <TermColumn
                key={term.id}
                term={term}
                offerings={byTerm(term.id)}
                onDeleteTerm={deleteTerm}
                onRemoveOffering={removeOffering}
              />
            ))}
          </div>
        </div>
      </DndContext>
      {terms.length === 0 && (
        <p className="text-sm text-amber-200/80">
          {t("admin.schedNoTerms")}
        </p>
      )}
    </div>
  );
}
