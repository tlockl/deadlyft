import type { MetadataRoute } from "next";

/**
 * Web app manifest, so adding the app to a phone's home screen gives it a
 * proper name and icon and opens it without browser chrome.
 *
 * The colours match the icon's dark background rather than the app's light
 * theme, because this is what the OS shows during launch.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DEADLYFT",
    short_name: "DEADLYFT",
    description:
      "Log your sets, reps and total weight moved, and look back on every workout.",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#000000",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
