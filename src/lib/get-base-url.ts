/**
 * Auto-detects the base URL of the application.
 *
 * Priority order:
 * 1. Browser: window.location.origin (always correct on client)
 * 2. Replit: REPLIT_DEV_DOMAIN env var (auto-changes per session/fork)
 * 3. Custom: NEXT_PUBLIC_APP_URL env var (manual override for non-Replit)
 * 4. Fallback: localhost:3000 for local development
 */
export function getBaseUrl(): string {
  // Client-side: use the current window origin — always correct
  if (typeof window !== "undefined") {
    return window.location.origin;
  }

  // Server-side in Replit: dynamically resolves to current domain
  // This handles forks, new sessions, and domain changes automatically
  if (process.env.REPLIT_DEV_DOMAIN) {
    return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  }

  // Server-side: manual override for production deployments (e.g. Vercel, Railway)
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }

  // Local development fallback
  return "http://localhost:3000";
}
