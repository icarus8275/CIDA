import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { EmailTestForm } from "./email-test-form";

export default async function AdminEmailTestPage() {
  const locale = await getServerLocale();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-app-fg">
          {t(locale, "admin.emailTestTitle")}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-app-muted/90">
          {t(locale, "admin.emailTestLead")}
        </p>
      </div>
      <EmailTestForm />
    </div>
  );
}
