import Image from "next/image";
import Link from "next/link";
import { BookOpen, Eye, LogIn, Settings2 } from "lucide-react";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

export async function HomeLanding() {
  const locale = await getServerLocale();

  const audiences = [
    {
      icon: BookOpen,
      title: t(locale, "home.audFacultyT"),
      body: t(locale, "home.audFacultyB"),
    },
    {
      icon: Eye,
      title: t(locale, "home.audCidaT"),
      body: t(locale, "home.audCidaB"),
    },
    {
      icon: Settings2,
      title: t(locale, "home.audAdminT"),
      body: t(locale, "home.audAdminB"),
    },
  ] as const;

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 py-8 sm:py-12">
      {/* Hero: one composition — brand, headline, one line, CTA, image */}
      <section className="relative overflow-hidden rounded-2xl border border-app-border/80 shadow-sm">
        <div className="relative min-h-[18rem] sm:min-h-[22rem]">
          <Image
            src="/landing-hero-cida.png"
            alt=""
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c2430]/88 via-[#1c2430]/45 to-[#1c2430]/20" />
          <div className="relative flex min-h-[18rem] flex-col justify-end px-5 py-6 sm:min-h-[22rem] sm:px-8 sm:py-8">
            <p className="text-sm font-semibold uppercase tracking-[0.08em] text-white/95">
              {t(locale, "home.landingKicker")}
            </p>
            <h1 className="mt-2 max-w-xl text-balance text-3xl font-bold leading-tight text-white sm:text-4xl">
              {t(locale, "home.landingTitle")}
            </h1>
            <p className="mt-3 max-w-lg text-pretty text-base leading-relaxed text-white/90">
              {t(locale, "home.landingLead")}
            </p>
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Link
                href="/auth/signin"
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-semibold text-app-primary shadow-sm transition hover:bg-white/95"
              >
                <LogIn className="h-4 w-4" aria-hidden />
                {t(locale, "home.landingCta")}
              </Link>
              <p className="text-sm text-white/85">
                {t(locale, "home.landingCtaSub")}
              </p>
            </div>
          </div>
        </div>
      </section>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wide text-app-muted/90">
        {t(locale, "home.audTitle")}
      </h2>
      <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {audiences.map((a) => {
          const Icon = a.icon;
          return (
            <li
              key={a.title}
              className="rounded-xl border border-app-border/70 bg-app-card/80 p-4 shadow-sm"
            >
              <div className="flex items-center gap-2.5">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-app-primary/10 text-app-primary">
                  <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden />
                </span>
                <h3 className="font-semibold text-app-fg">{a.title}</h3>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-app-muted/95">
                {a.body}
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
