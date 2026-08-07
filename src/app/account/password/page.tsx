import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { ChangePasswordForm } from "./change-password-form";
import Link from "next/link";

export default async function ChangePasswordPage() {
  const s = await auth();
  if (!s?.user) {
    redirect("/auth/signin?callbackUrl=/account/password");
  }
  const locale = await getServerLocale();

  return (
    <div className="mx-auto max-w-md space-y-4 px-4 py-10">
      <div>
        <h1 className="text-xl font-bold text-app-fg">
          {t(locale, "account.changePasswordTitle")}
        </h1>
        <p className="mt-1 text-sm text-app-muted/90">
          {t(locale, "account.changePasswordLead")}
        </p>
      </div>
      <ChangePasswordForm />
      <Link
        href={
          s.user.role === "ADMIN"
            ? "/admin"
            : s.user.role === "CIDA"
              ? "/explore"
              : "/teach"
        }
        className="inline-block text-sm text-app-link hover:underline"
      >
        {t(locale, "account.backHome")}
      </Link>
    </div>
  );
}
