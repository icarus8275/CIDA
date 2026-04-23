"use client";

import Link from "next/link";
import { useI18n } from "@/components/locale/locale-provider";
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
    <header className="glass-nav sticky top-0 z-30 border-b border-app-border/70">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <span className="font-semibold text-app-fg">
          {t("explore.navTitle")}
        </span>
        {who && (
          <span
            className="max-w-[min(20rem,40vw)] truncate text-sm text-app-muted/90"
            title={who}
          >
            {who}
          </span>
        )}
        <nav className="ml-0 flex flex-wrap items-center gap-2 text-sm sm:ml-2">
          {showTeach && (
            <Link href="/teach" className="link-app-muted">
              {t("teach.myCourses")}
            </Link>
          )}
          {showAdmin && (
            <Link href="/admin" className="link-app-muted">
              {t("teach.admin")}
            </Link>
          )}
          <span
            className="link-app cursor-default"
            aria-current="page"
            title={t("teach.explore")}
          >
            {t("teach.explore")}
          </span>
        </nav>
        <form className="ml-auto flex shrink-0" action={signOutToHome}>
          <button
            type="submit"
            className="text-sm text-app-muted hover:text-app-fg hover:underline"
          >
            {t("teach.signOut")}
          </button>
        </form>
      </div>
    </header>
  );
}
