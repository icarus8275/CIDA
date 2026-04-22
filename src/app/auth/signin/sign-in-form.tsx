"use client";

import { signIn, getSession } from "next-auth/react";
import { useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

function defaultPathForRole(role: string | undefined) {
  if (role === "CIDA") return "/explore";
  if (role === "ADMIN") return "/admin";
  return "/teach";
}

export function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const { t } = useI18n();
  const [err, setErr] = useState<string | null>(null);
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        const fd = new FormData(e.currentTarget);
        const res = await signIn("credentials", {
          email: String(fd.get("email") || ""),
          password: String(fd.get("password") || ""),
          redirect: false,
        });
        if (res?.error) {
          setErr(t("signin.devFail"));
          return;
        }
        if (res?.ok) {
          const session = await getSession();
          const role = session?.user?.role;
          const path = callbackUrl || defaultPathForRole(role);
          window.location.href = path;
        }
      }}
    >
      <div>
        <label className="text-xs text-slate-500">{t("signin.devEmail")}</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5"
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
          autoComplete="current-password"
          className="mt-0.5 w-full rounded border border-slate-200 px-2 py-1.5"
        />
      </div>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        type="submit"
        className="w-full rounded-xl border border-slate-200 bg-slate-900 py-2.5 text-sm font-medium text-white hover:bg-slate-800"
      >
        {t("signin.title")}
      </button>
    </form>
  );
}
