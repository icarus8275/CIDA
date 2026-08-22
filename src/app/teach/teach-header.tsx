"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/locale/locale-provider";
import { InboxNavLink } from "@/components/inbox-nav-link";
import { signOutToHome } from "@/lib/auth-actions";
import { accountLabel } from "@/lib/user-display";

export function TeachHeader({
  name,
  email,
  isAdmin,
}: {
  name: string | null;
  email: string | null;
  isAdmin: boolean;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const who = accountLabel(name, email);
  const onTeach = pathname.startsWith("/teach");

  return (
    <header className="glass-nav sticky top-0 z-20">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-semibold text-app-fg">
            {t("teach.navTitle")}
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
          <Link
            href="/teach"
            className={
              onTeach
                ? "rounded-md bg-app-primary/10 px-2 py-1 font-medium text-app-primary"
                : "link-app-muted px-2 py-1"
            }
          >
            {t("teach.myCourses")}
          </Link>
          {isAdmin && (
            <Link href="/admin" className="link-app-muted px-2 py-1">
              {t("teach.admin")}
            </Link>
          )}
          <Link href="/explore" className="link-app-muted px-2 py-1">
            {t("teach.explore")}
          </Link>
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
