import Link from "next/link";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

export default async function AdminPage() {
  const locale = await getServerLocale();
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900">
        {t(locale, "admin.pageTitle")}
      </h1>
      <p className="text-sm text-slate-600">
        {t(locale, "admin.pageBody")}
      </p>
      <ul className="list-inside list-disc text-sm text-indigo-700">
        <li>
          <Link className="hover:underline" href="/admin/users">
            Users (password accounts)
          </Link>
        </li>
        <li>
          <Link className="hover:underline" href="/admin/schedule">
            {t(locale, "admin.scheduleNav")} (terms, drag courses, sections)
          </Link>
        </li>
        <li>
          <Link className="hover:underline" href="/admin/courses">
            {t(locale, "admin.linkCourses")}
          </Link>
        </li>
        <li>
          <Link className="hover:underline" href="/admin/item-types">
            {t(locale, "admin.linkItemTypes")}
          </Link>
        </li>
        <li>
          <Link className="hover:underline" href="/admin/professors">
            {t(locale, "admin.linkAssign")} (legacy text — use Schedule)
          </Link>
        </li>
      </ul>
    </div>
  );
}
