/*
 * Regenerates every icon in the project from a single master image.
 *
 *   npm run icons
 *
 * Source of truth is assets/icon-source.png. Replace that file and re-run to
 * change the app icon everywhere at once.
 *
 * Outputs:
 *   src/app/favicon.ico      browser tab, 16/32/48 in one file
 *   src/app/icon.png         modern browsers and bookmarks
 *   src/app/apple-icon.png   iPhone home screen
 *   public/icon-192.png      web app manifest
 *   public/icon-512.png      web app manifest
 *   docs/icon.png            README header
 */
const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

const ROOT = path.join(__dirname, "..");
const SOURCE = path.join(ROOT, "assets", "icon-source.png");

// The artwork sits inside a generous margin. Trimming to the badge itself
// matters most at 16px, where that margin would eat the whole icon.
const CROP_RATIO = 0.82;

const PNG_TARGETS = [
  { file: "src/app/icon.png", size: 192 },
  { file: "src/app/apple-icon.png", size: 180 },
  { file: "public/icon-192.png", size: 192 },
  { file: "public/icon-512.png", size: 512 },
  { file: "docs/icon.png", size: 512 },
];

const ICO_SIZES = [16, 32, 48];

/** Centre-cropped square master, held in memory for all the resizes below. */
async function croppedMaster() {
  const image = sharp(SOURCE);
  const { width, height } = await image.metadata();
  const side = Math.round(Math.min(width, height) * CROP_RATIO);

  return sharp(SOURCE)
    .extract({
      left: Math.round((width - side) / 2),
      top: Math.round((height - side) / 2),
      width: side,
      height: side,
    })
    .png()
    .toBuffer();
}

/**
 * ICO containers can hold PNG-encoded entries directly. The PNGs must be RGBA:
 * Next's image pipeline rejects an ICO whose entries lack an alpha channel
 * with "The PNG is not in RGBA format", and macOS `sips` writes plain RGB.
 */
async function buildIco(master) {
  const images = [];
  for (const size of ICO_SIZES) {
    images.push({
      size,
      data: await sharp(master)
        .resize(size, size, { fit: "cover" })
        .ensureAlpha()
        .png({ compressionLevel: 9 })
        .toBuffer(),
    });
  }

  const HEADER = 6;
  const ENTRY = 16;

  const header = Buffer.alloc(HEADER);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(images.length, 4);

  let offset = HEADER + ENTRY * images.length;
  const entries = images.map((image) => {
    const entry = Buffer.alloc(ENTRY);
    // A 0 in these fields means 256; none of our sizes reach that.
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1);
    entry.writeUInt8(0, 2); // palette size
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(image.data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.data.length;
    return entry;
  });

  return Buffer.concat([
    header,
    ...entries,
    ...images.map((image) => image.data),
  ]);
}

(async () => {
  if (!fs.existsSync(SOURCE)) {
    console.error(`missing master image: ${path.relative(ROOT, SOURCE)}`);
    process.exit(1);
  }

  const master = await croppedMaster();

  for (const { file, size } of PNG_TARGETS) {
    const out = path.join(ROOT, file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await sharp(master)
      .resize(size, size, { fit: "cover" })
      .ensureAlpha()
      .png({ compressionLevel: 9 })
      .toFile(out);
    console.log(`${file}  ${size}x${size}`);
  }

  const ico = await buildIco(master);
  fs.writeFileSync(path.join(ROOT, "src/app/favicon.ico"), ico);
  console.log(`src/app/favicon.ico  ${ICO_SIZES.join("/")}  ${ico.length} bytes`);
})().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
