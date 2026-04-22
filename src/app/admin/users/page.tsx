import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { AdminUsersForm } from "./admin-users-form";

export default async function AdminUsersPage() {
  const locale = await getServerLocale();
  return (
    <div>
      <h1 className="mb-2 text-lg font-bold text-white">
        {t(locale, "admin.usersPageTitle")}
      </h1>
      <p className="mb-4 text-sm text-slate-400">
        {t(locale, "admin.usersPageBody")}
      </p>
      <AdminUsersForm />
    </div>
  );
}
