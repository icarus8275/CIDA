"use server";

import { signOut } from "@/auth";

/** Production에서 로그아웃 후 엉뚱한(구) 배포 URL로 가지 않도록 AUTH_URL 기준으로 루트로 보냄. */
function canonicalAfterLogout(): string {
  const base = process.env.AUTH_URL?.trim().replace(/\/$/, "");
  if (base) {
    return `${base}/`;
  }
  return "/";
}

export async function signOutToHome() {
  await signOut({ redirectTo: canonicalAfterLogout() });
}
