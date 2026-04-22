import Link from "next/link";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

export default async function ProfessorsPage() {
  const locale = await getServerLocale();
  return (
    <div className="glass space-y-3 p-4 text-sm text-slate-300">
      <p>{t(locale, "admin.profPageBody")}</p>
      <Link href="/admin/schedule" className="font-medium text-cyan-200 hover:underline">
        {t(locale, "admin.profPageLink")}
      </Link>
    </div>
  );
}
