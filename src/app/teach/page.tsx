import Link from "next/link";
import { auth } from "@/auth";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { prisma } from "@/lib/prisma";

export default async function TeachHomePage() {
  const s = await auth();
  const locale = await getServerLocale();
  if (!s?.user) {
    return null;
  }
  const courses =
    s.user.role === "ADMIN"
      ? await prisma.course.findMany({ orderBy: { sortOrder: "asc" } })
      : await prisma.course
          .findMany({
            where: { professors: { some: { userId: s.user.id } } },
            orderBy: { sortOrder: "asc" },
          });

  if (courses.length === 0) {
    return (
      <p className="text-sm text-slate-600">
        {t(locale, "teach.noCourses")}
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {courses.map((c) => (
        <li key={c.id}>
          <Link
            href={`/teach/${c.id}`}
            className="font-medium text-indigo-700 hover:underline"
          >
            {c.name}
          </Link>
        </li>
      ))}
    </ul>
  );
}
