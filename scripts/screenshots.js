/*
 * Regenerates the README screenshots: dark mode, iPhone dimensions, 2x.
 *
 *   npm run dev          # in another terminal
 *   npm run screenshots
 *
 * Drives the system Chrome through puppeteer-core, so no browser is
 * downloaded. Writes to docs/screenshots/.
 *
 * Shoot the demo account, never a real one — these images end up in a public
 * README, and a real account means publishing someone's workouts and profile
 * photo. `npm run seed` fills the demo account with dated history first.
 *
 * Config via env:
 *   BASE_URL        default http://localhost:3000
 *   DEMO_EMAIL      default tristen@example.test
 *   DEMO_PASSWORD   default testpassword123
 *   CHROME_PATH     default the macOS Google Chrome location
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer-core");

const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "docs", "screenshots");

const BASE = process.env.BASE_URL || "http://localhost:3000";
const EMAIL = process.env.DEMO_EMAIL || "tristen@example.test";
const PASSWORD = process.env.DEMO_PASSWORD || "testpassword123";
const CHROME =
  process.env.CHROME_PATH ||
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function shot(page, name) {
  // The dev-only overlay badge would otherwise appear in every screenshot.
  await page.addStyleTag({
    content:
      "nextjs-portal, [data-nextjs-toast], #__next-build-watcher { display: none !important; }",
  });
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  console.log("captured", name);
}

/** Click the button/link/label whose trimmed text matches exactly. */
async function clickText(page, text) {
  const handle = await page.evaluateHandle((wanted) => {
    const nodes = [...document.querySelectorAll("button, a, label")];
    return nodes.find((node) => node.textContent.trim() === wanted) ?? null;
  }, text);

  const element = handle.asElement();
  if (!element) throw new Error(`no clickable element reading "${text}"`);
  await element.click();
}

(async () => {
  if (!fs.existsSync(CHROME)) {
    console.error(`Chrome not found at ${CHROME} — set CHROME_PATH.`);
    process.exit(1);
  }

  try {
    await fetch(BASE);
  } catch {
    console.error(`Nothing responding at ${BASE}. Start the dev server first.`);
    process.exit(1);
  }

  fs.mkdirSync(OUT, { recursive: true });

  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    defaultViewport: {
      width: 390,
      height: 844,
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    },
    args: ["--hide-scrollbars", "--force-color-profile=srgb"],
  });

  const page = await browser.newPage();
  await page.emulateMediaFeatures([
    { name: "prefers-color-scheme", value: "dark" },
  ]);

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2" });
  await page.type("#email", EMAIL);
  await page.type("#password", PASSWORD);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    clickText(page, "Sign In"),
  ]);

  // A generated placeholder avatar, so no real photo is ever published.
  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle2" });
  const hasPhoto = await page.evaluate(() =>
    [...document.querySelectorAll("button")].some(
      (button) => button.textContent.trim() === "Remove Photo",
    ),
  );

  if (!hasPhoto) {
    await page.evaluate(async () => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 600;
      const ctx = canvas.getContext("2d");
      const gradient = ctx.createLinearGradient(0, 0, 600, 600);
      gradient.addColorStop(0, "#0a84ff");
      gradient.addColorStop(1, "#5856d6");
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 600, 600);
      ctx.fillStyle = "rgba(255,255,255,0.92)";
      ctx.font = "bold 260px -apple-system, sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText("T", 300, 315);

      const blob = await new Promise((resolve) =>
        canvas.toBlob(resolve, "image/png"),
      );
      const transfer = new DataTransfer();
      transfer.items.add(new File([blob], "demo.png", { type: "image/png" }));
      const input = document.getElementById("photo");
      input.files = transfer.files;
      input.dispatchEvent(new Event("change", { bubbles: true }));
    });
    await sleep(900);
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2" }),
      clickText(page, "Save Photo"),
    ]);
  }

  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle2" });
  await shot(page, "profile");

  for (const [route, name] of [
    ["/", "home"],
    ["/history", "history"],
    ["/exercises", "exercises"],
    ["/exercises/bench%20press", "progress"],
  ]) {
    await page.goto(`${BASE}${route}`, { waitUntil: "networkidle2" });
    await sleep(400);
    await shot(page, name);
  }

  const workoutHref = await page.evaluate(async () => {
    const response = await fetch("/history");
    const html = await response.text();
    return (html.match(/\/workout\/[a-z0-9_]+/i) || [])[0] ?? null;
  });
  if (workoutHref) {
    await page.goto(`${BASE}${workoutHref}`, { waitUntil: "networkidle2" });
    await shot(page, "workout-detail");
  }

  // The logger only exists mid-workout, so start one, fill it, shoot, discard.
  await page.goto(`${BASE}/`, { waitUntil: "networkidle2" });
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    clickText(page, "Start Workout"),
  ]);

  await page.type('input[placeholder="Workout name (optional)"]', "Push Day");
  await page.type('input[placeholder="Exercise 1"]', "Bench Press");

  const sets = [
    ["135", "10"],
    ["155", "8"],
    ["175", "6"],
  ];
  for (let i = 0; i < sets.length; i++) {
    if (i > 0) {
      await clickText(page, "Add Set");
      await sleep(250);
    }
    await page.type(`input[aria-label="Set ${i + 1} weight"]`, sets[i][0]);
    await page.type(`input[aria-label="Set ${i + 1} reps"]`, sets[i][1]);
  }
  await sleep(500);
  await shot(page, "logger");

  // Leave the demo data exactly as it was found.
  await clickText(page, "Discard Workout");
  await sleep(300);
  await Promise.all([
    page.waitForNavigation({ waitUntil: "networkidle2" }),
    clickText(page, "Tap again to discard"),
  ]);
  console.log("discarded the temporary workout");

  await browser.close();
})().catch((error) => {
  console.error("failed:", error.message);
  process.exit(1);
});
