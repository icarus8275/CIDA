import Link from "next/link";
import type { ReactNode } from "react";
import {
  BookOpen,
  CalendarRange,
  Hash,
  ListTree,
  Mail,
  UserCircle,
  Users,
} from "lucide-react";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

type Card = {
  href: string;
  title: string;
  desc: string;
  icon: ReactNode;
};

export default async function AdminPage() {
  const locale = await getServerLocale();

  const setup: Card[] = [
    {
      href: "/admin/users",
      title: t(locale, "admin.usersPageTitle"),
      desc: t(locale, "admin.homeCardUsersDesc"),
      icon: <Users className="h-5 w-5" strokeWidth={1.75} />,
    },
    {
      href: "/admin/courses",
      title: t(locale, "admin.coursesPageTitle"),
      desc: t(locale, "admin.homeCardCoursesDesc"),
      icon: <BookOpen className="h-5 w-5" strokeWidth={1.75} />,
    },
    {
      href: "/admin/code-numbers",
      title: t(locale, "admin.codeNumbers"),
      desc: t(locale, "admin.homeCardCodeNumDesc"),
      icon: <Hash className="h-5 w-5" strokeWidth={1.75} />,
    },
    {
      href: "/admin/item-types",
      title: t(locale, "admin.itemTypesPageTitle"),
      desc: t(locale, "admin.homeCardItemTypesDesc"),
      icon: <ListTree className="h-5 w-5" strokeWidth={1.75} />,
    },
  ];

  const operations: Card[] = [
    {
      href: "/admin/schedule",
      title: t(locale, "admin.scheduleNav"),
      desc: t(locale, "admin.homeCardScheduleDesc"),
      icon: <CalendarRange className="h-5 w-5" strokeWidth={1.75} />,
    },
    {
      href: "/admin/faculty",
      title: t(locale, "admin.facultyPageTitle"),
      desc: t(locale, "admin.homeCardFacultyDesc"),
      icon: <UserCircle className="h-5 w-5" strokeWidth={1.75} />,
    },
    {
      href: "/admin/email-test",
      title: t(locale, "admin.emailTestTitle"),
      desc: t(locale, "admin.homeCardEmailTestDesc"),
      icon: <Mail className="h-5 w-5" strokeWidth={1.75} />,
    },
  ];

  function CardGrid({ items }: { items: Card[] }) {
    return (
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((c) => (
          <li key={c.href}>
            <Link
              href={c.href}
              className="group flex h-full items-start gap-3 rounded-xl border border-app-border/80 bg-app-card/80 p-4 shadow-sm transition hover:border-app-primary/30 hover:shadow-md"
            >
              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-app-primary/10 text-app-primary transition group-hover:bg-app-primary/15">
                {c.icon}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-app-fg group-hover:text-app-link">
                    {c.title}
                  </span>
                  <span className="shrink-0 text-app-muted/60 transition group-hover:translate-x-0.5 group-hover:text-app-link">
                    →
                  </span>
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-app-muted/90">
                  {c.desc}
                </span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-app-fg">
          {t(locale, "admin.pageTitle")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-app-muted/90 sm:text-base">
          {t(locale, "admin.pageBody")}
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-app-muted/85">
          {t(locale, "admin.homeGroupSetup")}
        </h2>
        <CardGrid items={setup} />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-app-muted/85">
          {t(locale, "admin.homeGroupOps")}
        </h2>
        <CardGrid items={operations} />
      </section>
    </div>
  );
}
