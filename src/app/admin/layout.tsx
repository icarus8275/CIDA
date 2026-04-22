import { requireAdmin } from "@/lib/guards";
import { AdminHeader } from "./admin-header";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAdmin();
  return (
    <div className="min-h-dvh text-slate-200">
      <AdminHeader />
      <div className="mx-auto max-w-5xl p-4">{children}</div>
    </div>
  );
}
