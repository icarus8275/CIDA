import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { AdminBackupsClient } from "./admin-backups-client";

export default async function AdminBackupsPage() {
  const locale = await getServerLocale();
  return (
    <div>
      <h1 className="mb-2 text-lg font-bold text-app-fg">
        {t(locale, "admin.backupsTitle")}
      </h1>
      <p className="mb-4 text-sm text-app-muted/90">
        {t(locale, "admin.backupsLead")}
      </p>
      <AdminBackupsClient />
    </div>
  );
}
