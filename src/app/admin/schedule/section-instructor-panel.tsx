"use client";

import { useCallback, useEffect, useState } from "react";

type Sec = {
  id: string;
  label: string;
  courseOfferingId: string;
  courseOffering: {
    course: { name: string };
    term: {
      academicYear: { label: string };
      termSeason: { label: string };
    };
  };
};

type User = { id: string; email: string | null; name: string | null; role: string };

type SiRow = {
  userId: string;
  sectionId: string;
  user: { email: string | null };
  section: {
    id: string;
    label: string;
    courseOffering: {
      course: { name: string };
      term: {
        academicYear: { label: string };
        termSeason: { label: string };
      };
    };
  };
};

export function SectionInstructorPanel() {
  const [offerings, setOfferings] = useState<
    { id: string; course: { name: string }; term: Sec["courseOffering"]["term"] }[]
  >([]);
  const [sections, setSections] = useState<Sec[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [siRows, setSiRows] = useState<SiRow[]>([]);
  const [userId, setUserId] = useState("");
  const [sectionId, setSectionId] = useState("");

  const [newOffId, setNewOffId] = useState("");
  const [newSecLabel, setNewSecLabel] = useState("001");

  const load = useCallback(async () => {
    const o = await fetch("/api/admin/course-offerings", {
      cache: "no-store",
    }).then((r) => r.json());
    if (o?.length) {
      setOfferings(o);
      const secLists: Sec[][] = await Promise.all(
        o.map(
          (off: { id: string }) =>
            fetch(
              `/api/admin/sections?courseOfferingId=${encodeURIComponent(off.id)}`,
              { cache: "no-store" }
            ).then((r) => r.json()) as Promise<Sec[]>
        )
      );
      setSections(secLists.flat());
    } else {
      setOfferings([]);
      setSections([]);
    }
    const u = await fetch("/api/admin/users", { cache: "no-store" }).then(
      (r) => r.json()
    );
    setUsers(
      (u as User[]).filter((x) => x.role === "PROFESSOR" || x.role === "ADMIN")
    );
    const raw = await fetch("/api/admin/section-instructors", {
      cache: "no-store",
    }).then((r) => r.json());
    setSiRows(raw);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!newOffId || !newSecLabel.trim()) return;
          const r = await fetch("/api/admin/sections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              courseOfferingId: newOffId,
              label: newSecLabel.trim(),
            }),
          });
          if (r.ok) {
            setNewSecLabel("001");
            await load();
          }
        }}
      >
        <div>
          <span className="text-xs text-slate-500">Offering (course in term)</span>
          <select
            className="mt-0.5 block w-80 rounded border border-slate-200 px-2 py-1.5"
            value={newOffId}
            onChange={(e) => setNewOffId(e.target.value)}
            required
          >
            <option value="">Select</option>
            {offerings.map((o) => (
              <option key={o.id} value={o.id}>
                {o.term.academicYear.label} {o.term.termSeason.label} — {o.course.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-xs text-slate-500">Section label</span>
          <input
            className="mt-0.5 w-24 rounded border border-slate-200 px-2 py-1.5"
            value={newSecLabel}
            onChange={(e) => setNewSecLabel(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="rounded bg-slate-700 px-3 py-1.5 text-sm text-white"
        >
          Add section
        </button>
      </form>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!userId || !sectionId) return;
          const r = await fetch("/api/admin/section-instructors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, sectionId }),
          });
          if (r.ok) {
            setUserId("");
            await load();
          }
        }}
      >
        <div>
          <span className="text-xs text-slate-500">User</span>
          <select
            className="mt-0.5 block w-64 rounded border border-slate-200 px-2 py-1.5"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          >
            <option value="">Select</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email || u.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-xs text-slate-500">Section</span>
          <select
            className="mt-0.5 block w-80 max-w-full rounded border border-slate-200 px-2 py-1.5"
            value={sectionId}
            onChange={(e) => setSectionId(e.target.value)}
            required
          >
            <option value="">Select</option>
            {sections.map((s) => {
              const o = s.courseOffering;
              const p = `${o.term.academicYear.label} ${o.term.termSeason.label} ${o.course.name} §${s.label}`;
              return (
                <option key={s.id} value={s.id}>
                  {p}
                </option>
              );
            })}
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
        >
          Assign faculty
        </button>
      </form>

      <ul className="space-y-1 text-sm">
        {siRows.map((r) => (
          <li
            key={`${r.userId}-${r.sectionId}`}
            className="flex items-center justify-between gap-2 rounded border border-slate-200 bg-white px-2 py-1"
          >
            <span>
              {r.user.email} — {r.section.courseOffering.course.name} §
              {r.section.label} ({r.section.courseOffering.term.academicYear.label}{" "}
              {r.section.courseOffering.term.termSeason.label})
            </span>
            <button
              type="button"
              className="text-red-600"
              onClick={async () => {
                await fetch("/api/admin/section-instructors", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: r.userId,
                    sectionId: r.sectionId,
                  }),
                });
                await load();
              }}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
