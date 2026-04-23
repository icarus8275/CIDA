import Image from "next/image";
import { auth } from "@/auth";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { SignInForm } from "./sign-in-form";
import { LogIn } from "lucide-react";
import Link from "next/link";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const locale = await getServerLocale();
  if (session?.user) {
    if (session.user.role === "CIDA") {
      redirect(sp.callbackUrl || "/explore");
    }
    if (session.user.role === "ADMIN") {
      redirect(sp.callbackUrl || "/admin");
    }
    redirect(sp.callbackUrl || "/teach");
  }
  return (
    <div className="mx-auto min-h-dvh w-full max-w-6xl px-4 py-10 sm:py-12">
      <div className="grid min-h-[min(80vh,44rem)] grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10 lg:items-stretch">
        <div className="hidden flex-col overflow-hidden rounded-2xl border border-app-border/80 glass lg:flex">
          <div className="relative min-h-48 flex-1">
            <Image
              src="/landing-hero-cida.png"
              alt=""
              fill
              className="object-cover object-center"
              sizes="(max-width: 1024px) 0, 50vw"
              priority
            />
          </div>
          <div className="border-t border-app-border/60 p-6">
            <p className="text-sm font-medium text-app-link">
              {t(locale, "home.landingKicker")}
            </p>
            <p className="mt-2 text-balance text-lg font-semibold text-app-fg">
              {t(locale, "home.landingTitle")}
            </p>
            <p className="mt-2 text-pretty text-sm leading-relaxed text-app-muted/95">
              {t(locale, "home.landingLead")}
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex text-sm font-medium text-app-link hover:underline"
            >
              ← {t(locale, "home.backToWelcome")}
            </Link>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="glass mb-4 overflow-hidden rounded-2xl lg:hidden">
            <div className="relative aspect-[21/9] w-full min-h-32">
              <Image
                src="/landing-hero-cida.png"
                alt=""
                fill
                className="object-cover"
                priority
                sizes="100vw"
              />
            </div>
          </div>
          <div className="glass rounded-2xl p-6 sm:p-8">
            <div className="mb-2 flex items-center gap-2 text-app-link">
              <LogIn className="h-5 w-5" />
              <span className="text-sm font-medium uppercase tracking-wide">
                {t(locale, "signin.title")}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-app-fg">
              {t(locale, "signin.title")}
            </h1>
            <p className="mt-2 text-sm text-app-muted/90">
              {t(locale, "signin.hint")}
            </p>
            <div className="mt-6">
              <SignInForm callbackUrl={sp.callbackUrl} />
            </div>
            <p className="mt-6 text-center text-sm text-app-muted/85">
              <Link href="/" className="text-app-link hover:underline">
                ← {t(locale, "home.backToWelcome")}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
