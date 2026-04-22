import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function ExploreLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const s = await auth();
  if (!s?.user) {
    redirect("/auth/signin?callbackUrl=/explore");
  }
  return <>{children}</>;
}
