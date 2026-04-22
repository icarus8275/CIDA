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
  return (
    <div className="min-h-dvh bg-slate-100">
      <TeachHeader
        email={s.user.email}
        isAdmin={s.user.role === "ADMIN"}
      />
      <div className="mx-auto max-w-5xl p-4">{children}</div>
    </div>
  );
}
