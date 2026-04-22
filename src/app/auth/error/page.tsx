import Link from "next/link";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const sp = await searchParams;
  const locale = await getServerLocale();
  const h = await headers();
  const xfh = h.get("x-forwarded-host");
  const xfp = h.get("x-forwarded-proto");
  const host = xfh || h.get("host") || "localhost:3000";
  const proto =
    xfp || (host.split(":")[0] === "localhost" ? "http" : "https");
  const origin = `${proto}://${host}`;

  const hints = [
    t(locale, "authError.hint1"),
    t(locale, "authError.hint2").replace("{origin}", origin),
    t(locale, "authError.hint3"),
    t(locale, "authError.hint4"),
    t(locale, "authError.hint5"),
  ];

  return (
    <div className="mx-auto max-w-lg px-4 py-16 text-slate-800">
      <h1 className="mb-2 text-xl font-bold">
        {t(locale, "authError.title")}
      </h1>
      <p className="mb-6 text-sm text-slate-600">
        {t(locale, "authError.body")}
      </p>
      <p className="mb-4 rounded border border-amber-200 bg-amber-50 px-3 py-2 font-mono text-sm">
        {sp.error || "—"}
      </p>
      <ul className="mb-8 list-inside list-disc space-y-2 text-sm text-slate-700">
        {hints.map((hText) => (
          <li key={hText.slice(0, 64)}>{hText}</li>
        ))}
      </ul>
      <Link
        href="/auth/signin"
        className="text-sm font-medium text-indigo-600 hover:underline"
      >
        {t(locale, "authError.back")}
      </Link>
    </div>
  );
}
