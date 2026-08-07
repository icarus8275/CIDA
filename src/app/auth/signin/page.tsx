import Image from "next/image";
import { auth } from "@/auth";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { SignInForm } from "./sign-in-form";
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
    <div className="mx-auto min-h-dvh w-full max-w-5xl px-4 py-10 sm:py-12">
      <div className="grid min-h-[min(72vh,40rem)] grid-cols-1 gap-6 lg:grid-cols-2 lg:gap-8 lg:items-stretch">
        <div className="relative hidden min-h-[20rem] overflow-hidden rounded-2xl border border-app-border/80 lg:block">
          <Image
            src="/landing-hero-cida.png"
            alt=""
            fill
            className="object-cover object-center"
            sizes="(max-width: 1024px) 0, 50vw"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1c2430]/85 via-[#1c2430]/35 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-white/90">
              {t(locale, "home.landingKicker")}
            </p>
            <p className="mt-1 text-lg font-semibold text-white">
              {t(locale, "home.landingTitle")}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-white/85">
              {t(locale, "home.landingLead")}
            </p>
          </div>
        </div>

        <div className="flex flex-col justify-center">
          <div className="relative mb-4 overflow-hidden rounded-2xl border border-app-border/80 lg:hidden">
            <div className="relative aspect-[21/9] min-h-28 w-full">
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
            <h1 className="text-2xl font-bold text-app-fg">
              {t(locale, "signin.title")}
            </h1>
            <p className="mt-1.5 text-sm text-app-muted/90">
              {t(locale, "signin.hint")}
            </p>
            <div className="mt-6">
              <SignInForm callbackUrl={sp.callbackUrl} />
            </div>
            <p className="mt-6 text-center text-sm">
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
