import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { AdminLogsClient } from "./admin-logs-client";

export default async function AdminLogsPage() {
  const locale = await getServerLocale();
  return (
    <div>
      <h1 className="mb-2 text-lg font-bold text-app-fg">
        {t(locale, "admin.logsTitle")}
      </h1>
      <p className="mb-4 text-sm text-app-muted/90">
        {t(locale, "admin.logsLead")}
      </p>
      <AdminLogsClient />
    </div>
  );
}
