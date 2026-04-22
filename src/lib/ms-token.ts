import { prisma } from "@/lib/prisma";

const tenantFromIssuer = () => {
  const is = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER || "";
  const m = is.match(
    /login\.microsoftonline\.com\/([a-f0-9-]{36})/i
  );
  return m?.[1] ?? null;
};

type Result =
  | { accessToken: string }
  | { error: "no_microsoft" | "refresh_failed" | "config" };

/**
 * OneDrive / Microsoft Graph: refresh the access token using the Entra account.
 */
export async function getValidAccessTokenForUser(
  userId: string
): Promise<Result> {
  const tenant = tenantFromIssuer();
  const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID;
  const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET;
  if (!tenant || !clientId || !clientSecret) {
    return { error: "config" };
  }

  const acc = await prisma.account.findFirst({
    where: { userId, provider: "microsoft-entra-id" },
  });
  if (!acc?.refresh_token) {
    return { error: "no_microsoft" };
  }

  const now = Math.floor(Date.now() / 1000);
  if (
    acc.expires_at &&
    acc.expires_at - 90 > now &&
    acc.access_token
  ) {
    return { accessToken: acc.access_token };
  }

  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "refresh_token",
        refresh_token: acc.refresh_token,
        scope: [
          "offline_access",
          "https://graph.microsoft.com/Files.Read",
          "https://graph.microsoft.com/Files.ReadWrite",
        ].join(" "),
      }),
    }
  );
  if (!res.ok) {
    return { error: "refresh_failed" };
  }
  const j = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  };
  if (!j.access_token) {
    return { error: "refresh_failed" };
  }
  const expires = j.expires_in
    ? now + j.expires_in
    : null;
  await prisma.account.update({
    where: { id: acc.id },
    data: {
      access_token: j.access_token,
      refresh_token: j.refresh_token ?? acc.refresh_token,
      expires_at: expires,
    },
  });
  return { accessToken: j.access_token };
}
