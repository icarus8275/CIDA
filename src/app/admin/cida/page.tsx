import { Suspense } from "react";
import { auth } from "@/auth";
import { CourseCodeExplorer } from "@/components/course-code-explorer";
import { getExploreData } from "@/lib/explore-data";
import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { accountLabel } from "@/lib/user-display";
import { UserRole } from "@/generated/prisma/enums";
import { ExploreLoading } from "@/app/explore/explore-loading";

export const dynamic = "force-dynamic";

export default async function AdminCidaViewPage() {
  const s = await auth();
  const locale = await getServerLocale();
  if (!s?.user) {
    return null;
  }
  const data = await getExploreData(s.user.id, UserRole.CIDA);
  const accountLine = accountLabel(s.user.name, s.user.email) || null;
  return (
    <div className="space-y-4">
      <div className="glass rounded-lg p-3 text-sm text-slate-300">
        <h1 className="mb-1 text-base font-semibold text-white">
          {t(locale, "admin.cidaViewTitle")}
        </h1>
        <p>{t(locale, "admin.cidaViewBanner")}</p>
      </div>
      <Suspense fallback={<ExploreLoading />}>
        <CourseCodeExplorer initialData={data} accountLine={accountLine} />
      </Suspense>
    </div>
  );
}
