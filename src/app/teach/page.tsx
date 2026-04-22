import Link from "next/link";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

function sectionTitle(s: {
  label: string;
  courseOffering: {
    course: { name: string };
    term: {
      academicYear: { label: string };
      termSeason: { label: string };
    };
  };
}) {
  const y = s.courseOffering.term.academicYear.label;
  const tr = s.courseOffering.term.termSeason.label;
  const c = s.courseOffering.course.name;
  return `${y} · ${tr} · ${c} · ${s.label}`;
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
      <p className="text-sm text-slate-600">
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
            className="font-medium text-indigo-700 hover:underline"
          >
            {sectionTitle(sec)}
          </Link>
        </li>
      ))}
    </ul>
  );
}
