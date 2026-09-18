import { MongoClient, Db } from "mongodb";
import dns from "dns";

// Configure custom DNS once at module initialization for local ISP resolution (e.g. Jio/Airtel SRV lookup).
// Skip on Vercel/cloud where internal AWS/Vercel DNS resolver is faster and already configured.
if (!process.env.VERCEL) {
  try {
    dns.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);
  } catch {
    // Ignore in restricted environments
  }
}

const uri = process.env.MONGODB_URI?.trim().replace(/^['"]|['"]$/g, "");
const dbName = (process.env.MONGODB_DB || "rojlo")
  .trim()
  .replace(/^['"]|['"]$/g, "");
const retryAfterMs = 3_000;

let resolvedUri: string | null = null;

/**
 * Resolves mongodb+srv:// to a direct standard replica set URI using a dedicated
 * public DNS resolver (8.8.8.8, 1.1.1.1). This circumvents local ISP/Windows DNS
 * issues where querySrv fails with ECONNREFUSED on 127.0.0.1 or restricted port 53.
 */
async function getEffectiveMongoUri(baseUri: string): Promise<string> {
  if (resolvedUri) return resolvedUri;
  if (!baseUri.startsWith("mongodb+srv://")) {
    resolvedUri = baseUri;
    return resolvedUri;
  }

  const parsed = baseUri.match(
    /^mongodb\+srv:\/\/([^:]+):([^@]+)@([^\/\?]+)(?:\/([^\?]*))?(?:\?(.*))?$/
  );
  if (!parsed) {
    resolvedUri = baseUri;
    return resolvedUri;
  }

  const [, user, pass, hostname, pathDb, queryStr] = parsed;

  try {
    const resolver = new dns.promises.Resolver();
    resolver.setServers(["8.8.8.8", "1.1.1.1", "8.8.4.4"]);

    const [srvRecords, txtRecords] = await Promise.all([
      resolver.resolveSrv(`_mongodb._tcp.${hostname}`),
      resolver.resolveTxt(hostname).catch(() => []),
    ]);

    if (srvRecords && srvRecords.length > 0) {
      const hostList = srvRecords
        .map((r) => `${r.name}:${r.port}`)
        .join(",");
      const params = new URLSearchParams(queryStr || "");
      params.set("ssl", "true");

      if (txtRecords && txtRecords.length > 0) {
        for (const group of txtRecords) {
          const line = Array.isArray(group) ? group.join("") : String(group);
          const search = new URLSearchParams(line);
          search.forEach((v, k) => {
            if (!params.has(k)) {
              params.set(k, v);
            }
          });
        }
      }

      resolvedUri = `mongodb://${user}:${pass}@${hostList}/${pathDb || ""}?${params.toString()}`;
      return resolvedUri;
    }
  } catch (err) {
    // If resolver fails (e.g. offline or restrictive firewall), fall back to base URI
    console.warn(
      "[db] SRV resolver fallback notice:",
      err instanceof Error ? err.message : String(err)
    );
  }

  resolvedUri = baseUri;
  return resolvedUri;
}

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
    globalCache.promise = (async () => {
      const effectiveUri = await getEffectiveMongoUri(uri);
      const isProduction = process.env.NODE_ENV === "production";
      const client = new MongoClient(effectiveUri, {
        maxPoolSize: 20,
        minPoolSize: isProduction ? 2 : 0,
        maxIdleTimeMS: 60000,
        socketTimeoutMS: 20000,
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000,
      });

      const connectedClient = await client.connect();
      console.log("[db] MongoDB connected successfully");
      globalCache.client = connectedClient;
      cachedDb = connectedClient.db(dbName);
      connectionFailed = false;
      lastConnectionFailure = null;
      warned = false;
      return { client: connectedClient, db: cachedDb! };
    })().catch((err) => {
      connectionFailed = true;
      lastConnectionFailure = err instanceof Error ? err : new Error(String(err));
      lastConnectionFailureAt = Date.now();
      globalCache.promise = null;
      resolvedUri = null;
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
