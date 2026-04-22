"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/types";
import { t } from "@/lib/i18n/messages";

type Ctx = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: React.ReactNode;
}) {
  const [locale, setLoc] = useState<Locale>(initialLocale);
  const router = useRouter();

  useEffect(() => {
    setLoc(initialLocale);
  }, [initialLocale]);

  const setLocale = useCallback(
    (l: Locale) => {
      document.cookie = `${LOCALE_COOKIE}=${l};path=/;max-age=31536000;SameSite=Lax`;
      setLoc(l);
      router.refresh();
    },
    [router]
  );

  const tf = useCallback((key: string) => t(locale, key), [locale]);
  const value = useMemo(
    () => ({ locale, setLocale, t: tf }),
    [locale, setLocale, tf]
  );

  return (
    <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
  );
}

export function useI18n() {
  const v = useContext(LocaleContext);
  if (!v) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return v;
}
