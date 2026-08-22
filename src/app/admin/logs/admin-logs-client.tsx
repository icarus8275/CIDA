"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

type LogRow = {
  id: string;
  actorName: string;
  actorEmail: string | null;
  summaryEn: string;
  summaryKo: string;
  createdAt: string;
};

export function AdminLogsClient() {
  const { t, locale } = useI18n();
  const [list, setList] = useState<LogRow[]>([]);

  const load = useCallback(async () => {
    const r = await fetch("/api/admin/activity-logs", { cache: "no-store" });
    if (r.ok) setList(await r.json());
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ul className="space-y-2">
      {list.length === 0 ? (
        <li className="rounded-xl border border-dashed border-app-border/80 px-4 py-8 text-center text-sm text-app-muted/90">
          {t("admin.logsEmpty")}
        </li>
      ) : (
        list.map((row) => (
          <li
            key={row.id}
            className="rounded-xl border border-app-border/70 bg-app-card/70 px-4 py-3"
          >
            <p className="text-xs font-medium text-app-primary">
              {new Date(row.createdAt).toLocaleString(
                locale === "ko" ? "ko-KR" : "en-US",
                {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                }
              )}
            </p>
            <p className="mt-1 text-sm text-app-fg">
              {locale === "ko" ? row.summaryKo : row.summaryEn}
            </p>
            {row.actorEmail && (
              <p className="mt-0.5 text-xs text-app-muted/80">{row.actorEmail}</p>
            )}
          </li>
        ))
      )}
    </ul>
  );
}
