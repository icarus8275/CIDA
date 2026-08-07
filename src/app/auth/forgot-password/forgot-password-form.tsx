"use client";

import { useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

export function ForgotPasswordForm() {
  const { t } = useI18n();
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  if (done) {
    return (
      <p className="rounded-lg border border-app-border/70 bg-app-card/60 p-4 text-sm text-app-fg/92">
        {t("forgot.done")}
      </p>
    );
  }

  return (
    <form
      className="glass space-y-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        const fd = new FormData(e.currentTarget);
        const email = String(fd.get("email") || "").trim();
        setBusy(true);
        try {
          const r = await fetch("/api/auth/forgot-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          if (!r.ok) {
            setErr(t("forgot.fail"));
            return;
          }
          setDone(true);
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-xs text-app-muted/90">
        {t("forgot.email")}
        <input
          name="email"
          type="email"
          required
          autoComplete="username"
          className="input-glass mt-0.5 w-full px-2 py-2"
        />
      </label>
      {err && <p className="text-sm text-app-danger">{err}</p>}
      <button
        type="submit"
        disabled={busy}
        className="btn-glass-primary w-full py-2.5 text-sm disabled:opacity-50"
      >
        {busy ? t("teach.loading") : t("forgot.submit")}
      </button>
    </form>
  );
}
