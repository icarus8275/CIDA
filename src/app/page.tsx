import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

export default async function Home() {
  const locale = await getServerLocale();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-slate-100 px-4">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">CIDA</h1>
      <p className="mb-6 max-w-md text-center text-slate-600">
        {t(locale, "home.subtitle")}
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <Link
          href="/explore"
          className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          {t(locale, "home.explore")}
        </Link>
        <Link
          href="/auth/signin"
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {t(locale, "home.signIn")}
        </Link>
        <Link
          href="/admin"
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {t(locale, "home.admin")}
        </Link>
        <Link
          href="/teach"
          className="rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          {t(locale, "home.faculty")}
        </Link>
      </div>
    </div>
  );
}
