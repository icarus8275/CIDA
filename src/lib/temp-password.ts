import { randomInt } from "node:crypto";

/** Ambiguous characters excluded (0/O, 1/l/I). */
const ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

/** Simple 8-character temporary password for faculty accounts. */
export function generateTempPassword(length = 8): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)]!;
  }
  return out;
}
