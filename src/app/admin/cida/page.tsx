import { redirect } from "next/navigation";

/**
 * Old “CIDA View” in admin duplicated Explore; bookmarks still hit this URL.
 */
export default function AdminCidaRedirectPage() {
  redirect("/explore");
}
