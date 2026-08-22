import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AdminHeader } from "@/app/admin/admin-header";
import { ExploreHeader } from "@/app/explore/explore-header";
import { TeachHeader } from "@/app/teach/teach-header";

export default async function InboxLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await auth();
  if (!s?.user) {
    redirect("/auth/signin?callbackUrl=/inbox");
  }
  if (s.user.role === "ADMIN") {
    return (
      <div className="min-h-dvh text-app-fg/92">
        <AdminHeader name={s.user.name} email={s.user.email} />
        {children}
      </div>
    );
  }
  if (s.user.role === "CIDA") {
    return (
      <div className="min-h-dvh text-app-fg/92">
        <ExploreHeader
          name={s.user.name}
          email={s.user.email}
          role={s.user.role}
        />
        {children}
      </div>
    );
  }
  return (
    <div className="min-h-dvh text-app-fg/92">
      <TeachHeader
        name={s.user.name}
        email={s.user.email}
        isAdmin={false}
      />
      {children}
    </div>
  );
}
