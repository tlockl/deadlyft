# Reps

A mobile-first workout tracker. Log your sets, reps and weight; every workout is
stamped with the date and time automatically and kept in a history you can look
back through. Each person gets their own account and their own private log.

Styled to feel like a native iOS app — Apple's semantic system colours, SF Pro,
inset grouped lists, a translucent tab bar, safe-area insets, automatic
light/dark mode. Add it to your iPhone home screen and it opens without Safari
chrome.

Built with Next.js 16, React 19, Tailwind v4, Prisma 7 and SQLite.

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
- Bodyweight movements work: leave the weight blank

**Looking back**

- **History** — every finished workout, grouped by month, with volume, set count and duration
- **Workout detail** — the full set-by-set breakdown, with per-exercise volume
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
| Screens | `src/app/(app)/`, `src/app/log/[id]/` |
| Design tokens | `src/app/globals.css` |

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

### Other ideas

Unordered, and all optional — prune freely:

- **Edit a finished workout.** Right now a saved workout can only be deleted.
  Fixing a typo'd weight means re-logging the whole thing.
- **Search on the Exercises list.** Fine at five movements, unwieldy at fifty.
- **Estimated 1RM** as a third metric on the progress chart, alongside top
  weight and volume. Deliberately left out for now because it's a computed
  figure that needs explaining.
- **Rest timer** between sets, counting up from the last set you completed.
- **Routines / templates** — start a workout pre-filled with the exercises you
  always do on push day.
- **Personal-best badges** when a set beats your previous best for a movement.
- **Deploying it properly** so it's reachable without being on your home
  Wi-Fi. Note that file-backed SQLite doesn't survive serverless hosting —
  that would mean pointing the Prisma datasource at Postgres instead.
