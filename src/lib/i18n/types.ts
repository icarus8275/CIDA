export type Locale = "en" | "ko";

export const LOCALE_COOKIE = "cida-locale";

export function parseLocale(v: string | undefined | null): Locale {
  return v === "ko" ? "ko" : "en";
}
