import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { AdminCoursesForm } from "./admin-courses-form";

export default async function AdminCoursesPage() {
  const locale = await getServerLocale();
  return (
    <div>
      <h1 className="mb-2 text-lg font-bold text-app-fg">
        {t(locale, "admin.coursesPageTitle")}
      </h1>
      <AdminCoursesForm />
    </div>
  );
}
