import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { fetch as undiciFetch } from "undici";
import { dohAgent } from "../net/doh";
import * as schema from "./schema";

// Lazily initialised so merely importing this module (e.g. from the workflow
// graph in a unit test) has no side effects and does not require DATABASE_URL.
let cached: ReturnType<typeof drizzle<typeof schema>> | null = null;

export function getDb() {
  if (cached) return cached;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set. Add the Neon connection string to .env.");
  }

  // This network's resolver refuses *.neon.tech, so route ONLY Neon's fetches
  // through the DoH dispatcher (resolve via Cloudflare DoH, connect by IP, SNI
  // preserved). Scoped here rather than globally so the x402 self-call to
  // http://localhost is left untouched.
  neonConfig.fetchFunction = ((input: RequestInfo | URL, init?: RequestInit) =>
    undiciFetch(input as Parameters<typeof undiciFetch>[0], {
      ...(init as Parameters<typeof undiciFetch>[1]),
      dispatcher: dohAgent
    })) as unknown as typeof fetch;

  cached = drizzle(neon(connectionString), { schema });
  return cached;
}

export type Database = ReturnType<typeof getDb>;
export { schema };
