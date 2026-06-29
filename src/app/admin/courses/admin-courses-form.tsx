"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";
import {
  CodePicker,
  buildOptions,
  type CatalogRow,
  type CodeLink,
} from "@/app/teach/section/[sectionId]/section-codes-shared";

type Course = {
  id: string;
  name: string;
  sortOrder: number;
  courseCodes: CodeLink[];
};

const DEBOUNCE_MS = 500;

function CourseCodesEditor({
  course,
  catalog,
  onSaved,
}: {
  course: Course;
  catalog: CatalogRow[];
  onSaved: () => Promise<void>;
}) {
  const { t } = useI18n();
  const courseRef = useRef(course);
  courseRef.current = course;

  const [codeIds, setCodeIds] = useState(() =>
    course.courseCodes.map((c) => c.codeNumberId)
  );
  const [filter, setFilter] = useState("");

  useEffect(() => {
    setCodeIds(course.courseCodes.map((c) => c.codeNumberId));
  }, [course.id]);

  useEffect(() => {
    const server = [...courseRef.current.courseCodes.map((c) => c.codeNumberId)]
      .sort()
      .join("\0");
    const local = [...codeIds].sort().join("\0");
    if (server === local) return;

    const timer = setTimeout(() => {
      const s = [...courseRef.current.courseCodes.map((c) => c.codeNumberId)]
        .sort()
        .join("\0");
      const l = [...codeIds].sort().join("\0");
      if (s === l) return;
      void (async () => {
        const r = await fetch(`/api/admin/courses/${courseRef.current.id}/codes`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ codeNumberIds: codeIds }),
        });
        if (r.ok) {
          await onSaved();
        } else {
          alert(t("admin.coursesCodesSaveFail"));
          await onSaved();
        }
      })();
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [codeIds, course.id, onSaved, t]);

  const options = useMemo(
    () => buildOptions(catalog, course.courseCodes),
    [catalog, course.courseCodes]
  );

  return (
    <div className="mt-3 w-full border-t border-app-border/60 pt-3">
      <p className="mb-1 text-xs font-medium text-app-fg/92">
        {t("admin.coursesStandardCodes")}
      </p>
      <p className="mb-2 text-[11px] text-app-muted/85">
        {t("admin.coursesStandardCodesHint")}
      </p>
      <p className="mb-2 text-[11px] text-app-muted/85">{t("teach.autoSaveHint")}</p>
      <CodePicker
        t={t}
        idPrefix={`course-${course.id}`}
        options={options}
        valueIds={codeIds}
        onChange={setCodeIds}
        filter={filter}
        onFilterChange={setFilter}
      />
    </div>
  );
}

export function AdminCoursesForm() {
  const { t } = useI18n();
  const [list, setList] = useState<Course[]>([]);
  const [catalog, setCatalog] = useState<CatalogRow[]>([]);
  const [name, setName] = useState("");
  const [bulkText, setBulkText] = useState("");
  const [editing, setEditing] = useState<Course | null>(null);
  const [codesOpenId, setCodesOpenId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    const r = await fetch("/api/admin/courses", { cache: "no-store" });
    if (!r.ok) {
      setErr(t("admin.coursesLoadFail"));
      return;
    }
    setList(await r.json());
  }, [t]);

  const loadCatalog = useCallback(async () => {
    const r = await fetch("/api/admin/code-numbers", { cache: "no-store" });
    if (r.ok) {
      const rows = await r.json();
      setCatalog(
        rows.map(
          (c: {
            id: string;
            value: string;
            label: string | null;
            sortOrder: number;
          }) => ({
            id: c.id,
            value: c.value,
            label: c.label,
            sortOrder: c.sortOrder,
          })
        )
      );
    }
  }, []);

  useEffect(() => {
    void load();
    void loadCatalog();
  }, [load, loadCatalog]);

  return (
    <div className="space-y-6">
      {err && <p className="text-sm text-app-danger">{err}</p>}
      <form
        className="glass flex flex-wrap items-end gap-2 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          const r = await fetch("/api/admin/courses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name: name.trim() }),
          });
          if (!r.ok) {
            setErr(t("admin.coursesCreateFail"));
            return;
          }
          setName("");
          await load();
        }}
      >
        <div>
          <label className="text-xs text-app-muted/90">
            {t("admin.coursesNameLabel")}
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-glass mt-0.5 block w-72 px-2 py-1.5"
            required
          />
        </div>
        <button
          type="submit"
          className="btn-glass-primary px-3 py-1.5 text-sm"
        >
          {t("admin.coursesAdd")}
        </button>
      </form>

      <form
        className="glass space-y-2 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          const names = bulkText
            .split(/[\n,]+/)
            .map((s) => s.trim())
            .filter(Boolean);
          if (names.length === 0) return;
          const r = await fetch("/api/admin/courses", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ bulkNames: names }),
          });
          if (!r.ok) {
            setErr(t("admin.coursesCreateFail"));
            return;
          }
          setBulkText("");
          await load();
        }}
      >
        <label className="text-xs text-app-muted/90">
          {t("admin.coursesBulkLabel")}
        </label>
        <textarea
          value={bulkText}
          onChange={(e) => setBulkText(e.target.value)}
          className="input-glass mt-0.5 block min-h-24 w-full p-2 text-sm"
          placeholder="CS 101&#10;CS 102"
        />
        <button
          type="submit"
          className="btn-glass mt-2 px-3 py-1.5 text-sm"
        >
          {t("admin.coursesBulkAddAll")}
        </button>
      </form>

      <ul className="space-y-2">
        {list.map((c) => (
          <li
            key={c.id}
            className="glass flex flex-col gap-2 p-3"
          >
            {editing?.id === c.id ? (
              <form
                className="flex flex-1 flex-wrap items-end gap-2"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const r = await fetch("/api/admin/courses", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: c.id,
                      name: editing.name,
                      sortOrder: editing.sortOrder,
                    }),
                  });
                  if (r.ok) {
                    setEditing(null);
                    await load();
                  }
                }}
              >
                <input
                  value={editing.name}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  className="input-glass min-w-0 flex-1 px-2 py-1"
                />
                <input
                  type="number"
                  value={editing.sortOrder}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      sortOrder: parseInt(e.target.value, 10) || 0,
                    })
                  }
                  className="input-glass w-24 px-2 py-1"
                />
                <button type="submit" className="text-sm text-app-link hover:underline">
                  {t("admin.coursesSave")}
                </button>
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="text-sm text-app-muted/85"
                >
                  {t("admin.coursesCancel")}
                </button>
              </form>
            ) : (
              <>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <div className="flex-1">
                    <span className="font-medium text-app-fg">{c.name}</span>
                    <span className="ml-2 text-sm text-app-muted/90">
                      {t("admin.coursesOrder")} {c.sortOrder}
                    </span>
                    <span className="ml-2 text-sm text-app-muted/85">
                      · {c.courseCodes.length}{" "}
                      {t("admin.coursesStandardCodes").toLowerCase()}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setCodesOpenId((id) => (id === c.id ? null : c.id))
                      }
                      className="text-sm text-app-link hover:underline"
                    >
                      {t("admin.coursesStandardCodes")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditing(c)}
                      className="text-sm text-app-link hover:underline"
                    >
                      {t("admin.coursesEdit")}
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!confirm(t("admin.coursesDeleteConfirm"))) return;
                        const r = await fetch(
                          `/api/admin/courses?id=${encodeURIComponent(c.id)}`,
                          { method: "DELETE" }
                        );
                        if (r.ok) {
                          if (codesOpenId === c.id) setCodesOpenId(null);
                          await load();
                        }
                      }}
                      className="text-sm text-app-danger hover:underline"
                    >
                      {t("admin.coursesDelete")}
                    </button>
                  </div>
                </div>
                {codesOpenId === c.id && (
                  <CourseCodesEditor
                    course={c}
                    catalog={catalog}
                    onSaved={load}
                  />
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
