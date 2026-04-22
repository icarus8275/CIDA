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
      className="fixed right-3 top-3 z-50 flex items-center gap-1 rounded-lg border border-slate-200 bg-white/90 px-2 py-1 text-sm shadow-sm backdrop-blur"
      role="group"
      aria-label={t("locale.label")}
    >
      <button
        type="button"
        onClick={() => setLocale("en")}
        className={`rounded px-2 py-0.5 ${
          locale === "en"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        {t("locale.en")}
      </button>
      <span className="text-slate-300">|</span>
      <button
        type="button"
        onClick={() => setLocale("ko")}
        className={`rounded px-2 py-0.5 ${
          locale === "ko"
            ? "bg-slate-900 text-white"
            : "text-slate-600 hover:bg-slate-100"
        }`}
      >
        {t("locale.ko")}
      </button>
    </div>
  );
}
