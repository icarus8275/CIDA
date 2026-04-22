import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./types";
import { t } from "./messages";

export async function getServerLocale(): Promise<Locale> {
  const c = await cookies();
  return resolveLocale(c.get(LOCALE_COOKIE)?.value);
}

export { t as tServer };
export type { Locale };
