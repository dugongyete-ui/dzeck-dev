# Vibe - AI-Powered Development Platform

## Overview

Vibe is an AI-powered web application builder that lets users create Next.js applications by chatting with AI agents. Users describe what they want, and the system spins up real E2B sandbox environments where AI agents write, edit, and run code in real-time. The result is a live preview of the generated application alongside a file explorer and code viewer.

Key capabilities:
- Conversational project creation and iteration via chat interface
- Real-time code generation inside E2B cloud sandboxes
- Live app preview with split-pane code explorer
- Project and message history persistence
- Background AI job processing via Inngest
- Simple admin authentication (no third-party auth service required)

## User Preferences

Preferred communication style: Simple, everyday language (Indonesian/English).

## Known Issues & Fixes

- **Inngest CLI install prompt (FIXED)**: The `npx inngest-cli` command was prompting for `y` to confirm installation on each start, blocking all background AI jobs. Fixed by adding `--yes` flag to the workflow command. The Inngest Dev Server workflow command must always include `npx --yes inngest-cli@latest dev ...`.
- **@inngest/agent-kit version conflict (FIXED)**: `@inngest/agent-kit@0.8.4` imports private inngest paths (`inngest/components/InngestFunction`, `inngest/helpers/errors`) that are not exported by inngest v3.x's `exports` field, causing a Turbopack module resolution error. Fixed by removing all `@inngest/agent-kit` usage and rewriting `src/inngest/functions.ts` with a custom agent loop that calls Pollinations AI directly via fetch. `src/inngest/utils.ts` was also cleaned up to remove agent-kit types.
- **Cohere AI integration (ACTIVE)**: AI provider switched from Pollinations to Cohere AI (`cohere-ai` SDK v8). Uses `command-r-plus-08-2024` model via `cohere.v2.chat()` (Cohere v2 Messages API). The v1 `cohere.chat()` was dropped because: `command-r-plus` was removed Sept 2025; `command-a-03-2025` and `command-r-plus-08-2024` both reject message+toolResults in v1; v2 API uses OpenAI-style messages array with system/user/assistant/tool roles. Step return values must be plain JSON objects (extract from Cohere response inside `step.run` before returning). Requires `COHERE_API_KEY`.
- **Inngest port conflict (FIXED)**: Inngest CLI auto-relocates from port 8288 to 8290 due to Replit environment conflict. Fixed by setting `INNGEST_BASE_URL=http://127.0.0.1:8290` in `.replit` `[userenv.shared]` so the Inngest SDK knows where the dev server actually is. CLI pinned to `inngest-cli@1.17.9`.
- **TypeScript error in auth.ts (FIXED)**: `SignJWT(payload)` where `payload` is `SessionPayload` failed because `jose` requires `JWTPayload` (which needs an index signature). Fixed by converting to `Record<string, string>` before passing to `SignJWT`.
- **Post-merge setup script (ADDED)**: Created `scripts/post-merge.sh` registered in `.replit` as `[postMerge]` path. Runs `npm install`, `prisma generate`, and `prisma migrate deploy` automatically after task merges.
- **SWC native binary bus error (FIXED)**: The `@next/swc-linux-x64-gnu` and `@next/swc-linux-x64-musl` native binaries crash with SIGBUS in the Replit sandbox. Fixed by: (1) installing `@next/swc-wasm-nodejs@15.3.4` as a WASM-based fallback, (2) creating `scripts/swc-wasm-preload.js` — a Node.js preload script that intercepts `require` for native SWC packages and throws `MODULE_NOT_FOUND` so Next.js automatically falls back to the WASM binary, (3) setting `NODE_OPTIONS='--require ./scripts/swc-wasm-preload.js'` in the dev script. Also set `experimental.useWasmBinary: true` in `next.config.ts`. The dev script must always include the preload.
- **App port changed to 5000 (FIXED)**: Replit's webview output type requires port 5000. Updated `package.json` dev script and workflow to use port 5000.
- **Cohere V2 tool result format (FIXED x2)**: Tool result messages in the Inngest agent loop were set to `content: [{ type: "tool_result", result: toolResult }]` but Cohere v2 API rejects the `"tool_result"` content type with UnprocessableEntityError 422. The correct format is plain string `content: toolResult`. Fixed in `src/inngest/functions.ts`. The `ToolMessageV2Content` type is `string | ToolContent[]` where `ToolContent` is `{ type: "text" | "document", ... }`.
- **readFiles path prefix missing (FIXED)**: The `readFiles` tool was reading from bare paths; now applies the same `/home/user/` prefix as `createOrUpdateFiles`. Fixed in `src/inngest/functions.ts`.
- **generationStatus stuck on failure (FIXED)**: Added `try/finally` around the agent loop in `src/inngest/functions.ts`. If the function crashes before completing, the `finally` block resets `generationStatus` to `null` in the DB so the UI never shows a permanently stuck "Thinking..." state.
- **Login rate limiting (ADDED)**: `src/app/api/auth/login/route.ts` now uses `rate-limiter-flexible` (Prisma store) to limit login attempts to 5 per IP per minute, returning HTTP 429 when exceeded.
- **JWT fallback secret removed (FIXED)**: `src/lib/auth.ts` and `src/middleware.ts` no longer silently fall back to `"vibe-fallback-secret-key"` when `AUTH_SECRET` is unset. Now throws a clear error to prevent forged tokens in misconfigured deployments.
- **Inngest send failure guard (FIXED)**: In `src/modules/projects/server/procedures.ts` and `src/modules/messages/server/procedures.ts`, `inngest.send()` is wrapped in try/catch. On failure, the created project/message is deleted and a `TRPCError` is thrown so users are not silently charged credits for failed job dispatches.

## System Architecture

### Frontend Architecture

- **Framework**: Next.js 15 (App Router) with React 19 and TypeScript
- **Styling**: Tailwind CSS v4 with `tw-animate-css`; Tailwind classes only
- **Component Library**: Shadcn/ui (new-york style) built on top of Radix UI primitives; all components in `src/components/ui/`
- **State & Data Fetching**: tRPC v11 + TanStack React Query v5 for type-safe server communication with SSR hydration support
- **Theme**: `next-themes` for light/dark mode
- **Code Display**: Prism.js for syntax-highlighted code view in the file explorer
- **Routing**: App Router with route groups — `(home)` for landing/pricing pages, `/projects/[projectId]` for the sandbox workspace

### Backend Architecture

- **API Layer**: tRPC routers under `src/trpc/routers/` with three sub-routers: `projects`, `messages`, `usage`
- **Auth Middleware**: Custom JWT middleware (`src/middleware.ts`). Protected routes: `/projects/*`. Public routes: `/`, `/sign-in`, `/api/*`, `/pricing`. Authenticated users visiting `/sign-in` are redirected to `/`
- **Background Jobs**: Inngest handles the long-running AI agent workflow (`codeAgentFunction`) triggered by `code-agent/run` events
- **AI Agent System**: Custom agent loop in `src/inngest/functions.ts` using Cohere AI SDK (`cohere-ai`) with `command-r-plus` model. Native Cohere tool calling via `parameterDefinitions`. No `@inngest/agent-kit` dependency.
- **Rate Limiting**: `rate-limiter-flexible` with Prisma storage; admin gets 10,000 credits per 30-day window

### Authentication System

- **Type**: Custom JWT-based authentication using `jose` library
- **Admin Credentials**: `admin@example.com` / `admin123`
- **Session**: JWT stored in HTTP-only cookie `vibe-session` (7 day expiry)
- **Key files**:
  - `src/lib/auth.ts` — core auth utilities (createSession, verifySession, getSession, validateCredentials)
  - `src/app/api/auth/login/route.ts` — POST login endpoint
  - `src/app/api/auth/logout/route.ts` — POST logout endpoint
  - `src/app/api/auth/session/route.ts` — GET current session info
  - `src/hooks/use-session.ts` — client-side React Query hook for session state
  - `src/middleware.ts` — JWT verification and route protection
- **Auth Secret**: `AUTH_SECRET` environment variable (required for JWT signing)

### Data Storage

- **Database**: PostgreSQL via Prisma ORM (v6); client generated to `src/generated/prisma/`
- **Schema Models**:
  - `Project` — user's projects with metadata (userId always = "admin")
  - `Message` — chat messages per project with roles (USER/ASSISTANT)
  - `Fragment` — generated code snapshots tied to messages
  - `Usage` — rate limiter table

### AI Sandbox Execution

- **E2B Sandboxes**: Each project run creates (or reconnects to) an E2B sandbox running a pre-built Next.js template. The sandbox has a 30-minute timeout
- **Agent Tools**: File create/update, file read, terminal commands within the sandbox

### Module Organization

- `home/` — landing page UI, project form, projects list, template prompts, navbar
- `projects/` — project tRPC procedures and project workspace view
- `messages/` — message tRPC procedures
- `usage/` — usage tRPC procedures

## External Dependencies

| Service | Purpose | Env Var |
|---|---|---|
| **E2B Code Interpreter** | Cloud sandboxes for running AI-generated Next.js code | `E2B_API_KEY` |
| **Inngest** | Background job queue for long-running AI agent workflows | `INNGEST_API_KEY`, `INNGEST_SIGNING_KEY` |
| **Cohere AI** | LLM provider for code generation (`command-r-plus`) | `COHERE_API_KEY` |
| **PostgreSQL** | Primary relational database | `DATABASE_URL` |
| **Auth Secret** | JWT signing secret | `AUTH_SECRET` |

## Required Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — Secret key for JWT signing (already set in Replit secrets)
- `E2B_API_KEY` — E2B sandbox API key
- `COHERE_API_KEY` — Cohere AI API key (used for code generation with `command-r-plus`)
- `INNGEST_API_KEY`, `INNGEST_SIGNING_KEY` — Inngest credentials (for production)
- `NEXT_PUBLIC_APP_URL` — Public URL (auto-detected on Replit)
