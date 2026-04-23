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
        <label className="text-xs text-app-muted/90">{t("signin.devEmail")}</label>
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="input-glass mt-0.5 w-full px-2 py-2"
        />
      </div>
      <div>
        <label className="text-xs text-app-muted/90">
          {t("signin.devPassword")}
        </label>
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="input-glass mt-0.5 w-full px-2 py-2"
        />
      </div>
      {err && <p className="text-sm text-app-danger">{err}</p>}
      <button type="submit" className="btn-glass-primary w-full py-2.5 text-sm">
        {t("signin.title")}
      </button>
    </form>
  );
}
