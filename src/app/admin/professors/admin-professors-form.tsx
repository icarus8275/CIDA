"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

type User = { id: string; email: string | null; name: string | null };
type Course = { id: string; name: string };
type Row = {
  userId: string;
  courseId: string;
  user: User;
  course: Course;
};

export function AdminProfessorsForm() {
  const { t } = useI18n();
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [userId, setUserId] = useState("");
  const [courseId, setCourseId] = useState("");

  const load = useCallback(async () => {
    const [u, c, a] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/courses", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/admin/course-professors", { cache: "no-store" }).then((r) =>
        r.json()
      ),
    ]);
    setUsers(u);
    setCourses(c);
    setRows(a);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <form
        className="flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-white p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!userId || !courseId) return;
          const r = await fetch("/api/admin/course-professors", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, courseId }),
          });
          if (r.ok) {
            setUserId("");
            setCourseId("");
            await load();
          }
        }}
      >
        <div>
          <span className="text-xs text-slate-500">
            {t("admin.profFaculty")}
          </span>
          <select
            className="mt-0.5 block w-64 max-w-full rounded border border-slate-200 px-2 py-1.5"
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
          >
            <option value="">{t("admin.profSelect")}</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email || u.id}
              </option>
            ))}
          </select>
        </div>
        <div>
          <span className="text-xs text-slate-500">
            {t("admin.profCourse")}
          </span>
          <select
            className="mt-0.5 block w-64 max-w-full rounded border border-slate-200 px-2 py-1.5"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
            required
          >
            <option value="">{t("admin.profSelect")}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          className="rounded bg-slate-900 px-3 py-1.5 text-sm text-white"
        >
          {t("admin.profAssign")}
        </button>
      </form>

      <p className="text-xs text-slate-500">
        {t("admin.profNote")}
      </p>

      <ul className="space-y-1">
        {rows.map((r) => (
          <li
            key={`${r.userId}-${r.courseId}`}
            className="flex items-center justify-between rounded border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <span>
              {r.user.email} → {r.course.name}
            </span>
            <button
              type="button"
              className="text-red-600"
              onClick={async () => {
                await fetch("/api/admin/course-professors", {
                  method: "DELETE",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    userId: r.userId,
                    courseId: r.courseId,
                  }),
                });
                await load();
              }}
            >
              {t("admin.profRemove")}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
