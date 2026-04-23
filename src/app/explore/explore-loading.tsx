"use client";

import { useI18n } from "@/components/locale/locale-provider";

export function ExploreLoading() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh items-center justify-center text-app-muted/90">
      {t("explore.loading")}
    </div>
  );
}
