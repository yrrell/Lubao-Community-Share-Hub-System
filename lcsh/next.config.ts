import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // ── Fix: moved from experimental.serverComponentsExternalPackages ──
  serverExternalPackages: ['@libsql/client'],

  // ── Fix: suppress Watchpack EACCES on Termux (Android) ────────────
  // Tells Next.js the real project root so it stops trying to watch /data
  outputFileTracingRoot: process.cwd(),

  images: {
    // ── Fix: sharp fails on android-arm64 (Termux) ────────────────────
    // Disable built-in image optimisation so <Image> works without sharp.
    // Remove this block once you install:  npm install --cpu=wasm32 sharp
    unoptimized: true,

    // If you later add a CDN or upload domain, whitelist it here:
    // remotePatterns: [
    //   { protocol: 'https', hostname: 'your-cdn.example.com' },
    // ],
  },

  // ── Recommended for App Router projects ────────────────────────────
  reactStrictMode: true,
};

export default nextConfig;
