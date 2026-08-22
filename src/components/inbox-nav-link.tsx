"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

export function InboxNavLink() {
  const { t } = useI18n();
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const active = pathname === "/inbox" || pathname.startsWith("/inbox/");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const r = await fetch("/api/notifications", { cache: "no-store" });
      if (!r.ok || cancelled) return;
      const j = (await r.json()) as { unread?: number };
      if (!cancelled) setUnread(j.unread ?? 0);
    }
    void load();
    const id = setInterval(() => void load(), 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [pathname]);

  return (
    <Link
      href="/inbox"
      className={
        active
          ? "relative rounded-md bg-app-primary/10 px-2 py-1 font-medium text-app-primary"
          : "link-app-muted relative px-2 py-1"
      }
    >
      {t("notify.inbox")}
      {unread > 0 && (
        <span className="ml-1 inline-flex min-w-4 items-center justify-center rounded-full bg-app-danger px-1 text-[10px] font-bold leading-4 text-white">
          {unread > 9 ? "9+" : unread}
        </span>
      )}
    </Link>
  );
}
