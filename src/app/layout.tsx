import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import { AuthProvider } from "@/components/auth-provider";
import { LocaleProvider } from "@/components/locale/locale-provider";
import { LocaleSwitcher } from "@/components/locale/locale-switcher";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "@/lib/i18n/types";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title:
    "Ball State Interior Design Program — CIDA Accreditation",
  description:
    "Official workspace for the Ball State University Interior Design program's CIDA (Council for Interior Design Accreditation) review and materials.",
  icons: {
    icon: [{ url: "/icon.png", type: "image/png", sizes: "any" }],
    apple: "/icon.png",
  },
};

async function getLocaleFromRequest(): Promise<Locale> {
  const c = await cookies();
  return resolveLocale(c.get(LOCALE_COOKIE)?.value);
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocaleFromRequest();
  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} h-full`}
    >
      <body className="min-h-dvh font-sans antialiased">
        <div className="app-shell min-h-dvh">
          <LocaleProvider initialLocale={locale}>
            <AuthProvider>
              <LocaleSwitcher />
              {children}
            </AuthProvider>
          </LocaleProvider>
        </div>
      </body>
    </html>
  );
}
