import { auth } from "@/auth";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { redirect } from "next/navigation";
import { SignInForm } from "./sign-in-form";

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
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold text-slate-900">
        {t(locale, "signin.title")}
      </h1>
      <p className="text-sm text-slate-600">
        {t(locale, "signin.hint")}
      </p>
      <SignInForm callbackUrl={sp.callbackUrl} />
    </div>
  );
}
