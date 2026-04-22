"use client";

import { useI18n } from "./locale-provider";

const SHOW =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_SHOW_LOCALE_SWITCHER !== "false";

export function LocaleSwitcher() {
  if (!SHOW) {
    return null;
  }
  const { locale, setLocale, t } = useI18n();
  return (
    <div
      className="fixed right-3 top-3 z-50 flex items-center gap-1 rounded-xl border border-white/15 bg-white/10 px-2 py-1 text-sm text-slate-200 shadow-lg backdrop-blur-xl"
      role="group"
      aria-label={t("locale.label")}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded-lg px-2 py-0.5 transition ${
          locale === "en"
            ? "bg-white/20 text-white shadow-sm"
            : "text-slate-400 hover:bg-white/10 hover:text-slate-200"
        }`}
      >
        {t("locale.en")}
      </button>
      <span className="text-white/25">|</span>
      <button
        type="button"
        onClick={() => setLocale("ko")}
        className={`rounded-lg px-2 py-0.5 transition ${
          locale === "ko"
            ? "bg-white/20 text-white shadow-sm"
            : "text-slate-400 hover:bg-white/10 hover:text-slate-200"
        }`}
      >
        {t("locale.ko")}
      </button>
    </div>
  );
}
