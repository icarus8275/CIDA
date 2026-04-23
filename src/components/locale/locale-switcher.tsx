"use client";

import { useI18n } from "./locale-provider";
import { isEnglishOnlyI18n } from "@/lib/i18n/types";

const SHOW =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SHOW_LOCALE_SWITCHER !== "false";

export function LocaleSwitcher() {
  if (!SHOW || isEnglishOnlyI18n()) {
    return null;
  }
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      className="fixed right-3 top-3 z-50 flex items-center gap-1 rounded-xl border border-app-border/80 bg-app-card/75 px-2 py-1 text-sm text-app-fg/92 shadow-lg backdrop-blur-xl"
      role="group"
      aria-label={t("locale.label")}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-lg px-2 py-0.5 transition ${
          locale === "en"
            ? "bg-app-primary/12 text-app-primary shadow-sm"
            : "text-app-muted/90 hover:bg-app-card/75 hover:text-app-fg"
        }`}
      >
        {t("locale.en")}
      </button>
      <span className="text-app-border">|</span>
      <button
        type="button"
        onClick={() => setLocale("ko")}
        className={`rounded-lg px-2 py-0.5 transition ${
          locale === "ko"
            ? "bg-app-primary/12 text-app-primary shadow-sm"
            : "text-app-muted/90 hover:bg-app-card/75 hover:text-app-fg"
        }`}
      >
        {t("locale.ko")}
      </button>
    </div>
  );
}
