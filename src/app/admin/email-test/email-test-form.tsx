"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

type SmtpStatus = {
  configured: boolean;
  host: string;
  port: string;
  user: string;
  from: string;
  hasPass: boolean;
};

export function EmailTestForm() {
  const { t } = useI18n();
  const [status, setStatus] = useState<SmtpStatus | null>(null);
  const [to, setTo] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/email-test", { cache: "no-store" });
    if (r.ok) setStatus(await r.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      {status && (
        <div className="glass space-y-1 p-4 text-sm">
          <p>
            <span className="text-app-muted/85">{t("admin.emailTestStatus")}: </span>
            {status.hasPass ? (
              <span className="text-app-link">{t("admin.emailTestConfigured")}</span>
            ) : (
              <span className="text-amber-900/90">
                {t("admin.emailTestMissingPass")}
              </span>
            )}
          </p>
          <p className="text-xs text-app-muted/85">
            SMTP {status.host}:{status.port} · {status.user} → from {status.from}
          </p>
          <p className="text-xs text-app-muted/85">{t("admin.emailTestPassHint")}</p>
        </div>
      )}

      <form
        className="glass max-w-md space-y-3 p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setErr(null);
          setOk(null);
          setBusy(true);
          try {
            const r = await fetch("/api/admin/email-test", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: to.trim() }),
            });
            const j = (await r.json().catch(() => ({}))) as {
              error?: string;
              messageId?: string;
            };
            if (!r.ok) {
              setErr(j.error || t("admin.emailTestFail"));
              return;
            }
            setOk(t("admin.emailTestOk"));
          } finally {
            setBusy(false);
          }
        }}
      >
        <label className="block text-xs text-app-muted/90">
          {t("admin.emailTestTo")}
          <input
            type="email"
            required
            className="input-glass mt-0.5 w-full px-2 py-2"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            placeholder="you@example.com"
          />
        </label>
        {err && <p className="text-sm text-app-danger">{err}</p>}
        {ok && <p className="text-sm text-app-link">{ok}</p>}
        <button
          type="submit"
          disabled={busy}
          className="btn-glass-primary w-full py-2 text-sm disabled:opacity-50"
        >
          {busy ? t("teach.loading") : t("admin.emailTestSend")}
        </button>
      </form>
    </div>
  );
}
