# Maintenance scripts

Occasional-use scripts, not part of the app or its build. Each is plain Node
and reads its configuration from the environment, so they work on any machine.

| Command | What it does |
| --- | --- |
| `npm run icons` | Regenerates every icon from `assets/icon-source.png` |
| `npm run seed` | Fills the demo account with back-dated workouts |
| `npm run screenshots` | Recaptures the README screenshots |

## `npm run icons`

`assets/icon-source.png` is the single source of truth for the app icon.
Replace it and re-run to update the favicon, the iPhone home-screen icon, the
manifest icons and the README header in one go.

It centre-crops the artwork before resizing, because the source has a wide
margin that would swallow the icon at 16px. The generated `favicon.ico` holds
RGBA PNG entries — Next's image pipeline rejects an ICO without an alpha
channel, which is why this doesn't use macOS `sips`.

## `npm run seed`

The app records start and finish times server-side on purpose, so there's no
way to create a dated workout through the UI. This writes ten workouts across
the last two months straight to SQLite, which is what gives the progress charts
something to plot.

Every row it creates is prefixed `seed_`, so re-running replaces the demo data
and never touches workouts you logged yourself. To remove it entirely:

```sql
DELETE FROM Workout WHERE id LIKE 'seed_%';
```

Set `DEMO_EMAIL` to attach the data to a different account (default
`tristen@example.test`); the account has to exist already.

## `npm run screenshots`

Needs the dev server running in another terminal. Drives your installed Chrome
through `puppeteer-core`, so no browser gets downloaded.

Captures at iPhone dimensions (390×844 at 2×) in dark mode, hides the Next dev
overlay, and writes to `docs/screenshots/`. For the logger shot it starts a real
workout, fills in three sets, captures, then discards it — so the demo data is
left exactly as it was found.

**Always shoot the demo account.** These images go into a README that anyone
with repo access can see; a real account means publishing real workout history
and whatever profile photo is on it. The script uploads a generated placeholder
avatar rather than using a real one.

Override with `BASE_URL`, `DEMO_EMAIL`, `DEMO_PASSWORD` or `CHROME_PATH` if your
setup differs.
