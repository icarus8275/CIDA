"use client";

import { useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

export function ChangePasswordForm() {
  const { t } = useI18n();
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="glass space-y-3 p-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setErr(null);
        setOk(false);
        const fd = new FormData(e.currentTarget);
        const currentPassword = String(fd.get("currentPassword") || "");
        const newPassword = String(fd.get("newPassword") || "");
        const confirm = String(fd.get("confirmPassword") || "");
        if (newPassword.length < 8) {
          setErr(t("account.passwordTooShort"));
          return;
        }
        if (newPassword !== confirm) {
          setErr(t("account.passwordMismatch"));
          return;
        }
        setBusy(true);
        try {
          const r = await fetch("/api/account/password", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ currentPassword, newPassword }),
          });
          const j = (await r.json().catch(() => ({}))) as {
            error?: string;
            message?: string;
          };
          if (!r.ok) {
            if (j.error === "bad_current") {
              setErr(t("account.badCurrent"));
            } else {
              setErr(j.message || t("account.changeFail"));
            }
            return;
          }
          setOk(true);
          e.currentTarget.reset();
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="block text-xs text-app-muted/90">
        {t("account.currentPassword")}
        <input
          name="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="input-glass mt-0.5 w-full px-2 py-2"
        />
      </label>
      <label className="block text-xs text-app-muted/90">
        {t("account.newPassword")}
        <input
          name="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input-glass mt-0.5 w-full px-2 py-2"
        />
      </label>
      <label className="block text-xs text-app-muted/90">
        {t("account.confirmPassword")}
        <input
          name="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input-glass mt-0.5 w-full px-2 py-2"
        />
      </label>
      {err && <p className="text-sm text-app-danger">{err}</p>}
      {ok && (
        <p className="text-sm text-app-link">{t("account.changeOk")}</p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="btn-glass-primary w-full py-2.5 text-sm disabled:opacity-50"
      >
        {busy ? t("teach.loading") : t("account.changeSubmit")}
      </button>
    </form>
  );
}
