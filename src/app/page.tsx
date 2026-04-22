import Link from "next/link";
import { getServerLocale } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/messages";

export default async function Home() {
  const locale = await getServerLocale();
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="glass max-w-lg px-10 py-12 text-center">
        <h1 className="mb-3 text-3xl font-bold tracking-tight text-white">
          CIDA
        </h1>
        <p className="mb-8 text-slate-300">
          {t(locale, "home.subtitle")}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <Link href="/explore" className="btn-glass-primary inline-flex px-5 py-2.5 text-sm">
            {t(locale, "home.explore")}
          </Link>
          <Link
            href="/auth/signin"
            className="btn-glass inline-flex px-5 py-2.5 text-sm"
          >
            {t(locale, "home.signIn")}
          </Link>
          <Link href="/admin" className="btn-glass inline-flex px-5 py-2.5 text-sm">
            {t(locale, "home.admin")}
          </Link>
          <Link href="/teach" className="btn-glass inline-flex px-5 py-2.5 text-sm">
            {t(locale, "home.faculty")}
          </Link>
        </div>
      </div>
    </div>
  );
}
