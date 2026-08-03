/*
 * Moves everything out of the old SQLite file and into Postgres, once.
 *
 *   DATABASE_URL=postgres://... node scripts/sqlite-to-postgres.js --dry-run
 *   DATABASE_URL=postgres://... node scripts/sqlite-to-postgres.js
 *
 * Run `npx prisma migrate deploy` against the Postgres database first: this
 * script fills tables, it doesn't create them.
 *
 * Config via env:
 *   DATABASE_URL  Postgres connection string (required)
 *   SQLITE_PATH   path to the old database (default ./dev.db)
 *
 * Three deliberate safety properties, because this runs against real history
 * that only exists in one place:
 *
 *   - The SQLite file is opened read-only. Whatever happens, the thing you are
 *     migrating away from is still intact afterwards.
 *   - Everything happens in one Postgres transaction. A failure on the last
 *     row leaves an empty database, not a half-populated one.
 *   - It refuses to run against a database that already has rows, rather than
 *     trying to merge. Re-running after a failure is safe precisely because
 *     the failure rolled back.
 */
const fs = require("fs");
const path = require("path");
const Database = require("better-sqlite3");
const { Client } = require("pg");

const ROOT = path.join(__dirname, "..");
const SQLITE_PATH = process.env.SQLITE_PATH || path.join(ROOT, "dev.db");
const DRY_RUN = process.argv.includes("--dry-run");

// A dry run does as much as it can with what it's given: with DATABASE_URL it
// also checks the target's schema and that it's empty, and without one it
// still reports what would be read. That second form is worth having -- it
// lets you confirm the old file is intact and readable before provisioning
// anything at all.
const CONNECT = Boolean(process.env.DATABASE_URL);

if (!CONNECT && !DRY_RUN) {
  console.error("DATABASE_URL is not set. Point it at the Postgres database.");
  process.exit(1);
}

/*
 * Insertion order matters: a child row can't be written before the row it
 * points at. This is that order, and it doubles as the list of what gets
 * copied -- if a model is ever added to the schema and not to this list, the
 * count check at the end is what catches it.
 */
const TABLES = [
  { name: "User", columns: ["id", "name", "email", "passwordHash", "unit", "createdAt"] },
  { name: "ProfilePhoto", columns: ["userId", "data", "mimeType", "byteSize", "updatedAt"] },
  { name: "MovementNote", columns: ["id", "userId", "key", "body", "updatedAt"] },
  { name: "BodyMetric", columns: ["id", "userId", "kind", "value", "recordedAt"] },
  { name: "Workout", columns: ["id", "userId", "title", "status", "startedAt", "finishedAt"] },
  { name: "Exercise", columns: ["id", "workoutId", "name", "position"] },
  { name: "WorkoutSet", columns: ["id", "exerciseId", "position", "reps", "weightKg"] },
  { name: "CardioEntry", columns: ["id", "workoutId", "name", "position", "durationSec", "targetSec"] },
];

// Columns Postgres will read as a timestamp, and columns it will read as an
// enum. Both need help; see `toTimestamp` and the casts in `placeholders`.
const TIMESTAMPS = new Set([
  "createdAt",
  "updatedAt",
  "recordedAt",
  "startedAt",
  "finishedAt",
]);

const ENUMS = {
  unit: "WeightUnit",
  status: "WorkoutStatus",
  kind: "BodyMetricKind",
};

/**
 * SQLite keeps these as ISO strings with an explicit offset; Prisma's Postgres
 * mapping is `timestamp(3)`, which has no offset and is read back as UTC.
 *
 * So the value is normalised to a UTC wall clock here rather than handed over
 * as a JavaScript Date. node-postgres serialises a Date using the *local*
 * offset, which on any machine that isn't UTC would silently shift every
 * timestamp in the database by that offset -- workouts landing at the wrong
 * hour, and back-dated weigh-ins landing on the wrong day.
 */
function toTimestamp(value) {
  if (value === null || value === undefined) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Unparseable timestamp: ${JSON.stringify(value)}`);
  }
  return date.toISOString().replace("T", " ").replace("Z", "");
}

/** $1, $2::"WeightUnit", ... -- enums need the cast, text params don't. */
function placeholders(columns) {
  return columns
    .map((column, index) => {
      const enumType = ENUMS[column];
      return enumType ? `$${index + 1}::"${enumType}"` : `$${index + 1}`;
    })
    .join(", ");
}

function quoted(columns) {
  return columns.map((column) => `"${column}"`).join(", ");
}

/**
 * Checks the file before better-sqlite3 gets it.
 *
 * Opened cold, a bad path produces `SqliteError: disk I/O error` with a stack
 * inside the driver, which says nothing about the actual problem. The one that
 * matters is the bind mount: Docker silently creates an empty *directory* when
 * a `-v` source path doesn't exist on the host, so a mistyped path or a copy
 * that never happened arrives as a directory where the database should be --
 * and a later `scp` then lands the file *inside* it, leaving the mount pointing
 * at a directory for good.
 */
function assertReadableSqlite(file) {
  let stat;
  try {
    stat = fs.statSync(file);
  } catch {
    throw new Error(
      `No file at ${file}.\n` +
        "If this is running in a container, check the -v source path exists on the host.",
    );
  }

  if (stat.isDirectory()) {
    throw new Error(
      `${file} is a directory, not a database.\n` +
        "Docker creates an empty directory when a bind mount's source path is\n" +
        "missing on the host, so this usually means the file wasn't where -v\n" +
        "said it was. Check the host path (a later copy may have landed the\n" +
        "database inside this directory), remove the directory Docker created,\n" +
        "and put the file there before re-running.",
    );
  }
  if (!stat.isFile()) {
    throw new Error(`${file} is not a regular file.`);
  }
  if (stat.size === 0) {
    throw new Error(`${file} is empty. An interrupted copy?`);
  }

  // Every SQLite database begins with this, so a truncated or partial transfer
  // is caught here rather than as an I/O error partway through reading.
  const header = Buffer.alloc(16);
  const fd = fs.openSync(file, "r");
  try {
    fs.readSync(fd, header, 0, 16, 0);
  } finally {
    fs.closeSync(fd);
  }
  if (header.toString("latin1", 0, 15) !== "SQLite format 3") {
    throw new Error(
      `${file} doesn't start like a SQLite database (${stat.size} bytes).\n` +
        "Most likely a partial copy — check the size against the original.",
    );
  }
}

async function main() {
  assertReadableSqlite(SQLITE_PATH);

  const sqlite = new Database(SQLITE_PATH, { readonly: true, fileMustExist: true });
  const pg = CONNECT
    ? new Client({ connectionString: process.env.DATABASE_URL })
    : null;
  if (pg) await pg.connect();

  try {
    const source = {};
    for (const table of TABLES) {
      source[table.name] = sqlite.prepare(`SELECT * FROM "${table.name}"`).all();
    }

    console.log(`Reading ${SQLITE_PATH}`);
    for (const table of TABLES) {
      console.log(`  ${table.name.padEnd(14)} ${source[table.name].length}`);
    }

    // Every timestamp is normalised up front rather than row by row during the
    // insert, so an unparseable one fails before anything has been written
    // even in the dry run -- which is the point of having a dry run.
    let timestamps = 0;
    for (const table of TABLES) {
      for (const row of source[table.name]) {
        for (const column of table.columns) {
          if (TIMESTAMPS.has(column)) {
            toTimestamp(row[column]);
            timestamps += 1;
          }
        }
      }
    }
    console.log(`  ${"timestamps".padEnd(14)} ${timestamps} parsed`);

    if (!pg) {
      console.log("\n--dry-run with no DATABASE_URL: target not checked.");
      return;
    }

    // The schema has to exist already. Failing here with a clear message beats
    // failing on the first INSERT with "relation does not exist".
    const present = await pg.query(
      `SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = ANY($1)`,
      [TABLES.map((table) => table.name)],
    );
    if (present.rowCount !== TABLES.length) {
      const found = new Set(present.rows.map((row) => row.table_name));
      const missing = TABLES.map((t) => t.name).filter((n) => !found.has(n));
      throw new Error(
        `Postgres is missing ${missing.join(", ")}. Run "npx prisma migrate deploy" first.`,
      );
    }

    // Refuse to merge into an existing database.
    const occupied = [];
    for (const table of TABLES) {
      const { rows } = await pg.query(`SELECT COUNT(*)::int AS c FROM "${table.name}"`);
      if (rows[0].c > 0) occupied.push(`${table.name} (${rows[0].c})`);
    }
    if (occupied.length > 0) {
      throw new Error(
        `Postgres already has rows in ${occupied.join(", ")}.\n` +
          "This script only fills an empty database. To start over, drop and " +
          "recreate it, then re-run prisma migrate deploy.",
      );
    }

    if (DRY_RUN) {
      console.log("\n--dry-run: target is empty and ready; nothing written.");
      return;
    }

    await pg.query("BEGIN");

    for (const table of TABLES) {
      const statement =
        `INSERT INTO "${table.name}" (${quoted(table.columns)}) ` +
        `VALUES (${placeholders(table.columns)})`;

      for (const row of source[table.name]) {
        const values = table.columns.map((column) => {
          const value = row[column];
          if (TIMESTAMPS.has(column)) return toTimestamp(value);
          // BLOBs arrive as Buffers, which node-postgres sends as bytea.
          return value === undefined ? null : value;
        });
        await pg.query(statement, values);
      }
    }

    // Compare both sides *inside* the transaction, so a mismatch rolls the
    // whole thing back rather than leaving a database that looks migrated.
    const report = [];
    let mismatched = false;
    for (const table of TABLES) {
      const { rows } = await pg.query(`SELECT COUNT(*)::int AS c FROM "${table.name}"`);
      const from = source[table.name].length;
      const to = rows[0].c;
      if (from !== to) mismatched = true;
      report.push({ table: table.name, sqlite: from, postgres: to, ok: from === to });
    }

    if (mismatched) {
      await pg.query("ROLLBACK");
      console.table(report);
      throw new Error("Row counts don't match. Rolled back; nothing was written.");
    }

    await pg.query("COMMIT");

    console.log("\nMigrated:");
    console.table(report);
    console.log(`${SQLITE_PATH} was opened read-only and is unchanged.`);
  } catch (error) {
    // The rollback is best-effort: if the connection is what failed, the
    // transaction is already gone.
    if (pg) await pg.query("ROLLBACK").catch(() => {});
    console.error(`\nMigration failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    sqlite.close();
    if (pg) await pg.end();
  }
}

// The preflight above runs before any connection is opened, so its failures
// land here rather than in main's own handler. Reported the same way: a
// sentence, not a stack trace from inside a driver.
main().catch((error) => {
  console.error(`\nMigration failed: ${error.message}`);
  process.exitCode = 1;
});
