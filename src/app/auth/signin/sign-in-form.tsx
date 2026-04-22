"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

export function SignInForm({
  callbackUrl,
  showDevLogin,
}: {
  callbackUrl?: string;
  showDevLogin: boolean;
}) {
  const { t } = useI18n();
  const [err, setErr] = useState<string | null>(null);
  if (!showDevLogin) {
    return null;
  }
  return (
    <form
      className="space-y-3 border-t border-slate-200 pt-6"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        const fd = new FormData(e.currentTarget);
        const res = await signIn("dev-credentials", {
          email: String(fd.get("email") || ""),
          password: String(fd.get("password") || ""),
          redirect: false,
        });
        if (res?.error) {
          setErr(t("signin.devFail"));
        } else if (res?.ok) {
          window.location.href = callbackUrl || "/teach";
        }
      }}
    >
      <p className="text-xs font-medium text-amber-800">
        {t("signin.devNote")}
      </p>
      <div>
        <label className="text-xs text-slate-500">{t("signin.devEmail")}</label>
        <input
          name="email"
          type="email"
          required
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5"
          autoComplete="username"
        />
      </div>
      <div>
        <label className="text-xs text-slate-500">
          {t("signin.devPassword")}
        </label>
        <input
          name="password"
          type="password"
          required
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5"
          autoComplete="current-password"
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        type="submit"
        className="w-full rounded-lg border border-amber-200 bg-amber-50 py-2 text-sm font-medium text-amber-900"
      >
        {t("signin.devButton")}
      </button>
    </form>
  );
}
