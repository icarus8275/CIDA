"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale/locale-provider";
import { InboxNavLink } from "@/components/inbox-nav-link";
import { signOutToHome } from "@/lib/auth-actions";
import { accountLabel } from "@/lib/user-display";
import type { UserRole } from "@/generated/prisma/enums";

export function ExploreHeader({
  name,
  email,
  role,
}: {
  name: string | null;
  email: string | null;
  role: UserRole;
}) {
  const { t } = useI18n();
  const who = accountLabel(name, email);
  const showTeach = role === "ADMIN" || role === "PROFESSOR";
  const showAdmin = role === "ADMIN";

  return (
    <header className="glass-nav sticky top-0 z-30">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-semibold text-app-fg">
            {t("explore.navTitle")}
          </span>
          {who && (
            <span
              className="hidden max-w-[14rem] truncate text-xs text-app-muted/85 sm:inline"
              title={who}
            >
              {who}
            </span>
          )}
        </div>
        <nav className="flex flex-wrap items-center gap-0.5 text-sm">
          {showTeach && (
            <Link href="/teach" className="link-app-muted px-2 py-1">
              {t("teach.myCourses")}
            </Link>
          )}
          {showAdmin && (
            <Link href="/admin" className="link-app-muted px-2 py-1">
              {t("teach.admin")}
            </Link>
          )}
          <span
            className="rounded-md bg-app-primary/10 px-2 py-1 font-medium text-app-primary"
            aria-current="page"
          >
            {t("teach.explore")}
          </span>
          <InboxNavLink />
        </nav>
        <div className="ml-auto flex items-center gap-2 text-sm">
          <Link href="/account/password" className="link-app-muted">
            {t("account.changePasswordNav")}
          </Link>
          <form action={signOutToHome}>
            <button
              type="submit"
              className="text-app-muted hover:text-app-fg hover:underline"
            >
              {t("teach.signOut")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
