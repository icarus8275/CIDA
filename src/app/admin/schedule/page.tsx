import { t } from "@/lib/i18n/messages";
import { getServerLocale } from "@/lib/i18n/server";
import { SectionInstructorPanel } from "./section-instructor-panel";
import { ScheduleBoard } from "./schedule-board";
import { AddOfferingForm } from "./add-offering-form";
import { TermSetupForm } from "./term-setup-form";

export default async function AdminSchedulePage() {
  const locale = await getServerLocale();
  return (
    <div className="space-y-8">
      <h1 className="text-xl font-bold text-app-fg">
        {t(locale, "admin.scheduleTitle")}
      </h1>
      <p className="text-sm text-app-muted/90">
        {t(locale, "admin.schedIntro")}
      </p>
      <TermSetupForm />
      <AddOfferingForm />
      <ScheduleBoard />
      <section className="border-t border-app-border/70 pt-6">
        <h2 className="mb-3 text-lg font-semibold text-app-fg">
          {t(locale, "admin.schedSectionsTitle")}
        </h2>
        <SectionInstructorPanel />
      </section>
    </div>
  );
}
