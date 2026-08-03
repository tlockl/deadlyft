import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  // The template means every other page sets only its own name, and the app
  // name lives in exactly one place.
  title: {
    default: "DEADLYFT",
    template: "%s · DEADLYFT",
  },
  description:
    "Log your sets, reps and total weight moved, and look back on every workout.",
  // Lets the app be added to the iPhone home screen and open without Safari chrome.
  appleWebApp: {
    capable: true,
    title: "DEADLYFT",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Required for env(safe-area-inset-*) to report real values on notched iPhones.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f2f2f7" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
