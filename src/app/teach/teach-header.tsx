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
    <header className="glass-nav sticky top-0 z-20">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <span className="font-semibold text-white">
          {t("teach.navTitle")}
        </span>
        <span className="text-sm text-slate-400">{email}</span>
        <nav className="ml-4 flex flex-wrap gap-2 text-sm">
          <Link href="/teach" className="link-app">
            {t("teach.myCourses")}
          </Link>
          {isAdmin && (
            <Link href="/admin" className="link-app-muted">
              {t("teach.admin")}
            </Link>
          )}
          <Link href="/explore" className="link-app-muted">
            {t("teach.explore")}
          </Link>
        </nav>
        <form className="ml-auto" action={signOutToHome}>
          <button
            type="submit"
            className="text-sm text-slate-300 hover:text-white hover:underline"
          >
            {t("teach.signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
