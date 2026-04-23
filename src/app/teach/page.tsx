import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatTermForDisplay } from "@/lib/term-display";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { BookOpen, CalendarRange, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

function sectionTitle(s: {
  label: string;
  courseOffering: {
    course: { name: string };
    term: {
      academicYear: { label: string; startYear: number };
      termSeason: { key: string; label: string };
    };
  };
}) {
  const c = s.courseOffering.course.name;
  return `${formatTermForDisplay(s.courseOffering.term)} \u00b7 ${c} \u00b7 ${s.label}`;
}

export default async function TeachHomePage() {
  const s = await auth();
  const locale = await getServerLocale();
  if (!s?.user) {
    return null;
  }
  if (s.user.role === "CIDA") {
    return null;
  }

  // For ADMIN, "my courses" uses SectionInstructor; full list is in Admin above.
  const sections = await prisma.section.findMany({
    where: {
      instructors: { some: { userId: s.user.id } },
    },
    orderBy: { sortOrder: "asc" },
    include: {
      courseOffering: {
        include: {
          course: true,
          term: {
            include: { academicYear: true, termSeason: true },
          },
        },
      },
    },
  });

  if (sections.length === 0) {
    return (
      <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-app-border/80 bg-app-card/50 p-8 text-center backdrop-blur-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-app-primary/10 text-app-primary">
          <BookOpen className="h-7 w-7" strokeWidth={1.5} />
        </div>
        <p className="mt-4 text-base text-app-fg/92">
          {t(locale, "teach.noCourses")}
        </p>
        <p className="mt-2 text-sm text-app-muted/90">
          {t(locale, "teach.sectionsLead")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="glass rounded-2xl p-5 sm:p-6">
        <h1 className="text-2xl font-bold text-app-fg">
          {t(locale, "teach.navTitle")}
        </h1>
        <h2 className="mt-1 text-lg font-semibold text-app-fg/95">
          {t(locale, "teach.sectionsTitle")}
        </h2>
        <p className="mt-2 max-w-2xl text-pretty text-sm leading-relaxed text-app-muted/95 sm:text-base">
          {t(locale, "teach.sectionsLead")}
        </p>
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {sections.map((sec) => {
          const term = formatTermForDisplay(sec.courseOffering.term);
          const course = sec.courseOffering.course.name;
          return (
            <li key={sec.id}>
              <Link
                href={`/teach/section/${sec.id}`}
                className="group flex h-full flex-col rounded-2xl border border-app-border/80 bg-app-card/75 p-5 shadow-sm backdrop-blur-sm transition hover:border-app-primary/25 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2 text-app-muted/90">
                    <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-app-primary/10 text-app-primary">
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <span className="truncate text-sm font-medium uppercase tracking-wide text-app-fg/88">
                      {course}
                    </span>
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-app-muted/70 transition group-hover:translate-x-0.5 group-hover:text-app-link" />
                </div>
                <p className="mt-2 flex min-w-0 items-center gap-1.5 text-sm text-app-muted/95">
                  <CalendarRange className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="font-medium text-app-fg/90">
                      {t(locale, "teach.termLabel")}:{" "}
                    </span>
                    {term}
                  </span>
                </p>
                <p className="mt-2 text-sm text-app-muted/90">
                  <span className="font-medium text-app-fg/90">
                    {t(locale, "teach.sectionBadge")}:{" "}
                  </span>
                  {sec.label}
                </p>
                <p className="mt-1 line-clamp-2 text-xs text-app-muted/85" title={sectionTitle(sec)}>
                  {sectionTitle(sec)}
                </p>
                <span className="mt-4 text-sm font-medium text-app-link">
                  {t(locale, "teach.openSection")} ?
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
