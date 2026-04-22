/** Single line for headers: prefer name, always show email when useful. */
export function accountLabel(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  const n = name?.trim();
  const e = email?.trim();
  if (n && e) {
    return `${n} · ${e}`;
  }
  if (n) {
    return n;
  }
  if (e) {
    return e;
  }
  return "";
}

export function listUserLabel(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  const n = name?.trim();
  const e = email?.trim();
  if (n && e) {
    return `${n} (${e})`;
  }
  if (e) {
    return e;
  }
  if (n) {
    return n;
  }
  return "—";
}
