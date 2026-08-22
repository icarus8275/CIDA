import { requireAdmin } from "@/lib/guards";
import { ensureScheduledBackup } from "@/lib/backup";
import { AdminHeader } from "./admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await requireAdmin();
  void ensureScheduledBackup();
  return (
    <div className="min-h-dvh text-app-fg/92">
      <AdminHeader name={s.user.name} email={s.user.email} />
      <div className="mx-auto max-w-5xl p-4">{children}</div>
    </div>
  );
}
