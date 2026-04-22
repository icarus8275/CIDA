"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale/locale-provider";
import { signOutToHome } from "@/lib/auth-actions";

export function TeachHeader({
  email,
  isAdmin,
}: {
  email: string | null;
  isAdmin: boolean;
}) {
  const { t } = useI18n();
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <span className="font-semibold text-slate-900">
          {t("teach.navTitle")}
        </span>
        <span className="text-sm text-slate-500">{email}</span>
        <nav className="ml-4 flex flex-wrap gap-2 text-sm">
          <Link href="/teach" className="text-indigo-600 hover:underline">
            {t("teach.myCourses")}
          </Link>
          {isAdmin && (
            <Link href="/admin" className="text-slate-600 hover:underline">
              {t("teach.admin")}
            </Link>
          )}
          <Link href="/explore" className="text-slate-600 hover:underline">
            {t("teach.explore")}
          </Link>
        </nav>
        <form className="ml-auto" action={signOutToHome}>
          <button
            type="submit"
            className="text-sm text-slate-600 hover:underline"
          >
            {t("teach.signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
