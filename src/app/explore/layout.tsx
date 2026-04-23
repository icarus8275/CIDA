import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ExploreHeader } from "./explore-header";

export default async function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await auth();
  if (!s?.user) {
    redirect("/auth/signin?callbackUrl=/explore");
  }
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
