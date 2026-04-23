"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useI18n } from "@/components/locale/locale-provider";
import { SectionEditor } from "@/app/teach/section/[sectionId]/section-editor";
import { listUserLabel } from "@/lib/user-display";
import { formatTermForDisplay } from "@/lib/term-display";

type UserRow = {
  id: string;
  email: string | null;
  name: string | null;
  role: string;
};

type SectionRow = {
  id: string;
  label: string;
  courseOffering: {
    course: { name: string };
    term: {
      academicYear: { label: string; startYear: number };
      termSeason: { key: string; label: string };
    };
  };
};

const FACULTY_ROLES = new Set(["PROFESSOR", "ADMIN"]);

function sectionPath(s: SectionRow) {
  return `${formatTermForDisplay(s.courseOffering.term)} · ${s.courseOffering.course.name} · ${s.label}`;
}

export function AdminFacultyClient() {
  const { t } = useI18n();
  const router = useRouter();
  const sp = useSearchParams();
  const [users, setUsers] = useState<UserRow[]>([]);
  const [sections, setSections] = useState<SectionRow[]>([]);
  const [userId, setUserId] = useState("");
  const [sectionId, setSectionId] = useState("");
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [listBusy, setListBusy] = useState(true);

  const syncQuery = useCallback(
    (u: string, sec: string) => {
      const p = new URLSearchParams();
      if (u) p.set("userId", u);
      if (sec) p.set("sectionId", sec);
      const q = p.toString();
      router.replace(q ? `/admin/faculty?${q}` : "/admin/faculty", {
        scroll: false,
      });
    },
    [router]
  );

  const loadUsers = useCallback(async () => {
    setLoadErr(null);
    const r = await fetch("/api/admin/users", { cache: "no-store" });
    if (!r.ok) {
      setLoadErr(t("teach.errLoad"));
      return;
    }
    const all = (await r.json()) as UserRow[];
    setUsers(
      all.filter((x) => FACULTY_ROLES.has(x.role)).sort((a, b) => {
        const A = listUserLabel(a.name, a.email);
        const B = listUserLabel(b.name, b.email);
        return A.localeCompare(B, undefined, { sensitivity: "base" });
      })
    );
  }, [t]);

  const loadSections = useCallback(
    async (uid: string) => {
      if (!uid) {
        setSections([]);
        return;
      }
      setLoadErr(null);
      setListBusy(true);
      try {
        const r = await fetch(
          `/api/admin/faculty-sections?userId=${encodeURIComponent(uid)}`,
          { cache: "no-store" }
        );
        if (!r.ok) {
          setLoadErr(t("teach.errLoad"));
          setSections([]);
          return;
        }
        setSections(await r.json());
      } finally {
        setListBusy(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    setUserId(sp.get("userId") ?? "");
    setSectionId(sp.get("sectionId") ?? "");
  }, [sp]);

  useEffect(() => {
    if (userId) {
      void loadSections(userId);
    } else {
      setSections([]);
    }
  }, [userId, loadSections]);

  const faculty = useMemo(
    () => users.find((u) => u.id === userId),
    [users, userId]
  );

  const facultyLabel = faculty
    ? listUserLabel(faculty.name, faculty.email)
    : "";

  const backToPickerHref = useMemo(() => {
    if (!userId) return "/admin/faculty";
    return `/admin/faculty?userId=${encodeURIComponent(userId)}`;
  }, [userId]);

  if (loadErr && users.length === 0) {
    return <p className="text-sm text-red-300">{loadErr}</p>;
  }

  if (sectionId && userId) {
    return (
      <SectionEditor
        key={sectionId}
        sectionId={sectionId}
        surrogate={
          faculty
            ? { facultyLabel, backHref: backToPickerHref }
            : { facultyLabel: "—", backHref: backToPickerHref }
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-white">
        {t("admin.facultyPageTitle")}
      </h1>
      <p className="text-sm text-slate-400">{t("admin.facultyPageBody")}</p>

      {loadErr && <p className="text-sm text-amber-200/90">{loadErr}</p>}

      <div className="glass space-y-2 p-4">
        <label className="block text-xs text-slate-400" htmlFor="admin-faculty-pick">
          {t("admin.facultyPick")}
        </label>
        <select
          id="admin-faculty-pick"
          className="input-glass max-w-xl px-2 py-1.5 text-sm"
          value={userId}
          onChange={(e) => {
            const v = e.target.value;
            setUserId(v);
            setSectionId("");
            syncQuery(v, "");
            if (v) {
              void loadSections(v);
            } else {
              setSections([]);
            }
          }}
        >
          <option value="">{t("admin.facultyPick")}…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {listUserLabel(u.name, u.email)}
            </option>
          ))}
        </select>
      </div>

      {userId && (
        <div className="space-y-2">
          <h2 className="text-sm font-medium text-slate-200">
            {t("admin.facultySections")}
          </h2>
          {listBusy ? (
            <p className="text-sm text-slate-500">{t("teach.loading")}</p>
          ) : sections.length === 0 ? (
            <p className="text-sm text-slate-500">
              {t("admin.facultyNoSections")}
            </p>
          ) : (
            <ul className="space-y-1">
              {sections.map((sec) => (
                <li key={sec.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSectionId(sec.id);
                      syncQuery(userId, sec.id);
                    }}
                    className="link-app w-full text-left"
                  >
                    {sectionPath(sec)} — {t("admin.facultyOpenSection")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {!userId && (
        <p className="text-sm text-slate-500">{t("admin.facultySelectFirst")}</p>
      )}
    </div>
  );
}
