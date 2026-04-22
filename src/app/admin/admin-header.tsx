"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale/locale-provider";
import { signOutToHome } from "@/lib/auth-actions";

export function AdminHeader() {
  const { t } = useI18n();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <span className="font-semibold text-slate-900">
          {t("admin.navTitle")}
        </span>
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin" className="text-indigo-600 hover:underline">
            {t("admin.home")}
          </Link>
          <Link
            href="/admin/courses"
            className="text-indigo-600 hover:underline"
          >
            {t("admin.courses")}
          </Link>
          <Link
            href="/admin/item-types"
            className="text-indigo-600 hover:underline"
          >
            {t("admin.itemTypes")}
          </Link>
          <Link
            href="/admin/professors"
            className="text-indigo-600 hover:underline"
          >
            {t("admin.profCourses")}
          </Link>
          <Link href="/explore" className="text-slate-600 hover:underline">
            {t("teach.explore")}
          </Link>
          <Link href="/teach" className="text-slate-600 hover:underline">
            {t("home.faculty")}
          </Link>
        </nav>
        <form className="ml-auto" action={signOutToHome}>
          <button
            type="submit"
            className="text-sm text-slate-600 hover:underline"
          >
            {t("admin.signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
