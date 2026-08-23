"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

export function SignInForm({ callbackUrl }: { callbackUrl?: string }) {
  const { t } = useI18n();
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        setErr(null);
        setBusy(true);
        const fd = new FormData(e.currentTarget);
        try {
          const res = await signIn("credentials", {
            email: String(fd.get("email") || ""),
            password: String(fd.get("password") || ""),
            redirect: false,
          });
          if (res?.error) {
            setErr(t("signin.devFail"));
            setBusy(false);
            return;
          }
          if (res?.ok) {
            window.location.assign(callbackUrl || "/");
            return;
          }
          setErr(t("signin.devFail"));
          setBusy(false);
        } catch {
          setErr(t("signin.devFail"));
          setBusy(false);
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
          disabled={busy}
          className="input-glass mt-0.5 w-full px-2 py-2 disabled:opacity-60"
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
          disabled={busy}
          className="input-glass mt-0.5 w-full px-2 py-2 disabled:opacity-60"
        />
      </div>
      {err && <p className="text-sm text-app-danger">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="btn-glass-primary inline-flex w-full items-center justify-center gap-2 py-2.5 text-sm disabled:opacity-70"
      >
        {busy ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            {t("signin.busy")}
          </>
        ) : (
          t("signin.title")
        )}
      </button>
      <p className="text-center text-sm">
        <Link
          href="/auth/forgot-password"
          className={
            busy
              ? "pointer-events-none text-app-muted/70"
              : "text-app-link hover:underline"
          }
        >
          {t("signin.forgotPassword")}
        </Link>
      </p>
    </form>
  );
}
