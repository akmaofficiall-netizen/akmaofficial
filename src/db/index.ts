import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { PGlite } from "@electric-sql/pglite";
import { Pool } from "pg";
import * as schema from "./schema";
import fs from "fs";
import path from "path";
import { ensureDatabaseSchema } from "./ensureSchema";
import { seedDatabase } from "./seed";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __akmaDbInstance?: any;
  __akmaDbInitPromise?: Promise<void>;
  __akmaPgliteClient?: PGlite;
  __arenaNextJsPostgresqlPool?: Pool;
};

function createDatabaseInstance() {
  if (databaseUrl && !databaseUrl.includes("127.0.0.1:5432/akma") && !databaseUrl.includes("localhost:5432")) {
    const pool =
      globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 5000,
      });
    if (process.env.NODE_ENV !== "production") {
      globalForDb.__arenaNextJsPostgresqlPool = pool;
    }
    return drizzlePg(pool, { schema });
  }

  // Persistent PGlite disk storage
  const dataDir = path.join(process.cwd(), ".data", "pglite");
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
  } catch (e) {
    // Ignore directory creation errors
  }

  if (!globalForDb.__akmaPgliteClient) {
    globalForDb.__akmaPgliteClient = new PGlite(dataDir);
  }

  return drizzlePglite(globalForDb.__akmaPgliteClient, { schema });
}

export const db = globalForDb.__akmaDbInstance ?? createDatabaseInstance();

if (process.env.NODE_ENV !== "production") {
  globalForDb.__akmaDbInstance = db;
}

export async function ensureDbReady() {
  if (!globalForDb.__akmaDbInitPromise) {
    globalForDb.__akmaDbInitPromise = (async () => {
      try {
        await ensureDatabaseSchema();
        await seedDatabase();
      } catch (err) {
        console.error("Database ready bootstrap warning:", err);
      }
    })();
  }
  return globalForDb.__akmaDbInitPromise;
}

// Auto-trigger bootstrap on module load in background
ensureDbReady().catch((e) => console.warn("Background db init:", e));
