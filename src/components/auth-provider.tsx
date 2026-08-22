"use client";

import { SessionProvider } from "next-auth/react";
import { NotificationHost } from "@/components/notification-host";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NotificationHost />
      {children}
    </SessionProvider>
  );
}
