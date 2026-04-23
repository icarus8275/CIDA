import { requireAdmin } from "@/lib/guards";
import { AdminHeader } from "./admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await requireAdmin();
  return (
    <div className="min-h-dvh text-app-fg/92">
      <AdminHeader name={s.user.name} email={s.user.email} />
      <div className="mx-auto max-w-5xl p-4">{children}</div>
    </div>
  );
}
