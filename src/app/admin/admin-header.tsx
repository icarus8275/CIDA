"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale/locale-provider";
import { signOutToHome } from "@/lib/auth-actions";
import { accountLabel } from "@/lib/user-display";

export function AdminHeader({
  name,
  email,
}: {
  name: string | null;
  email: string | null;
}) {
  const { t } = useI18n();
  const who = accountLabel(name, email);
  return (
    <header className="glass-nav sticky top-0 z-20">
      <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
        <span className="font-semibold text-app-fg">
          {t("admin.navTitle")}
        </span>
        {who && (
          <span
            className="max-w-[min(18rem,36vw)] truncate text-sm text-app-muted/90"
            title={who}
          >
            {who}
          </span>
        )}
        <nav className="flex flex-wrap gap-2 text-sm">
          <Link href="/admin" className="link-app">
            {t("admin.home")}
          </Link>
          <Link href="/admin/users" className="link-app">
            {t("admin.usersNav")}
          </Link>
          <Link href="/admin/courses" className="link-app">
            {t("admin.courses")}
          </Link>
          <Link href="/admin/item-types" className="link-app">
            {t("admin.itemTypes")}
          </Link>
          <Link href="/admin/code-numbers" className="link-app">
            {t("admin.codeNumbers")}
          </Link>
          <Link href="/admin/schedule" className="link-app">
            {t("admin.scheduleNav")}
          </Link>
          <Link href="/admin/faculty" className="link-app">
            {t("admin.facultyNav")}
          </Link>
          <Link href="/explore" className="link-app-muted">
            {t("teach.explore")}
          </Link>
          <Link href="/teach" className="link-app-muted">
            {t("teach.navFacultyView")}
          </Link>
        </nav>
        <form className="ml-auto flex shrink-0" action={signOutToHome}>
          <button
            type="submit"
            className="text-sm text-app-muted hover:text-app-fg hover:underline"
          >
            {t("admin.signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
