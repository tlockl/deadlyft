/*
 * Seeds back-dated demo workouts and body measurements, so charts and history
 * have something real to show without waiting weeks to accumulate it.
 *
 *   DATABASE_URL=postgres://... npm run seed
 *
 * The app deliberately records start and finish times server-side, so there is
 * no way to create a dated workout through the UI. This writes to the database
 * directly instead.
 *
 * Every row it creates is prefixed "seed_", so re-running replaces the demo
 * data and never touches anything you logged yourself:
 *
 *   DELETE FROM "Workout" WHERE id LIKE 'seed_%';
 *   DELETE FROM "BodyMetric" WHERE id LIKE 'seed_%';
 *
 * Config via env:
 *   DATABASE_URL  Postgres connection string (required)
 *   DEMO_EMAIL    account to attach the workouts to (default tristen@example.test)
 *
 * Identifiers are quoted throughout. Prisma created the tables as "User",
 * "startedAt" and so on, and Postgres folds an unquoted identifier to lower
 * case -- so `FROM User` looks for a table called "user" and doesn't find one.
 */
const { Client } = require("pg");

const EMAIL = process.env.DEMO_EMAIL || "tristen@example.test";

const LB_TO_KG = 0.45359237;
const DAY = 24 * 60 * 60 * 1000;

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Point it at the Postgres database.");
  process.exit(1);
}

/*
 * Prisma maps DateTime to `timestamp(3)`, which carries no offset and is read
 * back as UTC. Passing a JavaScript Date would let node-postgres serialise it
 * with the *local* offset and shift every seeded workout by that much, so the
 * UTC wall clock goes over as a string instead.
 */
const stamp = (ms) =>
  new Date(ms).toISOString().replace("T", " ").replace("Z", "");

// [days ago, title, [[exercise, [[lb, reps], ...]], ...]]
const PLAN = [
  [56, "Push Day", [["Bench Press", [[135, 8], [135, 8], [135, 7]]], ["Overhead Press", [[75, 10], [75, 9]]]]],
  [49, "Push Day", [["Bench Press", [[140, 8], [140, 7], [135, 9]]], ["Overhead Press", [[80, 8], [80, 8]]]]],
  [45, "Leg Day", [["Back Squat", [[185, 5], [185, 5], [185, 5]]], ["Pull-up / Chin-up", [[0, 8], [0, 7]]]]],
  [35, "Push Day", [["Bench Press", [[145, 8], [145, 7], [140, 8]]], ["Overhead Press", [[85, 8], [80, 9]]]]],
  [28, "Leg Day", [["Back Squat", [[205, 5], [205, 5], [195, 6]]], ["Pull-up / Chin-up", [[10, 6], [0, 9]]]]],
  [21, "Push Day", [["Bench Press", [[150, 6], [150, 6], [145, 8]]], ["Overhead Press", [[85, 9], [85, 8]]]]],
  [14, "Leg Day", [["Back Squat", [[225, 5], [225, 4], [205, 7]]], ["Pull-up / Chin-up", [[15, 6], [10, 8]]]]],
  [7, "Push Day", [["Bench Press", [[160, 5], [155, 6], [150, 8]]], ["Overhead Press", [[90, 7], [85, 9]]]]],
  [3, "Leg Day", [["Back Squat", [[235, 4], [225, 6], [215, 8]]], ["Pull-up / Chin-up", [[20, 5], [15, 7]]]]],
  [1, "Push Day", [["Bench Press", [[135, 10], [155, 8], [175, 6]]], ["Overhead Press", [[95, 6], [90, 8]]]]],
];

// Body measurements, so the Body tab opens on a real trend rather than an
// empty chart. [days ago, lb] -- a slow gain with the day-to-day noise a real
// scale has, because a perfectly smooth line doesn't look like a person.
const WEIGH_INS = [
  [56, 178.4], [52, 179.2], [48, 178.6], [44, 180.1], [40, 180.8],
  [35, 180.2], [31, 181.6], [27, 182.4], [23, 181.9], [18, 183.2],
  [14, 183.0], [10, 184.1], [6, 184.8], [2, 185.4], [0, 185.9],
];

// [days ago, percent] -- measured far less often than weight, which is the
// point: each metric is its own series and they don't have to line up.
const BODY_FATS = [
  [56, 19.4],
  [28, 18.6],
  [2, 17.9],
];

// Entered once, months ago, and never touched since.
const HEIGHT_IN = 71;

// A measurement is a morning thing, so put the weigh-ins before breakfast
// rather than at whatever time the script ran.
const morningOf = (daysAgo) => {
  const day = new Date(Date.now() - daysAgo * DAY);
  day.setHours(7, 20, 0, 0);
  return day.getTime();
};

const INSERT_WORKOUT =
  'INSERT INTO "Workout" ("id", "userId", "title", "status", "startedAt", "finishedAt") ' +
  "VALUES ($1, $2, $3, 'COMPLETED'::\"WorkoutStatus\", $4, $5)";
const INSERT_EXERCISE =
  'INSERT INTO "Exercise" ("id", "workoutId", "name", "position") VALUES ($1, $2, $3, $4)';
const INSERT_SET =
  'INSERT INTO "WorkoutSet" ("id", "exerciseId", "position", "reps", "weightKg") ' +
  "VALUES ($1, $2, $3, $4, $5)";
const INSERT_METRIC =
  'INSERT INTO "BodyMetric" ("id", "userId", "kind", "value", "recordedAt") ' +
  'VALUES ($1, $2, $3::"BodyMetricKind", $4, $5)';

async function main() {
  const db = new Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();

  try {
    const { rows } = await db.query('SELECT "id" FROM "User" WHERE "email" = $1', [
      EMAIL,
    ]);
    if (rows.length === 0) {
      throw new Error(
        `No account with email "${EMAIL}". Register it in the app first, or set DEMO_EMAIL.`,
      );
    }
    const userId = rows[0].id;

    await db.query("BEGIN");

    await db.query(`DELETE FROM "Workout" WHERE "id" LIKE 'seed_%'`);
    await db.query(`DELETE FROM "BodyMetric" WHERE "id" LIKE 'seed_%'`);

    await db.query(INSERT_METRIC, [
      "seed_bh",
      userId,
      "HEIGHT",
      HEIGHT_IN * 2.54,
      stamp(morningOf(56)),
    ]);

    for (const [i, [daysAgo, lb]] of WEIGH_INS.entries()) {
      await db.query(INSERT_METRIC, [
        `seed_bw${i}`,
        userId,
        "WEIGHT",
        lb * LB_TO_KG,
        stamp(morningOf(daysAgo)),
      ]);
    }

    for (const [i, [daysAgo, percent]] of BODY_FATS.entries()) {
      await db.query(INSERT_METRIC, [
        `seed_bf${i}`,
        userId,
        "BODY_FAT",
        percent,
        stamp(morningOf(daysAgo)),
      ]);
    }

    for (const [w, [daysAgo, title, exercises]] of PLAN.entries()) {
      // Land each session at a varied evening hour rather than whatever time
      // the script happened to run, so the history doesn't read as machine-made.
      const day = new Date(Date.now() - daysAgo * DAY);
      day.setHours(17 + (w % 3), (w * 17) % 60, 0, 0);
      const startedAt = day.getTime();
      const duration = (44 + ((w * 7) % 25)) * 60 * 1000;

      const workoutId = `seed_w${w}`;
      await db.query(INSERT_WORKOUT, [
        workoutId,
        userId,
        title,
        stamp(startedAt),
        stamp(startedAt + duration),
      ]);

      for (const [e, [name, sets]] of exercises.entries()) {
        const exerciseId = `seed_e${w}_${e}`;
        await db.query(INSERT_EXERCISE, [exerciseId, workoutId, name, e]);
        for (const [s, [lb, reps]] of sets.entries()) {
          await db.query(INSERT_SET, [
            `seed_s${w}_${e}_${s}`,
            exerciseId,
            s,
            reps,
            lb * LB_TO_KG,
          ]);
        }
      }
    }

    await db.query("COMMIT");

    // MAX(name) rather than a bare `e."name"`: Postgres requires every
    // selected column to be grouped or aggregated, and the grouping here is on
    // LOWER(name) so that spellings collapse the way the app collapses them.
    const summary = await db.query(
      `SELECT MAX(e."name") AS name,
              COUNT(DISTINCT w."id")::int AS sessions,
              ROUND(MAX(s."weightKg") / ${LB_TO_KG}) AS "bestLb"
         FROM "Exercise" e
         JOIN "Workout" w ON w."id" = e."workoutId"
         JOIN "WorkoutSet" s ON s."exerciseId" = e."id"
        WHERE w."userId" = $1
     GROUP BY LOWER(e."name")
     ORDER BY sessions DESC`,
      [userId],
    );

    console.log(
      `seeded ${PLAN.length} workouts, ${WEIGH_INS.length} weigh-ins, ` +
        `${BODY_FATS.length} body fat readings and a height for ${EMAIL}`,
    );
    console.table(summary.rows);
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    console.error(`Seeding failed: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

main();
