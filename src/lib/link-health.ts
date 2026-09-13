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
  "file not found",
  "file/page not found",
  "error 404",
  "http 404",
  "we couldn't find that",
  "sorry, this page isn't available",
  "sorry, something went wrong",
  "this shared file is no longer available",
  "the shared file you're trying to access is no longer available",
  "this folder is no longer available",
  "the invitation is invalid",
  "itemnotfound",
  "item does not exist",
  "resource could not be found",
  "we've run into a problem",
  "that item is no longer available",
  "this item is no longer available",
  "no longer shared",
  "sharing link expired",
  "이 링크는 더 이상 사용할 수 없습니다",
  "이 항목이 삭제되었거나",
  "파일을 찾을 수 없습니다",
  "페이지를 찾을 수 없습니다",
  "더 이상 사용할 수 없",
];

const AUTH_HOSTS = [
  "login.microsoftonline.com",
  "login.live.com",
  "login.windows.net",
  "account.live.com",
  "login.microsoft.com",
];

function hostnameOf(raw: string): string {
  try {
    return new URL(raw).hostname.toLowerCase();
  } catch {
    return "";
  }
}

function isAuthWallHost(host: string): boolean {
  return AUTH_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

function isMicrosoftShareHost(host: string): boolean {
  return (
    host.endsWith(".sharepoint.com") ||
    host.endsWith(".sharepoint.us") ||
    host === "1drv.ms" ||
    host.endsWith(".1drv.ms") ||
    host === "onedrive.live.com" ||
    host.endsWith(".onedrive.live.com") ||
    host === "onedrive.live.net"
  );
}

function locationLooksDead(href: string): boolean {
  try {
    const u = new URL(href);
    const blob = `${u.pathname}${u.search}${u.hash}`.toLowerCase();
    if (/error=(itemnotfound|notfound|nofile|expired|invalid)/i.test(blob)) {
      return true;
    }
    if (/_layouts\/\d+\/error\.aspx/i.test(u.pathname)) return true;
    return false;
  } catch {
    return false;
  }
}

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
  if (code >= 200 && code < 300) return "ok";
  if (code >= 300 && code < 400) return "unknown";
  if (code === 401 || code === 403 || code === 429) return "unknown";
  if (code === 404 || code === 410 || code === 422) return "dead";
  if (code >= 500) return "unknown";
  return "unknown";
}

function bodyLooksDead(text: string): boolean {
  const hay = text.toLowerCase();
  if (DEAD_PHRASES.some((p) => hay.includes(p))) return true;
  if (/<title>[^<]*(404|file not found|page not found)[^<]*<\/title>/i.test(text)) {
    return true;
  }
  if (/"errorcode"\s*:\s*"(itemnotfound|notfound|resourcenotfound)"/i.test(text)) {
    return true;
  }
  if (/"code"\s*:\s*"itemnotfound"/i.test(text)) return true;
  return false;
}

async function fetchOnce(url: string, signal: AbortSignal): Promise<Response> {
  return fetch(url, {
    method: "GET",
    redirect: "manual",
    signal,
    headers: {
      Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
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
        const next = new URL(loc, safe.href).href;
        if (locationLooksDead(next)) return "dead";
        if (isAuthWallHost(hostnameOf(next))) return "unknown";
        current = next;
        continue;
      }
      const host = hostnameOf(safe.href);
      if (isAuthWallHost(host)) return "unknown";
      const byCode = classifyStatus(res.status);
      if (byCode !== "ok") return byCode ?? "unknown";
      const ctype = res.headers.get("content-type") ?? "";
      if (!/text\/html|application\/xhtml|application\/json|text\/plain/i.test(ctype)) {
        return "ok";
      }
      const limit = isMicrosoftShareHost(host) ? 200_000 : MAX_BODY;
      const buf = await res.arrayBuffer();
      const slice = Buffer.from(buf).subarray(0, limit).toString("utf8");
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
