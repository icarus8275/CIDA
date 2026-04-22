"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale/locale-provider";
import { signOutToHome } from "@/lib/auth-actions";

export function AdminHeader() {
  const { t } = useI18n();
  return (
    <header className="glass-nav sticky top-0 z-20">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <span className="font-semibold text-white">
          {t("admin.navTitle")}
        </span>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin" className="link-app">
            {t("admin.home")}
          </Link>
          <Link href="/admin/users" className="link-app">
            Users
          </Link>
          <Link href="/admin/courses" className="link-app">
            {t("admin.courses")}
          </Link>
          <Link href="/admin/item-types" className="link-app">
            {t("admin.itemTypes")}
          </Link>
          <Link href="/admin/schedule" className="link-app">
            {t("admin.scheduleNav")}
          </Link>
          <Link href="/admin/professors" className="link-app">
            {t("admin.profCourses")}
          </Link>
          <Link href="/explore" className="link-app-muted">
            {t("teach.explore")}
          </Link>
          <Link href="/teach" className="link-app-muted">
            {t("home.faculty")}
          </Link>
        </nav>
        <form className="ml-auto" action={signOutToHome}>
          <button
            type="submit"
            className="text-sm text-slate-300 hover:text-white hover:underline"
          >
            {t("admin.signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
