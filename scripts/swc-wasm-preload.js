/**
 * Preload script to prevent Next.js from loading the SWC native binary,
 * which crashes with SIGBUS in the Replit sandbox environment.
 * By throwing MODULE_NOT_FOUND, Next.js falls back to its WASM-based SWC.
 *
 * Usage: NODE_OPTIONS="--require ./scripts/swc-wasm-preload.js" next dev
 */
const Module = require("module");

const originalLoad = Module._load;

const BLOCKED_PATTERNS = [
  "@next/swc-linux-x64-gnu",
  "@next/swc-linux-x64-musl",
  "@next/swc-linux-arm64-gnu",
  "@next/swc-linux-arm64-musl",
  "@next/swc-win32-x64-msvc",
  "@next/swc-darwin-x64",
  "@next/swc-darwin-arm64",
];

Module._load = function (request, parent, isMain) {
  for (const pattern of BLOCKED_PATTERNS) {
    if (request === pattern || request.startsWith(pattern + "/")) {
      const err = new Error(
        `[swc-wasm-preload] Blocked native SWC binary '${request}' — using WASM fallback instead.`
      );
      err.code = "MODULE_NOT_FOUND";
      throw err;
    }
  }
  return originalLoad.call(this, request, parent, isMain);
};
