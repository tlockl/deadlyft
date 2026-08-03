import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 requires an explicit driver adapter rather than a datasource URL
// baked into the schema.
//
// Unlike the SQLite file this replaced, there is no sensible default for the
// connection string. But the check for it, and the pool it opens, are both
// deferred until something actually queries: `next build` evaluates every
// route's module graph to collect page data, and it does that inside an image
// build where no environment exists yet. Constructing at module load fails the
// build itself, reported as "Failed to collect page data" for whichever route
// the build workers reached first — a message that says nothing about the
// missing variable that caused it.
function createClient() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set. Copy .env.example to .env and point it at your Postgres instance.",
    );
  }

  const adapter = new PrismaPg({
    connectionString,
    // Each app container gets its own pool, so this is a per-container ceiling
    // rather than a total. Postgres' own default max_connections is 100;
    // keeping this well under it leaves room for several containers plus a
    // psql session for whoever is debugging.
    max: 10,
    // Don't let a container hold connections open indefinitely against a
    // database that may have been restarted underneath it.
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
  });

  return new PrismaClient({ adapter });
}

// Dev hot-reload re-evaluates modules on every edit, which would otherwise open
// a new pool each time until the database runs out of connections.
const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

let client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (!client) {
    client = globalForPrisma.prisma ?? createClient();
    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    }
  }
  return client;
}

/**
 * Stands in for the client so importing this module stays free. The first
 * property touched builds the real one, so the connection string is still
 * required before a single query runs — just not before the build does.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const instance = getClient();
    const value = Reflect.get(instance, property, instance);
    return typeof value === "function" ? value.bind(instance) : value;
  },
}) as PrismaClient;
