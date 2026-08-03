<p align="center">
  <img src="docs/icon.png" width="128" alt="DEADLYFT app icon">
</p>

<h1 align="center">DEADLYFT</h1>

A mobile-first workout tracker. Log your sets, reps and weight; every workout is
stamped with the date and time automatically and kept in a history you can look
back through. Each person gets their own account and their own private log.

Styled to feel like a native iOS app — Apple's semantic system colours, SF Pro,
inset grouped lists, a translucent tab bar, safe-area insets, automatic
light/dark mode. Add it to your iPhone home screen and it opens without Safari
chrome.

Built with Next.js 16, React 19, Tailwind v4, Prisma 7 and SQLite.

---

## Screenshots

| Home | Logging a workout | Progress over time |
| :---: | :---: | :---: |
| ![Home screen showing total weight moved and recent workouts](docs/screenshots/home.png) | ![Live workout logger with a running total](docs/screenshots/logger.png) | ![Line chart of bench press top-set weight over two months](docs/screenshots/progress.png) |
| Lifetime and 7-day totals, plus recent sessions | Sets, reps and a live cumulative total | Top-set weight per session, with a Volume toggle |

| History | Workout detail | Profile |
| :---: | :---: | :---: |
| ![Workout history grouped by month](docs/screenshots/history.png) | ![A saved workout's set-by-set breakdown](docs/screenshots/workout-detail.png) | ![Profile screen with photo and unit preference](docs/screenshots/profile.png) |
| Every finished workout, grouped by month | Every set, with per-exercise volume | Photo, display name and weight unit |

<sub>Shown in dark mode with demo data. The app follows your phone's light/dark setting.</sub>

---

## What it does today

**Accounts**

- Email and password sign-up, with bcrypt-hashed passwords and 30-day session cookies
- Everyone's data is private to them: another user asking for your workout gets a 404
- A profile photo, or automatic initials on a colour derived from your name
- Choose pounds or kilograms; switching restates your entire history

**Logging a workout**

- Tap **Start Workout** and add exercises, then sets, then weight and reps
- **Cumulative weight moved** updates live as you type — the headline number
- A stopwatch runs while you train
- Start and finish times are recorded by the server, so nothing can be backdated
- Close the app mid-session and the workout stays open; Home offers to resume it
- **Nothing typed is lost by leaving the screen.** Wander off to History, reload
  the page, or have iOS kill the app between sets — the sets, the workout name
  and the cardio timers all come back, and a timer that was running is still
  running, with the time you were away counted
- Bodyweight movements work: leave the weight blank

**Cardio, in the same session**

- Tap **Add Cardio** inside a workout you already have going — it sits alongside
  the sets rather than in a separate log
- **Countdown** for a fixed block: set a target (or tap 5/10/15/20/30 minutes),
  and it stops itself at zero with a chime
- **Count Up** for an open-ended goal: start it and let it run
- Pause and resume; only the time actually running is counted
- Locking your phone doesn't lose time — the timers read the wall clock rather
  than counting ticks
- A workout can be nothing but cardio, so a run on its own is still a workout

**Looking back**

- **History** — every finished workout, grouped by month, with volume, set count and duration
- **Workout detail** — the full set-by-set breakdown, with per-exercise volume,
  and what each cardio timer recorded
- **Exercises** — every movement you've logged, with your best-ever weight
- **Progress charts** — a line chart per movement showing top-set weight over
  time, with a Volume toggle. Tap any point to see that session and the change
  from the one before.
- Home shows lifetime weight moved, a 7-day total and your recent workouts

---

## Getting it running

You'll need **Node 20 or newer**.

```bash
npm install
cp .env.example .env
npx prisma generate
npx prisma migrate deploy
```

Then open `.env` and set a session secret — this signs the login cookie, so it
must not be blank:

```bash
openssl rand -base64 32
```

Paste the result as `SESSION_SECRET="..."`. Now start it:

```bash
npm run dev
```

Open <http://localhost:3000> and create an account.

### If it crashes on startup

If you see an error about a missing native module, `better-sqlite3` didn't
finish compiling — recent npm versions hold back dependency install scripts:

```bash
npm rebuild better-sqlite3
```

### Using it on your phone

Both devices need to be on the same Wi-Fi. Find this machine's address:

```bash
ipconfig getifaddr en0
```

Then open `http://<that-address>:3000` on your phone.

For real use rather than a quick look, run a production build instead. It's
dramatically lighter over Wi-Fi and has no dev tooling to go wrong:

```bash
npm run build && npm start
```

If you do use `npm run dev` from a phone, note that the dev server blocks
cross-origin requests to its own dev-only assets. Your phone is a different
origin than `localhost`, so its HMR socket gets refused, the page never
finishes hydrating, and anything driven by JavaScript silently does nothing —
while plain forms keep working, which makes it look like one specific button is
broken. `allowedDevOrigins` in `next.config.ts` already covers the usual home
router ranges to prevent this.

### Starting over

The database is a single file. To wipe everything and begin fresh:

```bash
rm dev.db && npx prisma migrate dev
```

To move your data to another machine, copy `dev.db` across — photos and all.

---

## How it fits together

| Area | Where |
| --- | --- |
| Database schema | `prisma/schema.prisma` |
| Prisma client + SQLite adapter | `src/lib/prisma.ts` |
| Session cookies (JWT via `jose`) | `src/lib/session.ts` |
| Auth checks / current user | `src/lib/dal.ts` |
| Optimistic route gating | `src/proxy.ts` |
| Server actions | `src/app/actions/` |
| Volume, units, exercise grouping | `src/lib/volume.ts`, `units.ts`, `exercises.ts` |
| Cardio rules, shared wall clock | `src/lib/cardio.ts`, `clock.ts`, `chime.ts` |
| Draft shape + surviving a reload | `src/lib/drafts.ts` |
| Screens | `src/app/(app)/`, `src/app/log/[id]/` |
| Design tokens | `src/app/globals.css` |
| Maintenance scripts | `scripts/` (see [scripts/README.md](scripts/README.md)) |

### Maintenance scripts

| Command | What it does |
| --- | --- |
| `npm run icons` | Regenerates every icon from `assets/icon-source.png` |
| `npm run seed` | Fills the demo account with back-dated workouts |
| `npm run screenshots` | Recaptures the screenshots above |

### Screens

- `/` — greeting, start/resume a workout, lifetime and 7-day totals, recent workouts
- `/log/[id]` — the live logger (full screen, no tab bar, like an iOS modal)
- `/history` — every finished workout, grouped by month
- `/workout/[id]` — a saved workout's full set-by-set breakdown
- `/exercises` — every movement you've logged, most recent first
- `/exercises/[name]` — progress chart for one movement, plus every session
- `/profile` — photo, display name, weight unit, account info, sign out
- `/api/users/[id]/photo` — a user's photo, authorized per viewer

---

## Design decisions worth knowing

**Weights are stored in kilograms, always.** Each user picks lb or kg and every
read path converts on the way out (`src/lib/units.ts`). Switching units
restates your existing history rather than reinterpreting the numbers.

**Cumulative volume is never stored.** Total weight moved is `reps × weight`
summed across sets, computed on read in `src/lib/volume.ts`, so it can't drift
out of sync with the sets it summarises.

**Timestamps come from the server.** `startedAt` is written when you tap Start
Workout and `finishedAt` when you tap Finish. The client never supplies either.

**Authorization lives next to the data.** `src/proxy.ts` redirects signed-out
traffic, but that check is optimistic — cookie only, no database, because it
runs on every request including prefetches. Every page and every server action
independently calls the DAL and re-checks ownership. Requesting someone else's
data returns 404, not 403, so existence isn't leaked either.

**Actions that need no client state are plain forms.** Starting a workout,
signing in, saving your profile and uploading a photo are all `<form
action={...}>` in a Server Component, so they submit as ordinary HTML POSTs
even if the page hasn't hydrated. Only the submit button is a Client Component,
for the pending label. An `onClick` handler would have nothing to fall back on.
The logger itself genuinely needs JavaScript — it builds the whole workout in
client state before saving.

**Movements are matched case-insensitively, and the most common spelling wins.**
"Bench Press" and "bench press" are one movement (`src/lib/exercises.ts`), and
the name shown is whichever spelling you've used most often — so typing it in
lower case once doesn't rename months of history. Ties break toward the most
recent, so a deliberate rename still takes effect.

**The progress chart is hand-rolled SVG.** No charting library, so there's
nothing to keep up to date and it inherits the iOS palette for free. Its y-axis
deliberately does not start at zero — the chart is about change, and a zeroed
axis flattens every real difference. With a single session it draws one dot and
no line rather than implying a trend that isn't there.

**Profile photos live in the database, not on disk.** A `ProfilePhoto` row
holds the bytes, in its own table so a `findUnique` on `User` without an
explicit `select` can never drag an image into memory. Keeping them in SQLite
also means the whole app is still one file you can copy between machines.

**Photos are shrunk in the browser, and validated on the server.** The picker
centre-crops to a square, scales to 512px and re-encodes as JPEG before
uploading (a 327KB PNG becomes ~10KB). None of that is trusted:
`detectImageType` re-identifies the file from its magic bytes and accepts only
JPEG/PNG/WebP. That allowlist is the point — SVG is an XML document that can
carry script, and these bytes are served from our own origin, so an SVG
uploaded as `avatar.jpg` would be stored XSS. SVG has no binary signature, so
it can never match.

**Photo responses revalidate rather than cache.** `Cache-Control: private` only
bars *shared* caches; the browser's own is expressly allowed. With a long
`max-age`, a photo outlives the session, so on a shared phone the next person
to sign in could still load the previous user's photo from disk. The route
sends `private, no-cache, must-revalidate` with an ETag, so the browser keeps
its copy but must revalidate — which re-runs authorization — and unchanged
photos come back as a bodyless 304.

**Slugs are encoded and decoded in one place.** Next hands dynamic route
segments over *still percent-encoded*, so `exerciseSlug` / `decodeExerciseSlug`
are a matched pair. This is what makes a movement called "Pull-up / Chin-up"
work as a URL.

**Cardio is its own table, not an `Exercise` with zero-weight sets.** Folding it
into `Exercise` would have been less schema, but every strength query would then
have had to start excluding it: cardio has no reps and no weight, so it would
contribute nothing to volume while still appearing on the Exercises list as
"Treadmill — best weight 0 lb" next to a flat progress chart. `CardioEntry`
keeps `src/lib/volume.ts`, `exercises.ts` and `stats.ts` exactly as narrow as
they were.

**Which timer ran is derived, not stored.** A `CardioEntry` has `durationSec`
and a nullable `targetSec`; a countdown is one that has a target, and it hit
that target when `durationSec >= targetSec`. A separate `mode` column would have
been a second source of truth that could disagree with the numbers — the same
reasoning as volume never being stored.

**Cardio timers read the wall clock; they never count ticks.** Elapsed time is
derived from when the current run started plus what earlier runs banked
(`cardioElapsedMs` in `src/components/CardioTimer.tsx`). A phone suspends
JavaScript timers the moment the screen locks, so an interval that decremented a
counter would quietly lose every minute the phone spent in a pocket. Subtracting
timestamps cannot. A countdown that runs out banks exactly its target rather
than whatever it overshot to, so a 20-minute block records as 20:00.

**One clock drives every live readout.** `useNow` in `src/lib/clock.ts` is a
single `useSyncExternalStore` over the wall clock, shared by the workout
stopwatch and every cardio timer, so they advance on the same tick instead of
drifting against each other. It ticks faster than the one-second granularity
anything displays, which costs a few identical renders and buys readouts that
change in the second they belong to.

**A workout can be nothing but cardio.** `finishWorkout` requires at least one
exercise *or* at least one cardio entry, not one exercise. A run on its own is
a workout, and the count-up timer exists precisely for it.

**The in-progress draft is mirrored to localStorage, not to the database.**
Autosaving to the server would mean a write per keystroke and `Exercise` rows
existing for workouts that were never finished; keeping the draft in the browser
leaves `finishWorkout` a single wholesale write. It's localStorage rather than
sessionStorage because sessionStorage dies with the tab, and "iOS killed the app
while I was reading a text between sets" is the case most worth surviving.

Because a cardio timer stores *when* it started rather than how long it has run,
a restored timer is still running, and the time spent away is already in the
number. Nothing has to keep ticking for that to be true.

**The draft is read through `useSyncExternalStore`, not an effect.** The logger
is server-rendered, so reading storage while rendering would make the client's
markup disagree with the server's, and pushing the draft in from an effect means
initialising the form empty and overwriting it a moment later. Instead the store
reports `undefined` until storage has been read — the server render and the
hydration pass — and the form is remounted on a `key` once the answer is known,
so its state is simply *created* from the draft. Same reasoning as the wall
clock in `lib/clock.ts`: a browser system the app reads is a store, not state
the app owns.

Two things this has to get right, both of which were wrong first:

- **The empty form must not save during that window.** On a full page load the
  form is mounted, empty, before storage has been read; without the `canSave`
  guard its mount saves an empty draft over the real one and the restore finds
  nothing. It only ever went wrong on a reload — arriving by a client-side
  navigation skips the empty mount entirely.
- **The cached snapshot is written through by `saveDraft`.** `useSyncExternalStore`
  needs a snapshot that doesn't change identity between calls, so storage is
  parsed once; leaving it at that meant closing the logger and reopening it
  restored the draft as it was on arrival and discarded everything typed since.

**Timers correct themselves when you come back rather than drifting.** A hidden
tab has its intervals throttled, and a locked phone stops firing them almost
entirely, so every live readout goes stale while you're away. None of them
*lose* anything, because all are computed from timestamps — and `lib/clock.ts`
ticks on `visibilitychange` so the right number is already on screen by the time
you look at it. The one thing a web app can't do here is sound the countdown
chime while the tab is hidden; it fires when the tab wakes.

---

## Future features

### Friends

See what the people you train with are doing, and give the app a social pull.

Roughly what it needs:

- A `Friendship` table with a requester, an addressee and a status
  (pending / accepted / blocked), unique on the pair
- Finding people — search by email, or an invite link, so you don't have to
  enumerate users
- A request-and-accept flow, so nobody can add themselves to your feed
- A friends list, and a read-only view of a friend's recent workouts and totals
- Probably a feed on Home: "Sam finished Leg Day — 12,400 lb"

Two things are already in place for this:

- **`canViewPhoto(viewerId, ownerId)` in `src/lib/photos.ts`** is the single
  authorization seam for profile photos. It currently reads
  `viewerId === ownerId`; it becomes
  `viewerId === ownerId || areFriends(viewerId, ownerId)` and every caller
  inherits it.
- **`Avatar`** already falls back to initials, which is what a friends list
  needs for people who haven't set a photo.

Worth deciding early: how much a friend can see. Totals and workout names are a
gentler default than every set of every session, and it's much easier to loosen
that later than to tighten it.

### Coaching over MCP

Expose a user's own logged data through an MCP server, so an agent can read
their training history and give advice grounded in what they've actually done —
"your bench has stalled for three weeks", "you haven't trained legs since the
14th" — rather than in generic programming.

Roughly what it needs:

- Read-only tools over the same data the app already derives: workout history,
  per-movement sessions and progress (`src/lib/exercises.ts`), lifetime and
  trailing-week totals (`src/lib/stats.ts`), cardio time
- A resource or tool for "what has this person done lately", shaped for a model
  to read rather than for a chart to plot

The thing to settle first is **authentication**, because nothing in the app is
built for a non-browser caller today. Authorization currently runs through
`getCurrentUser()` in `src/lib/dal.ts`, which reads a session cookie, plus a
per-row `userId` check at every query. An MCP server has no cookie. It needs its
own credential — a per-user token the profile screen can issue and revoke — and
it must resolve that token to exactly one user id and then go through the same
DAL checks, so the MCP path can never see more than the person signing in would.
Scope it to the caller's own data only; a friends feature would widen that
later, and it's far easier to loosen than to tighten.

### Other ideas

Unordered, and all optional — prune freely:

- **Edit a finished workout.** Right now a saved workout can only be deleted.
  Fixing a typo'd weight means re-logging the whole thing.
- **Search on the Exercises list.** Fine at five movements, unwieldy at fifty.
- **Estimated 1RM** as a third metric on the progress chart, alongside top
  weight and volume. Deliberately left out for now because it's a computed
  figure that needs explaining.
- **Rest timer** between sets, counting up from the last set you completed. Most
  of the machinery now exists — `useNow`, `CardioTimer`'s wall-clock maths and
  the chime — so this is mostly a question of where it belongs in the set row.
- **Distance and pace on cardio**, so a 5k is more than 27 minutes. `CardioEntry`
  would take a nullable `distanceM`, canonical in metres for the same reason
  weights are canonical in kilograms.
- **Routines / templates** — start a workout pre-filled with the exercises you
  always do on push day.
- **Personal-best badges** when a set beats your previous best for a movement.
- **Deploying it properly** so it's reachable without being on your home
  Wi-Fi. Note that file-backed SQLite doesn't survive serverless hosting —
  that would mean pointing the Prisma datasource at Postgres instead.
