"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

export type AppNotification = {
  id: string;
  kind: string;
  titleEn: string;
  titleKo: string;
  bodyEn: string;
  bodyKo: string;
  href: string | null;
  payload: { requestId?: string } | null;
  readAt: string | null;
  createdAt: string;
};

function titleOf(n: AppNotification, locale: string) {
  return locale === "ko" ? n.titleKo : n.titleEn;
}
function bodyOf(n: AppNotification, locale: string) {
  return locale === "ko" ? n.bodyKo : n.bodyEn;
}

export function NotificationHost() {
  const { data: session, status } = useSession();
  const { t, locale } = useI18n();
  const [popup, setPopup] = useState<AppNotification | null>(null);
  const seen = useRef<Set<string>>(new Set());
  const primed = useRef(false);

  const poll = useCallback(async () => {
    if (status !== "authenticated" || !session?.user) return;
    const r = await fetch("/api/notifications", { cache: "no-store" });
    if (!r.ok) return;
    const j = (await r.json()) as { items: AppNotification[] };
    const unread = j.items.filter((n) => !n.readAt);
    if (!primed.current) {
      for (const n of unread) seen.current.add(n.id);
      primed.current = true;
      return;
    }
    const fresh = unread.find((n) => !seen.current.has(n.id));
    if (fresh) {
      seen.current.add(fresh.id);
      setPopup(fresh);
    }
    for (const n of unread) seen.current.add(n.id);
  }, [session?.user, status]);

  useEffect(() => {
    void poll();
    const id = setInterval(() => void poll(), 20_000);
    return () => clearInterval(id);
  }, [poll]);

  if (!popup) return null;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-black/35 p-4 pt-[12vh]">
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl border border-app-border bg-app-card p-5 shadow-xl"
      >
        <p className="text-xs font-semibold uppercase tracking-wide text-app-primary">
          {t("notify.popupKicker")}
        </p>
        <h2 className="mt-1 text-lg font-bold text-app-fg">
          {titleOf(popup, locale)}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-app-muted/95">
          {bodyOf(popup, locale)}
        </p>
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Link
            href="/inbox"
            className="btn-glass-primary px-3 py-1.5 text-sm"
            onClick={() => setPopup(null)}
          >
            {t("notify.openInbox")}
          </Link>
          <button
            type="button"
            className="btn-glass px-3 py-1.5 text-sm"
            onClick={() => setPopup(null)}
          >
            {t("notify.dismiss")}
          </button>
        </div>
      </div>
    </div>
  );
}
