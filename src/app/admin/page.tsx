import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpen,
  CalendarRange,
  Hash,
  ListTree,
  UserCircle,
  Users,
} from "lucide-react";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

export default async function AdminPage() {
  const locale = await getServerLocale();

  const cards: {
    href: string;
    title: string;
    desc: string;
    icon: ReactNode;
  }[] = [
    {
      href: "/admin/users",
      title: t(locale, "admin.usersPageTitle"),
      desc: t(locale, "admin.homeCardUsersDesc"),
      icon: <Users className="h-6 w-6" strokeWidth={1.75} />,
    },
    {
      href: "/admin/schedule",
      title: t(locale, "admin.scheduleNav"),
      desc: t(locale, "admin.homeCardScheduleDesc"),
      icon: <CalendarRange className="h-6 w-6" strokeWidth={1.75} />,
    },
    {
      href: "/admin/faculty",
      title: t(locale, "admin.facultyPageTitle"),
      desc: t(locale, "admin.homeCardFacultyDesc"),
      icon: <UserCircle className="h-6 w-6" strokeWidth={1.75} />,
    },
    {
      href: "/admin/courses",
      title: t(locale, "admin.coursesPageTitle"),
      desc: t(locale, "admin.homeCardCoursesDesc"),
      icon: <BookOpen className="h-6 w-6" strokeWidth={1.75} />,
    },
    {
      href: "/admin/item-types",
      title: t(locale, "admin.itemTypesPageTitle"),
      desc: t(locale, "admin.homeCardItemTypesDesc"),
      icon: <ListTree className="h-6 w-6" strokeWidth={1.75} />,
    },
    {
      href: "/admin/code-numbers",
      title: t(locale, "admin.codeNumbers"),
      desc: t(locale, "admin.homeCardCodeNumDesc"),
      icon: <Hash className="h-6 w-6" strokeWidth={1.75} />,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-app-fg">
          {t(locale, "admin.pageTitle")}
        </h1>
        <p className="mt-2 max-w-2xl text-pretty text-base leading-relaxed text-app-muted/95">
          {t(locale, "admin.pageBody")}
        </p>
        <h2 className="mt-6 text-sm font-semibold uppercase tracking-wide text-app-muted/90">
          {t(locale, "admin.homeGridTitle")}
        </h2>
        <p className="mt-1 text-sm text-app-muted/90">
          {t(locale, "admin.homeGridLead")}
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="group flex h-full flex-col rounded-2xl border border-app-border/80 bg-app-card/75 p-5 shadow-sm backdrop-blur-sm transition hover:border-app-primary/25 hover:shadow-md"
            >
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-app-primary/10 text-app-primary transition group-hover:bg-app-primary/15">
                {c.icon}
              </div>
              <h3 className="text-lg font-semibold text-app-fg group-hover:text-app-link">
                {c.title}
              </h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-app-muted/95">
                {c.desc}
              </p>
              <span className="mt-4 inline-flex text-sm font-medium text-app-link">
                {t(locale, "admin.homeCardOpen")} →
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
