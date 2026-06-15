import "dotenv/config";
import { setGlobalDispatcher } from "undici";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { migrate } from "drizzle-orm/neon-http/migrator";
import { dohAgent } from "../src/lib/net/doh";

// The local network's DNS refuses to resolve *.neon.tech hosts, so route the
// Neon HTTP driver's global fetch through the DoH-resolving dispatcher (same fix
// used for Polymarket). SNI/cert validation still uses the original hostname.
setGlobalDispatcher(dohAgent);

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add the Neon connection string to .env.");
}

const sql = neon(connectionString);
const db = drizzle(sql);

await migrate(db, { migrationsFolder: "./drizzle" });
console.log("✓ migrations applied");
