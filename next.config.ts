import type { NextConfig } from "next";

// Auto-detect Replit domains for cross-origin dev access
const replitDomains = process.env.REPLIT_DOMAINS
  ? process.env.REPLIT_DOMAINS.split(",").map((d) => d.trim())
  : [];

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.replit.dev",
    "*.repl.co",
    "*.picard.replit.dev",
    "*.janeway.replit.dev",
    "127.0.0.1",
    "localhost",
    ...replitDomains,
  ],
};

export default nextConfig;
