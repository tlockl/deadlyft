import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The dev server blocks cross-origin requests to its own dev-only assets
  // (the HMR socket in particular). Reaching the dev server from a phone on the
  // same Wi-Fi is cross-origin -- the phone asks for 192.168.x.x, not localhost
  // -- so the socket gets refused, hydration never finishes, and every
  // JS-driven control silently does nothing while plain forms keep working.
  //
  // These cover the private ranges a home router hands out, so this keeps
  // working when DHCP gives the machine a different address.
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*", "172.*.*.*"],

  experimental: {
    serverActions: {
      // Profile photos post through a server action. The browser shrinks them
      // to ~50KB first; this headroom is for the case where that didn't run
      // and the original camera file goes up instead.
      bodySizeLimit: "8mb",
    },
  },
};

export default nextConfig;
