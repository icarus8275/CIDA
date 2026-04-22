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

type TermRow = {
  id: string;
  sortOrder: number;
  academicYear: { label: string };
  termSeason: { label: string };
};

type OffRow = {
  id: string;
  sortOrder: number;
  course: { name: string };
  termId: string;
};

function termLabel(t: TermRow) {
  return `${t.academicYear.label} · ${t.termSeason.label}`;
}

function DraggableCard({ off }: { off: OffRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: off.id,
    });
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
      className="rounded border border-slate-200 bg-white p-2 text-sm shadow-sm"
      {...listeners}
      {...attributes}
    >
      <div className="font-medium text-slate-800">{off.course.name}</div>
    </div>
  );
}

function TermColumn({ term, offerings }: { term: TermRow; offerings: OffRow[] }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `term:${term.id}`,
  });
  return (
    <div
      ref={setNodeRef}
      className={`flex min-h-56 flex-1 min-w-[200px] flex-col gap-2 rounded border p-2 ${
        isOver ? "bg-indigo-50/80 border-indigo-300" : "border-slate-200 bg-slate-50"
      }`}
    >
      <h3 className="text-sm font-semibold text-slate-800">
        {termLabel(term)}
      </h3>
      <div className="flex flex-col gap-2">
        {offerings.map((o) => (
          <DraggableCard key={o.id} off={o} />
        ))}
      </div>
    </div>
  );
}

export function ScheduleBoard() {
  const [terms, setTerms] = useState<TermRow[]>([]);
  const [offers, setOffers] = useState<OffRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [tRes, oRes] = await Promise.all([
      fetch("/api/admin/terms", { cache: "no-store" }),
      fetch("/api/admin/course-offerings", { cache: "no-store" }),
    ]);
    if (tRes.ok) setTerms(await tRes.json());
    if (oRes.ok) setOffers(await oRes.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const byTerm = (tid: string) =>
    offers
      .filter((o) => o.termId === tid)
      .sort((a, b) => a.sortOrder - b.sortOrder);

  const resolveTargetTermId = (overId: string, list: OffRow[]) => {
    if (overId.startsWith("term:")) {
      return overId.slice(5);
    }
    const hit = list.find((x) => x.id === overId);
    return hit?.termId ?? null;
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const offerId = String(active.id);
    const o = offers.find((x) => x.id === offerId);
    if (!o) return;
    const targetTermId = resolveTargetTermId(String(over.id), offers);
    if (!targetTermId) return;
    if (o.termId === targetTermId) return;

    const sourceTermId = o.termId;
    const sourceIds = offers
      .filter((x) => x.termId === sourceTermId && x.id !== offerId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((x) => x.id);
    const targetIds = offers
      .filter((x) => x.termId === targetTermId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((x) => x.id);
    const newTarget = [...targetIds, offerId];

    await fetch("/api/admin/course-offerings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termId: sourceTermId, offeringIds: sourceIds }),
    });
    await fetch("/api/admin/course-offerings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ termId: targetTermId, offeringIds: newTarget }),
    });
    await load();
  };

  if (loading) {
    return <p className="text-sm text-slate-600">Loading…</p>;
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragEnd={onDragEnd}
    >
      <div className="flex flex-wrap gap-3">
        {terms.map((term) => (
          <TermColumn key={term.id} term={term} offerings={byTerm(term.id)} />
        ))}
      </div>
    </DndContext>
  );
}
