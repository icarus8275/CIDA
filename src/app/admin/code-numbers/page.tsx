import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { AdminCodeNumbersForm } from "./admin-code-numbers-form";

export default async function CodeNumbersPage() {
  const locale = await getServerLocale();
  return (
    <div>
      <h1 className="mb-2 text-lg font-bold text-app-fg">
        {t(locale, "admin.cnPageTitle")}
      </h1>
      <p className="mb-4 text-sm text-app-muted/90">
        {t(locale, "admin.cnPageBody")}
      </p>
      <AdminCodeNumbersForm />
    </div>
  );
}
