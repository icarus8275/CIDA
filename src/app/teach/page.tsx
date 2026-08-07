import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatTermForDisplay } from "@/lib/term-display";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { BookOpen, CalendarRange, ChevronRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TeachHomePage() {
  const s = await auth();
  const locale = await getServerLocale();
  if (!s?.user) {
    return null;
  }
  if (s.user.role === "CIDA") {
    return null;
  }

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
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed border-app-border/80 bg-app-card/60 px-6 py-10 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-app-primary/10 text-app-primary">
          <BookOpen className="h-6 w-6" strokeWidth={1.5} />
        </div>
        <p className="mt-4 text-base font-medium text-app-fg">
          {t(locale, "teach.noCourses")}
        </p>
        <p className="mt-2 text-sm text-app-muted/90">
          {t(locale, "teach.noCoursesHint")}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold text-app-fg">
          {t(locale, "teach.myCourses")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-app-muted/90">
          {t(locale, "teach.sectionsLead")}
        </p>
      </header>

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {sections.map((sec) => {
          const term = formatTermForDisplay(sec.courseOffering.term);
          const course = sec.courseOffering.course.name;
          return (
            <li key={sec.id}>
              <Link
                href={`/teach/section/${sec.id}`}
                className="group flex h-full items-stretch gap-3 rounded-xl border border-app-border/80 bg-app-card/80 p-4 shadow-sm transition hover:border-app-primary/30 hover:shadow-md"
              >
                <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-app-primary/10 text-app-primary">
                  <BookOpen className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-app-fg group-hover:text-app-link">
                    {course}
                  </span>
                  <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-sm text-app-muted/90">
                    <span className="inline-flex items-center gap-1">
                      <CalendarRange className="h-3.5 w-3.5" />
                      {term}
                    </span>
                    <span>
                      {t(locale, "teach.sectionBadge")} {sec.label}
                    </span>
                  </span>
                  <span className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-app-link">
                    {t(locale, "teach.editCourse")}
                    <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
