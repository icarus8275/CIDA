import { auth, signIn } from "@/auth";
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
    redirect(sp.callbackUrl || "/teach");
  }
  const showDevLogin =
    process.env.ALLOW_DEV_PASSWORD_LOGIN === "true" &&
    process.env.NODE_ENV === "development";
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-4">
      <h1 className="text-2xl font-bold text-slate-900">
        {t(locale, "signin.title")}
      </h1>
      <p className="text-sm text-slate-600">
        {t(locale, "signin.hint")}
      </p>
      <form
        action={async () => {
          "use server";
          const p = await searchParams;
          await signIn("microsoft-entra-id", {
            redirectTo: p.callbackUrl || "/teach",
          });
        }}
      >
        <button
          type="submit"
          className="w-full rounded-xl border border-slate-200 bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
        >
          {t(locale, "signin.microsoft")}
        </button>
      </form>
      <SignInForm callbackUrl={sp.callbackUrl} showDevLogin={showDevLogin} />
    </div>
  );
}
