/*
 * Seeds back-dated demo workouts, so charts and history have something real to
 * show without waiting weeks to accumulate it.
 *
 *   npm run seed
 *
 * The app deliberately records start and finish times server-side, so there is
 * no way to create a dated workout through the UI. This writes to SQLite
 * directly instead.
 *
 * Every row it creates is prefixed "seed_", so re-running replaces the demo
 * data and never touches anything you logged yourself:
 *
 *   DELETE FROM Workout WHERE id LIKE 'seed_%';
 *
 * Config via env:
 *   DEMO_EMAIL   account to attach the workouts to (default tristen@example.test)
 *   DATABASE     path to the SQLite file (default ./dev.db)
 */
const path = require("path");
const Database = require("better-sqlite3");

const ROOT = path.join(__dirname, "..");
const DB_PATH = process.env.DATABASE || path.join(ROOT, "dev.db");
const EMAIL = process.env.DEMO_EMAIL || "tristen@example.test";

const LB_TO_KG = 0.45359237;
const DAY = 24 * 60 * 60 * 1000;

// Prisma stores SQLite datetimes as ISO strings with an explicit offset.
const iso = (ms) => new Date(ms).toISOString().replace("Z", "+00:00");

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

const db = new Database(DB_PATH);

const user = db.prepare("SELECT id FROM User WHERE email = ?").get(EMAIL);
if (!user) {
  console.error(
    `No account with email "${EMAIL}". Register it in the app first, or set DEMO_EMAIL.`,
  );
  process.exit(1);
}

const insertWorkout = db.prepare(
  "INSERT INTO Workout (id, userId, title, status, startedAt, finishedAt) VALUES (?, ?, ?, 'COMPLETED', ?, ?)",
);
const insertExercise = db.prepare(
  "INSERT INTO Exercise (id, workoutId, name, position) VALUES (?, ?, ?, ?)",
);
const insertSet = db.prepare(
  "INSERT INTO WorkoutSet (id, exerciseId, position, reps, weightKg) VALUES (?, ?, ?, ?, ?)",
);

db.transaction(() => {
  db.prepare("DELETE FROM Workout WHERE id LIKE 'seed_%'").run();

  PLAN.forEach(([daysAgo, title, exercises], w) => {
    // Land each session at a varied evening hour rather than whatever time the
    // script happened to run, so the history doesn't read as machine-made.
    const day = new Date(Date.now() - daysAgo * DAY);
    day.setHours(17 + (w % 3), (w * 17) % 60, 0, 0);
    const startedAt = day.getTime();
    const duration = (44 + ((w * 7) % 25)) * 60 * 1000;

    const workoutId = `seed_w${w}`;
    insertWorkout.run(
      workoutId,
      user.id,
      title,
      iso(startedAt),
      iso(startedAt + duration),
    );

    exercises.forEach(([name, sets], e) => {
      const exerciseId = `seed_e${w}_${e}`;
      insertExercise.run(exerciseId, workoutId, name, e);
      sets.forEach(([lb, reps], s) => {
        insertSet.run(`seed_s${w}_${e}_${s}`, exerciseId, s, reps, lb * LB_TO_KG);
      });
    });
  });
})();

const summary = db
  .prepare(
    `SELECT e.name,
            COUNT(DISTINCT w.id) AS sessions,
            ROUND(MAX(s.weightKg) / ${LB_TO_KG}) AS bestLb
       FROM Exercise e
       JOIN Workout w ON w.id = e.workoutId
       JOIN WorkoutSet s ON s.exerciseId = e.id
      WHERE w.userId = ?
   GROUP BY LOWER(e.name)
   ORDER BY sessions DESC`,
  )
  .all(user.id);

console.log(`seeded ${PLAN.length} workouts for ${EMAIL}`);
console.table(summary);
