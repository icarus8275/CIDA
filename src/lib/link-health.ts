import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

export type LinkHealthStatus = "ok" | "unknown" | "dead";

const CACHE_MS = 10 * 60 * 1000;
const FETCH_MS = 7000;
const MAX_HOPS = 5;
const MAX_BODY = 48_000;

const cache = new Map<string, { status: LinkHealthStatus; at: number }>();

const DEAD_PHRASES = [
  "this link is no longer available",
  "this sharing link has been removed",
  "sharing link is invalid or has expired",
  "the item does not exist",
  "this item might have been deleted",
  "file or folder has been deleted",
  "link you followed may be broken",
  "page not found",
  "we couldn't find that",
  "sorry, this page isn't available",
  "this shared file is no longer available",
  "the shared file you're trying to access is no longer available",
  "this folder is no longer available",
  "the invitation is invalid",
];

function isPrivateIp(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) {
    return true;
  }
  const parts = ip.split(".").map((n) => Number(n));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) return false;
  const [a, b] = parts;
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

async function assertPublicHttpUrl(raw: string): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("invalid");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("invalid");
  }
  const host = parsed.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("blocked");
  }
  if (isIP(host)) {
    if (isPrivateIp(host)) throw new Error("blocked");
    return parsed;
  }
  try {
    const { address } = await lookup(host);
    if (isPrivateIp(address)) throw new Error("blocked");
  } catch (e) {
    if (e instanceof Error && e.message === "blocked") throw e;
    throw new Error("nxdomain");
  }
  return parsed;
}

function classifyStatus(code: number): LinkHealthStatus | null {
  if (code >= 200 && code < 400) return "ok";
  if (code === 401 || code === 403 || code === 429) return "unknown";
  if (code === 404 || code === 410 || code === 422) return "dead";
  if (code >= 500) return "unknown";
  return "unknown";
}

function bodyLooksDead(text: string): boolean {
  const hay = text.toLowerCase();
  return DEAD_PHRASES.some((p) => hay.includes(p));
}

async function fetchOnce(url: string, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: "GET",
    redirect: "manual",
    signal,
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (compatible; CIDA-LinkCheck/1.0; +https://cida.jakeson.net)",
    },
  });
}

async function probe(raw: string): Promise<LinkHealthStatus> {
  let current = raw.trim();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_MS);
  try {
    for (let hop = 0; hop <= MAX_HOPS; hop++) {
      const safe = await assertPublicHttpUrl(current);
      let res: Response;
      try {
        res = await fetchOnce(safe.href, controller.signal);
      } catch (e) {
        if (controller.signal.aborted) return "unknown";
        const msg = e instanceof Error ? e.message : "";
        if (/ENOTFOUND|EAI_AGAIN|ENODATA/i.test(msg)) return "dead";
        if (/ECONNREFUSED|ECONNRESET|CERT/i.test(msg)) return "dead";
        return "unknown";
      }
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (!loc) return "unknown";
        current = new URL(loc, safe.href).href;
        continue;
      }
      const byCode = classifyStatus(res.status);
      if (byCode !== "ok") return byCode ?? "unknown";
      const ctype = res.headers.get("content-type") ?? "";
      if (!/text\/html|application\/xhtml/i.test(ctype)) return "ok";
      const buf = await res.arrayBuffer();
      const slice = Buffer.from(buf).subarray(0, MAX_BODY).toString("utf8");
      if (bodyLooksDead(slice)) return "dead";
      return "ok";
    }
    return "unknown";
  } catch (e) {
    const msg = e instanceof Error ? e.message : "";
    if (msg === "invalid" || msg === "nxdomain" || msg === "blocked") return "dead";
    return "unknown";
  } finally {
    clearTimeout(timer);
  }
}

export async function checkLinkHealth(url: string): Promise<LinkHealthStatus> {
  const key = url.trim();
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.status;
  const status = await probe(key);
  cache.set(key, { status, at: Date.now() });
  return status;
}

export async function checkLinkHealthMany(
  urls: string[],
  concurrency = 6
): Promise<Record<string, LinkHealthStatus>> {
  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  const out: Record<string, LinkHealthStatus> = {};
  let i = 0;
  async function worker() {
    while (i < unique.length) {
      const idx = i++;
      const u = unique[idx]!;
      out[u] = await checkLinkHealth(u);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, () => worker()));
  return out;
}
