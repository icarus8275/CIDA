export type Locale = "en" | "ko";

export const LOCALE_COOKIE = "cida-locale";

/**
 * When true (build-time `NEXT_PUBLIC_I18N_ENGLISH_ONLY=true`), the app is English-only:
 * cookie/URL cannot select Korean, locale switcher is hidden, and all `t()` calls use `en`.
 */
export function isEnglishOnlyI18n(): boolean {
  if (typeof process === "undefined") {
    return false;
  }
  return (
    process.env.NEXT_PUBLIC_I18N_ENGLISH_ONLY === "true" ||
    process.env.NEXT_PUBLIC_ENGLISH_ONLY === "true"
  );
}

export function parseLocale(v: string | undefined | null): Locale {
  return v === "ko" ? "ko" : "en";
}

/** Effective UI locale: English-only mode always returns `en` (ignores cookie). */
export function resolveLocale(v: string | undefined | null): Locale {
  if (isEnglishOnlyI18n()) {
    return "en";
  }
  return parseLocale(v);
}
