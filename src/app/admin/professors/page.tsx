import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { AdminProfessorsForm } from "./admin-professors-form";

export default async function ProfessorsPage() {
  const locale = await getServerLocale();
  return (
    <div>
      <h1 className="mb-2 text-lg font-bold text-slate-900">
        {t(locale, "admin.profPageTitle")}
      </h1>
      <AdminProfessorsForm />
    </div>
  );
}
