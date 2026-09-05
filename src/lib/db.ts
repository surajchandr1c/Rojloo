import { MongoClient, Db } from "mongodb";
import dns from "dns";

// Fix for environments/ISPs where default DNS fails to resolve MongoDB Atlas SRV records (ECONNREFUSED)
try {
  dns.setServers(["8.8.8.8", "8.8.4.4", "1.1.1.1"]);
} catch {
  // Ignore in restricted environments
}

const uri = process.env.MONGODB_URI?.trim().replace(/^['"]|['"]$/g, "");
const dbName = (process.env.MONGODB_DB || "rojlo")
  .trim()
  .replace(/^['"]|['"]$/g, "");
const isProduction = process.env.NODE_ENV === "production";
const retryAfterMs = 30_000;

// Validate URI format
if (uri && !uri.startsWith("mongodb+srv://") && !uri.startsWith("mongodb://")) {
  console.error("[db] Invalid MONGODB_URI format. Must start with mongodb:// or mongodb+srv://");
}

interface MongoCache {
  client: MongoClient | null;
  promise: Promise<{ client: MongoClient; db: Db }> | null;
}

declare global {
  var _mongoCache: MongoCache | undefined;
}

const globalCache: MongoCache =
  global._mongoCache ??
  (global._mongoCache = { client: null, promise: null });

let cachedDb: Db | null = null;
let connectionFailed = false;
let lastConnectionFailure: Error | null = null;
let lastConnectionFailureAt = 0;
let warned = false;

export async function getDb(): Promise<Db | null> {
  if (!uri) {
    if (!warned) {
      console.error(
        "[db] CRITICAL: MONGODB_URI is not configured in environment variables. " +
          "Set MONGODB_URI in Vercel dashboard: Settings > Environment Variables. " +
          "Falling back to in-memory store (data will not persist)."
      );
      warned = true;
    }
    connectionFailed = true;
    return null;
  }

  if (connectionFailed) {
    if (
      lastConnectionFailure &&
      Date.now() - lastConnectionFailureAt >= retryAfterMs
    ) {
      connectionFailed = false;
      lastConnectionFailure = null;
    }
  }

  if (connectionFailed) {
    if (!warned) {
      console.error(
        "[db] CRITICAL: MongoDB is unreachable. Check:\n" +
          "1. MONGODB_URI is correct in Vercel Environment Variables\n" +
          "2. MongoDB Atlas IP Whitelist includes 0.0.0.0/0 (or Vercel's IPs)\n" +
          "3. Database credentials are correct\n" +
          "Falling back to in-memory store (data will not persist)."
      );
      warned = true;
    }
    return null;
  }

  if (cachedDb) return cachedDb;

  if (!globalCache.promise) {
    const client = new MongoClient(uri, {
      socketTimeoutMS: 15000,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
    });
    globalCache.promise = client
      .connect()
      .then((connectedClient) => {
        console.log("[db] MongoDB connected successfully");
        globalCache.client = connectedClient;
        cachedDb = connectedClient.db(dbName);
        return { client: connectedClient, db: cachedDb! };
      })
      .catch((err) => {
        connectionFailed = true;
        lastConnectionFailure = err instanceof Error ? err : new Error(String(err));
        lastConnectionFailureAt = Date.now();
        globalCache.promise = null;
        if (!warned) {
          console.error(
            "[db] CRITICAL: MongoDB connection failed\n" +
              "Error Code:", err?.code || "UNKNOWN", "\n" +
              "Error Message:", err?.message || "Unknown error", "\n" +
              "Please verify:\n" +
              "1. MONGODB_URI is set in Vercel Environment Variables\n" +
              "2. IP Whitelist in MongoDB Atlas includes Vercel (0.0.0.0/0)\n" +
              "3. Database credentials in MONGODB_URI are correct\n" +
              "4. Cluster is running and not paused"
          );
          warned = true;
        }
        throw err;
      });
  }

  try {
    const { db } = await globalCache.promise;
    cachedDb = db;
    return db;
  } catch (error) {
    console.error("[db] Failed to get database:", error);
    return null;
  }
}

export function isDbAvailable(): boolean {
  return Boolean(uri) && !connectionFailed;
}
