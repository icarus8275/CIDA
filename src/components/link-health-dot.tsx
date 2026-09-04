"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/components/locale/locale-provider";

export type LinkHealthStatus = "ok" | "unknown" | "dead";
export type LinkDotStatus = LinkHealthStatus | "checking";

const DOT: Record<LinkDotStatus, string> = {
  ok: "bg-emerald-500",
  unknown: "bg-amber-400",
  dead: "bg-red-500",
  checking: "bg-app-muted/50 animate-pulse",
};

export function LinkHealthDot({
  status,
  className = "",
}: {
  status: LinkDotStatus | null;
  className?: string;
}) {
  const { t } = useI18n();
  if (!status) return null;
  const label =
    status === "ok"
      ? t("linkHealth.ok")
      : status === "unknown"
        ? t("linkHealth.unknown")
        : status === "dead"
          ? t("linkHealth.dead")
          : t("linkHealth.checking");
  return (
    <span
      className={`inline-block size-2.5 shrink-0 rounded-full ${DOT[status]} ${className}`}
      title={label}
      aria-label={label}
      role="img"
    />
  );
}

export function LiveLinkHealthDot({ url }: { url: string }) {
  const trimmed = url.trim();
  const [status, setStatus] = useState<LinkDotStatus | null>(null);

  useEffect(() => {
    if (!trimmed) {
      setStatus(null);
      return;
    }
    if (!/^https?:\/\//i.test(trimmed)) {
      setStatus("dead");
      return;
    }
    setStatus("checking");
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const r = await fetch(
            `/api/link-health?url=${encodeURIComponent(trimmed)}`,
            { cache: "no-store" }
          );
          const j = (await r.json().catch(() => ({}))) as {
            status?: LinkHealthStatus;
          };
          if (j.status === "ok" || j.status === "unknown" || j.status === "dead") {
            setStatus(j.status);
            return;
          }
          setStatus("unknown");
        } catch {
          setStatus("unknown");
        }
      })();
    }, 500);
    return () => window.clearTimeout(timer);
  }, [trimmed]);

  return <LinkHealthDot status={status} />;
}

export function useLinkHealthMap(urls: string[]) {
  const key = [...new Set(urls.map((u) => u.trim()).filter(Boolean))].sort().join("\n");
  const [map, setMap] = useState<Record<string, LinkHealthStatus>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const list = key ? key.split("\n") : [];
    if (list.length === 0) {
      setMap({});
      setReady(true);
      return;
    }
    setReady(false);
    let cancelled = false;
    void (async () => {
      const merged: Record<string, LinkHealthStatus> = {};
      try {
        for (let i = 0; i < list.length; i += 200) {
          const chunk = list.slice(i, i + 200);
          const r = await fetch("/api/link-health", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ urls: chunk }),
          });
          const j = (await r.json().catch(() => ({}))) as {
            statuses?: Record<string, LinkHealthStatus>;
          };
          Object.assign(merged, j.statuses ?? {});
          if (cancelled) return;
          setMap({ ...merged });
        }
      } catch {
        if (!cancelled) setMap(merged);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return { map, ready };
}
