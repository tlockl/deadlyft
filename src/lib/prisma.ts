import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

// Prisma 7 requires an explicit driver adapter rather than a datasource URL
// baked into the schema.
//
// Unlike the SQLite file this replaced, there is no sensible default here: a
// wrong or missing connection string should stop the process at boot with a
// clear message, not surface later as a query failing in a request.
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and point it at your Postgres instance.",
  );
}

const adapter = new PrismaPg({
  connectionString,
  // Each app container gets its own pool, so this is a per-container ceiling
  // rather than a total. Postgres' own default max_connections is 100; keeping
  // this well under it leaves room for several containers plus a psql session
  // for whoever is debugging.
  max: 10,
  // Don't let a container hold connections open indefinitely against a
  // database that may have been restarted underneath it.
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

// Dev hot-reload re-evaluates modules on every edit, which would otherwise open
// a new pool each time until the database runs out of connections.
const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createClient>;
};

function createClient() {
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
