"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

type BackupRow = {
  id: string;
  createdAt: string;
  trigger: "SCHEDULED" | "MANUAL";
  itemCount: number;
};

export function AdminBackupsClient() {
  const { t, locale } = useI18n();
  const [list, setList] = useState<BackupRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [restoreId, setRestoreId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/backups", { cache: "no-store" });
    if (r.ok) setList(await r.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function fmt(iso: string) {
    return new Date(iso).toLocaleString(locale === "ko" ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        disabled={busy}
        className="btn-glass-primary px-3 py-1.5 text-sm disabled:opacity-50"
        onClick={async () => {
          setBusy(true);
          try {
            const r = await fetch("/api/admin/backups", { method: "POST" });
            if (!r.ok) {
              alert(t("admin.backupsCreateFail"));
              return;
            }
            await load();
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? t("teach.loading") : t("admin.backupsCreate")}
      </button>
      <div className="overflow-x-auto rounded-2xl border border-app-border/80 bg-app-card/75">
        <table className="w-full min-w-[36rem] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-app-border/80 bg-app-primary/[0.06]">
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted/90">
                {t("admin.backupsWhen")}
              </th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted/90">
                {t("admin.backupsTrigger")}
              </th>
              <th className="px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-app-muted/90">
                {t("admin.backupsItems")}
              </th>
              <th className="px-3 py-2.5 text-right text-xs font-semibold uppercase tracking-wide text-app-muted/90">
                {t("admin.usersTableColActions")}
              </th>
            </tr>
          </thead>
          <tbody>
            {list.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-app-muted/85">
                  {t("admin.backupsEmpty")}
                </td>
              </tr>
            ) : (
              list.map((b) => (
                <tr key={b.id} className="border-b border-app-border/45 last:border-0">
                  <td className="px-3 py-2.5 font-medium text-app-fg">{fmt(b.createdAt)}</td>
                  <td className="px-3 py-2.5 text-app-muted/90">
                    {b.trigger === "MANUAL"
                      ? t("admin.backupsManual")
                      : t("admin.backupsScheduled")}
                  </td>
                  <td className="px-3 py-2.5 text-app-muted/90">{b.itemCount}</td>
                  <td className="px-3 py-2.5 text-right">
                    <button
                      type="button"
                      disabled={restoreId === b.id}
                      className="text-sm text-app-link hover:underline disabled:opacity-50"
                      onClick={async () => {
                        if (!confirm(t("admin.backupsRestoreConfirm"))) return;
                        setRestoreId(b.id);
                        try {
                          const r = await fetch(
                            `/api/admin/backups/${b.id}/restore`,
                            { method: "POST" }
                          );
                          if (!r.ok) {
                            alert(t("admin.backupsRestoreFail"));
                            return;
                          }
                          alert(t("admin.backupsRestoreOk"));
                        } finally {
                          setRestoreId(null);
                        }
                      }}
                    >
                      {restoreId === b.id
                        ? t("teach.loading")
                        : t("admin.backupsRestore")}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
