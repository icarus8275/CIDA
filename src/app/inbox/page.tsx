"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";
import type { AppNotification } from "@/components/notification-host";

function titleOf(n: AppNotification, locale: string) {
  return locale === "ko" ? n.titleKo : n.titleEn;
}
function bodyOf(n: AppNotification, locale: string) {
  return locale === "ko" ? n.bodyKo : n.bodyEn;
}

export default function InboxPage() {
  const { t, locale } = useI18n();
  const { data: session } = useSession();
  const [items, setItems] = useState<AppNotification[]>([]);
  const homeHref =
    session?.user?.role === "ADMIN"
      ? "/admin"
      : session?.user?.role === "CIDA"
        ? "/explore"
        : "/teach";
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await fetch("/api/notifications", { cache: "no-store" });
    if (r.ok) {
      const j = (await r.json()) as { items: AppNotification[] };
      setItems(j.items);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "PATCH" });
    await load();
  }

  async function respond(requestId: string, accept: boolean, notifId: string) {
    setBusyId(notifId);
    try {
      const r = await fetch("/api/teach/share/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, accept }),
      });
      if (!r.ok) {
        alert(t("share.respondFail"));
        return;
      }
      await markRead(notifId);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-app-fg">{t("notify.inboxTitle")}</h1>
        <button
          type="button"
          className="text-sm text-app-link hover:underline"
          onClick={async () => {
            await fetch("/api/notifications", { method: "PATCH" });
            await load();
          }}
        >
          {t("notify.markAllRead")}
        </button>
      </div>
      <p className="text-sm text-app-muted/90">{t("notify.inboxLead")}</p>
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-app-border/80 bg-app-card/60 px-4 py-8 text-center text-sm text-app-muted/90">
          {t("notify.empty")}
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((n) => {
            const requestId =
              n.payload && typeof n.payload === "object"
                ? n.payload.requestId
                : undefined;
            const showActions = n.kind === "SHARE_REQUEST" && requestId && !n.readAt;
            return (
              <li
                key={n.id}
                className={
                  n.readAt
                    ? "rounded-xl border border-app-border/70 bg-app-card/55 p-4"
                    : "rounded-xl border border-app-primary/30 bg-app-primary/[0.06] p-4"
                }
              >
                <p className="text-xs text-app-muted/85">
                  {new Date(n.createdAt).toLocaleString(locale === "ko" ? "ko-KR" : "en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </p>
                <h2 className="mt-1 font-semibold text-app-fg">{titleOf(n, locale)}</h2>
                <p className="mt-1 text-sm text-app-muted/95">{bodyOf(n, locale)}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  {showActions && (
                    <>
                      <button
                        type="button"
                        disabled={busyId === n.id}
                        className="btn-glass-primary px-3 py-1 text-sm disabled:opacity-50"
                        onClick={() => void respond(requestId, true, n.id)}
                      >
                        {t("share.accept")}
                      </button>
                      <button
                        type="button"
                        disabled={busyId === n.id}
                        className="btn-glass px-3 py-1 text-sm disabled:opacity-50"
                        onClick={() => void respond(requestId, false, n.id)}
                      >
                        {t("share.decline")}
                      </button>
                    </>
                  )}
                  {!n.readAt && !showActions && (
                    <button
                      type="button"
                      className="text-sm text-app-link hover:underline"
                      onClick={() => void markRead(n.id)}
                    >
                      {t("notify.markRead")}
                    </button>
                  )}
                  {n.href && n.href !== "/inbox" && (
                    <Link href={n.href} className="text-sm text-app-link hover:underline">
                      {t("notify.openLink")}
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <Link href={homeHref} className="inline-block text-sm text-app-link hover:underline">
        {t("account.backHome")}
      </Link>
    </div>
  );
}
