import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatTermForDisplay, termChronology } from "@/lib/term-display";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import {
  loadCourseItemsForSection,
} from "@/lib/section-share";
import { BookOpen } from "lucide-react";
import {
  MyCoursesList,
  type MyCourseCard,
} from "./my-courses-list";

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

  const courses: MyCourseCard[] = (
    await Promise.all(
      sections.map(async (sec) => {
        const items = await loadCourseItemsForSection({
          sectionId: sec.id,
          courseOfferingId: sec.courseOfferingId,
          userId: s.user.id,
          role: s.user.role,
        });
        const term = sec.courseOffering.term;
        return {
          id: sec.id,
          courseName: sec.courseOffering.course.name,
          sectionLabel: sec.label,
          termId: term.id,
          termLabel: formatTermForDisplay(term),
          termRank: termChronology(term),
          hasContent: items.length > 0,
        };
      })
    )
  ).sort((a, b) => {
    if (b.termRank !== a.termRank) return b.termRank - a.termRank;
    const byName = a.courseName.localeCompare(b.courseName);
    if (byName) return byName;
    return a.sectionLabel.localeCompare(b.sectionLabel, undefined, {
      numeric: true,
    });
  });

  if (courses.length === 0) {
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
      <MyCoursesList courses={courses} />
    </div>
  );
}
