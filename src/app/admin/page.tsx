import Link from "next/link";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

export default async function AdminPage() {
  const locale = await getServerLocale();
  return (
    <div className="glass space-y-4 p-6">
      <h1 className="text-xl font-bold text-white">
        {t(locale, "admin.pageTitle")}
      </h1>
      <p className="text-sm text-slate-400">
        {t(locale, "admin.pageBody")}
      </p>
      <ul className="list-inside list-disc text-sm text-cyan-100/90">
        <li>
          <Link className="link-app" href="/admin/users">
            Users (password accounts)
          </Link>
        </li>
        <li>
          <Link className="link-app" href="/admin/schedule">
            {t(locale, "admin.scheduleNav")} (terms, drag courses, sections)
          </Link>
        </li>
        <li>
          <Link className="link-app" href="/admin/courses">
            {t(locale, "admin.linkCourses")}
          </Link>
        </li>
        <li>
          <Link className="link-app" href="/admin/item-types">
            {t(locale, "admin.linkItemTypes")}
          </Link>
        </li>
        <li>
          <Link className="link-app" href="/admin/code-numbers">
            {t(locale, "admin.linkCodeNumbers")}
          </Link>
        </li>
        <li>
          <Link className="link-app" href="/admin/professors">
            {t(locale, "admin.linkAssign")} (legacy text — use Schedule)
          </Link>
        </li>
      </ul>
    </div>
  );
}
