import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { formatTermForDisplay } from "@/lib/term-display";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

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
  return `${formatTermForDisplay(s.courseOffering.term)} · ${c} · ${s.label}`;
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

  const sections =
    s.user.role === "ADMIN"
      ? await prisma.section.findMany({
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
        })
      : await prisma.section.findMany({
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
      <p className="text-sm text-slate-400">
        {t(locale, "teach.noCourses")}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {sections.map((sec) => (
        <li key={sec.id}>
          <Link
            href={`/teach/section/${sec.id}`}
            className="font-medium text-cyan-200 hover:underline"
          >
            {sectionTitle(sec)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
