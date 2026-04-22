import { AdminUsersForm } from "./admin-users-form";

export default function AdminUsersPage() {
  return (
    <div>
      <h1 className="mb-2 text-lg font-bold text-slate-900">Users</h1>
      <p className="mb-4 text-sm text-slate-600">
        Create accounts with email and password. CIDA = read-only explore.
      </p>
      <AdminUsersForm />
    </div>
  );
}
