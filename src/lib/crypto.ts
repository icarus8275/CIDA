import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

const algo = "aes-256-gcm";

function key32(): Buffer | null {
  const raw = process.env.OAUTH_ENCRYPTION_KEY;
  if (!raw) return null;
  if (raw.length === 64 && /^[0-9a-fA-F]+$/.test(raw)) {
    return Buffer.from(raw, "hex");
  }
  if (raw.length === 44) {
    return Buffer.from(raw, "base64");
  }
  return scryptSync(raw, "cida-salt", 32);
}

/** Encrypt only when OAUTH_ENCRYPTION_KEY is set (optional). */
export function encryptOptional(plain: string): {
  isEncrypted: boolean;
  payload: string;
} {
  const k = key32();
  if (!k) {
    return { isEncrypted: false, payload: plain };
  }
  const iv = randomBytes(12);
  const c = createCipheriv(algo, k, iv);
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  const tag = c.getAuthTag();
  const out = Buffer.concat([iv, tag, enc]);
  return { isEncrypted: true, payload: out.toString("base64") };
}

export function decryptOptional(payload: string, isBase64: boolean): string {
  const k = key32();
  if (!k || !isBase64) {
    return payload;
  }
  const buf = Buffer.from(payload, "base64");
  if (buf.length < 12 + 16) {
    return payload;
  }
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const d = createDecipheriv(algo, k, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}
