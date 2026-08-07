"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/components/locale/locale-provider";
import { signOutToHome } from "@/lib/auth-actions";
import { accountLabel } from "@/lib/user-display";

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const active =
    href === "/admin"
      ? pathname === "/admin"
      : pathname === href || pathname.startsWith(`${href}/`);
  return (
    <Link
      href={href}
      className={
        active
          ? "rounded-md bg-app-primary/10 px-2 py-1 font-medium text-app-primary"
          : "link-app-muted px-2 py-1"
      }
    >
      {children}
    </Link>
  );
}

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
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5">
        <div className="flex min-w-0 items-baseline gap-2">
          <span className="font-semibold text-app-fg">
            {t("admin.navTitle")}
          </span>
          {who && (
            <span
              className="hidden max-w-[12rem] truncate text-xs text-app-muted/85 sm:inline"
              title={who}
            >
              {who}
            </span>
          )}
        </div>
        <nav className="flex flex-wrap items-center gap-0.5 text-sm">
          <NavLink href="/admin">{t("admin.home")}</NavLink>
          <NavLink href="/admin/users">{t("admin.usersNav")}</NavLink>
          <NavLink href="/admin/schedule">{t("admin.scheduleNav")}</NavLink>
          <NavLink href="/admin/faculty">{t("admin.facultyNav")}</NavLink>
          <NavLink href="/admin/courses">{t("admin.courses")}</NavLink>
          <NavLink href="/admin/code-numbers">{t("admin.codeNumbers")}</NavLink>
          <NavLink href="/admin/item-types">{t("admin.itemTypes")}</NavLink>
          <NavLink href="/admin/email-test">{t("admin.emailTestNav")}</NavLink>
        </nav>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-sm">
          <Link href="/teach" className="link-app-muted">
            {t("teach.myCourses")}
          </Link>
          <Link href="/explore" className="link-app-muted">
            {t("teach.explore")}
          </Link>
          <Link href="/account/password" className="link-app-muted">
            {t("account.changePasswordNav")}
          </Link>
          <form action={signOutToHome}>
            <button
              type="submit"
              className="text-app-muted hover:text-app-fg hover:underline"
            >
              {t("admin.signOut")}
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
