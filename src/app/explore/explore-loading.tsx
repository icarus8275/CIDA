"use client";

import { useI18n } from "@/components/locale/locale-provider";

export function ExploreLoading() {
  const { t } = useI18n();
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-100 text-slate-500">
      {t("explore.loading")}
    </div>
  );
}
