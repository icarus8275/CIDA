import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const s = await auth();
  if (!s?.user) {
    redirect("/auth/signin");
  }
  if (s.user.role === "CIDA") {
    redirect("/explore");
  }
  if (s.user.role === "ADMIN") {
    redirect("/admin");
  }
  redirect("/teach");
}
