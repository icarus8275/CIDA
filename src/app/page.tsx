import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { HomeLanding } from "@/components/home-landing";

export default async function Home() {
  const s = await auth();
  if (!s?.user) {
    return <HomeLanding />;
  }
  if (s.user.role === "CIDA") {
    redirect("/explore");
  }
  if (s.user.role === "ADMIN") {
    redirect("/admin");
  }
  redirect("/teach");
}
