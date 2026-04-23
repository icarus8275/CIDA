import Image from "next/image";
import Link from "next/link";
import {
  BookOpen,
  Cloud,
  Hash,
  ListTree,
  LogIn,
} from "lucide-react";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";

export async function HomeLanding() {
  const locale = await getServerLocale();

  const features = [
    { icon: BookOpen, t: t(locale, "home.landingF1T"), b: t(locale, "home.landingF1B") },
    { icon: Hash, t: t(locale, "home.landingF2T"), b: t(locale, "home.landingF2B") },
    { icon: Cloud, t: t(locale, "home.landingF3T"), b: t(locale, "home.landingF3B") },
    { icon: ListTree, t: t(locale, "home.landingF4T"), b: t(locale, "home.landingF4B") },
  ] as const;

  return (
    <div className="mx-auto min-h-dvh max-w-5xl px-4 py-10 sm:py-14">
      <div className="mb-8 overflow-hidden rounded-2xl border border-app-border/80 glass shadow-sm">
        <div className="relative aspect-[21/9] w-full min-h-[10rem] sm:min-h-[12rem]">
          <Image
            src="/landing-hero-cida.png"
            alt=""
            fill
            className="object-cover object-center"
            priority
            sizes="(max-width: 1024px) 100vw, 1024px"
          />
        </div>
        <div className="space-y-3 border-t border-app-border/60 p-5 sm:p-7">
          <p className="text-sm font-medium uppercase tracking-wide text-app-link">
            {t(locale, "home.landingKicker")}
          </p>
          <h1 className="text-balance text-2xl font-bold leading-tight text-app-fg sm:text-3xl">
            {t(locale, "home.landingTitle")}
          </h1>
          <p className="max-w-3xl text-pretty text-base leading-relaxed text-app-muted/95 sm:text-lg">
            {t(locale, "home.landingLead")}
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Link
              href="/auth/signin"
              className="btn-glass-primary inline-flex items-center gap-2 px-5 py-2.5 text-sm"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              {t(locale, "home.landingCta")}
            </Link>
            <p className="text-sm text-app-muted/90">
              {t(locale, "home.landingCtaSub")}
            </p>
          </div>
        </div>
      </div>

      <h2 className="sr-only">Features</h2>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {features.map((f) => {
          const Icon = f.icon;
          return (
            <li
              key={f.t}
              className="flex gap-4 rounded-2xl border border-app-border/70 bg-app-card/80 p-5 shadow-sm backdrop-blur-sm"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-app-primary/10 text-app-primary">
                <Icon className="h-6 w-6" strokeWidth={1.75} aria-hidden />
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-app-fg">{f.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-app-muted/95">
                  {f.b}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
