import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { TeachHeader } from "./teach-header";

export default async function TeachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await auth();
  if (!s?.user) {
    redirect("/auth/signin?callbackUrl=/teach");
  }
  if (s.user.role === "CIDA") {
    redirect("/explore");
  }
  return (
    <div className="min-h-dvh text-slate-200">
      <TeachHeader
        email={s.user.email}
        isAdmin={s.user.role === "ADMIN"}
      />
      <div className="mx-auto max-w-5xl p-4">{children}</div>
    </div>
  );
}
