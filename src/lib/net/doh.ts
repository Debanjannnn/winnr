import { Agent } from "undici";

// Some ISPs hijack DNS for polymarket.com and return a dead IP, which makes
// server-side fetches hang. We resolve those hostnames via Cloudflare
// DNS-over-HTTPS (addressed by IP 1.1.1.1, so no system DNS is involved) and
// hand the resolved address to undici. SNI/cert validation still uses the
// original hostname, so TLS stays valid.

const IP_RE = /^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/;
const TTL_MS = 5 * 60 * 1000;
const cache = new Map<string, { ip: string; expires: number }>();

async function resolveViaDoh(hostname: string): Promise<string> {
  const now = Date.now();
  const cached = cache.get(hostname);
  if (cached && cached.expires > now) return cached.ip;

  const url = `https://1.1.1.1/dns-query?name=${encodeURIComponent(hostname)}&type=A`;
  const response = await fetch(url, { headers: { accept: "application/dns-json" } });
  if (!response.ok) throw new Error(`DoH lookup failed (${response.status})`);
  const data = (await response.json()) as { Answer?: { type: number; data: string }[] };
  const record = data.Answer?.find((answer) => answer.type === 1 && IP_RE.test(answer.data));
  if (!record) throw new Error(`No A record for ${hostname}`);

  cache.set(hostname, { ip: record.data, expires: now + TTL_MS });
  return record.data;
}

type LookupCallback = (
  err: NodeJS.ErrnoException | null,
  address: string | { address: string; family: number }[],
  family?: number
) => void;

export const dohAgent = new Agent({
  connect: {
    lookup(
      hostname: string,
      options: { all?: boolean | undefined } | undefined,
      callback: LookupCallback
    ) {
      const respond = (ip: string) => {
        // Node/undici may request all addresses (array form) or a single one.
        if (options?.all) callback(null, [{ address: ip, family: 4 }]);
        else callback(null, ip, 4);
      };
      if (IP_RE.test(hostname)) {
        respond(hostname);
        return;
      }
      resolveViaDoh(hostname)
        .then(respond)
        .catch((error: unknown) => callback(error as NodeJS.ErrnoException, [], 4));
    }
  }
});
