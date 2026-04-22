const GRAPH = "https://graph.microsoft.com/v1.0";

function headers(accessToken: string) {
  return {
    Authorization: `Bearer ${accessToken}`,
  };
}

export async function listChildren(
  accessToken: string,
  itemId: string | null
): Promise<unknown> {
  const path =
    itemId == null
      ? `${GRAPH}/me/drive/root/children`
      : `${GRAPH}/me/drive/items/${itemId}/children`;
  const res = await fetch(path, { headers: headers(accessToken) });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Graph listChildren: ${res.status} ${t}`);
  }
  return res.json();
}

export async function createFolder(
  accessToken: string,
  parentItemId: string | null,
  name: string
): Promise<{ id: string; webUrl: string; name: string; parentReference?: { driveId: string } }> {
  const path =
    parentItemId == null
      ? `${GRAPH}/me/drive/root/children`
      : `${GRAPH}/me/drive/items/${parentItemId}/children`;
  const res = await fetch(path, {
    method: "POST",
    headers: {
      ...headers(accessToken),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name,
      folder: {},
      "@microsoft.graph.conflictBehavior": "rename",
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Graph createFolder: ${res.status} ${t}`);
  }
  return res.json() as Promise<{
    id: string;
    webUrl: string;
    name: string;
    parentReference?: { driveId: string };
  }>;
}
