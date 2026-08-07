import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import Link from "next/link";
import { ForgotPasswordForm } from "./forgot-password-form";

export default async function ForgotPasswordPage() {
  const locale = await getServerLocale();
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-md flex-col justify-center px-4 py-10">
      <h1 className="text-xl font-bold text-app-fg">
        {t(locale, "forgot.title")}
      </h1>
      <p className="mt-2 text-sm text-app-muted/90">{t(locale, "forgot.lead")}</p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
      <Link
        href="/auth/signin"
        className="mt-4 text-sm text-app-link hover:underline"
      >
        {t(locale, "forgot.backSignIn")}
      </Link>
    </div>
  );
}
