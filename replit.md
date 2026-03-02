# Vibe - AI-Powered Development Platform

## Overview

Vibe is an AI-powered web application builder that lets users create Next.js applications by chatting with AI agents. Users describe what they want, and the system spins up real E2B sandbox environments where AI agents write, edit, and run code in real-time. The result is a live preview of the generated application alongside a file explorer and code viewer.

Key capabilities:
- Conversational project creation and iteration via chat interface
- Real-time code generation inside E2B cloud sandboxes
- Live app preview with split-pane code explorer
- Project and message history persistence
- Usage tracking with free/pro tiers via Clerk subscriptions
- Background AI job processing via Inngest

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

- **Framework**: Next.js 15 (App Router) with React 19 and TypeScript
- **Styling**: Tailwind CSS v4 with `tw-animate-css`; no custom CSS files are written by the AI agent (Tailwind classes only)
- **Component Library**: Shadcn/ui (new-york style) built on top of Radix UI primitives; all components live in `src/components/ui/`
- **State & Data Fetching**: tRPC v11 + TanStack React Query v5 for type-safe server communication with SSR hydration support
- **Theme**: `next-themes` for light/dark mode; Clerk appearance adapts to current theme
- **Code Display**: Prism.js for syntax-highlighted code view in the file explorer
- **Routing**: App Router with route groups — `(home)` for the landing/pricing pages, `/projects/[projectId]` for the sandbox workspace

### Backend Architecture

- **API Layer**: tRPC routers organized by domain under `src/trpc/routers/` with three sub-routers: `projects`, `messages`, `usage`
- **Auth Middleware**: Clerk middleware (`src/middleware.ts`) protects all non-public routes; public routes include `/`, `/sign-in`, `/sign-up`, `/api/*`, `/pricing`
- **Background Jobs**: Inngest handles the long-running AI agent workflow (`codeAgentFunction`) triggered by `code-agent/run` events
- **AI Agent System**: Uses `@inngest/agent-kit` to create a multi-agent network. One agent (with tools for file creation/reading and terminal commands) builds the app; a second agent generates the response summary; a third generates the fragment title
- **Prompting**: System prompts are centralized in `src/prompt.ts` (PROMPT, RESPONSE_PROMPT, FRAGMENT_TITLE_PROMPT)
- **Rate Limiting**: `rate-limiter-flexible` with Prisma storage; free users get 2 credits, pro users get 100 credits per 30-day window

### Data Storage

- **Database**: PostgreSQL via Prisma ORM (v6); client generated to `src/generated/prisma/`
- **Schema Models**:
  - `Project` — user's projects with metadata
  - `Message` — chat messages per project with roles (USER/ASSISTANT) and types (RESULT/etc.)
  - `Fragment` — generated code snapshots tied to messages, storing file contents
  - `Usage` — rate limiter table managed by `rate-limiter-flexible`
- **Prisma Client**: Singleton pattern in `src/lib/db.ts` to avoid connection exhaustion in development

### Authentication & Authorization

- **Provider**: Clerk (`@clerk/nextjs`) handles sign-up, sign-in, and session management
- **Subscription Plans**: Clerk's built-in plan system (`has({ plan: "pro" })`) distinguishes free vs. pro users
- **tRPC Auth**: `protectedProcedure` middleware in `src/trpc/init.ts` checks `ctx.auth.userId` before allowing access to sensitive procedures

### AI Sandbox Execution

- **E2B Sandboxes**: Each project run creates (or reconnects to) an E2B sandbox running a pre-built Next.js template (`vibe-nextjs-test-2`). The sandbox has a 30-minute timeout
- **Agent Tools**: The code agent has tools to create/update files, read files, and run terminal commands within the sandbox
- **Sandbox Template**: Must be pre-built using the E2B CLI with Docker before first use (see README)

### Module Organization

Feature code follows a domain-driven structure under `src/modules/`:
- `home/` — landing page UI, project form, projects list, template prompts, navbar
- `projects/` — project tRPC procedures and project workspace view
- `messages/` — message tRPC procedures
- `usage/` — usage tRPC procedures

## External Dependencies

| Service | Purpose | Integration Point |
|---|---|---|
| **Clerk** | Authentication, session management, subscription/plan tracking, pricing table UI | `@clerk/nextjs`, middleware, tRPC context, `PricingTable` component |
| **E2B Code Interpreter** | Cloud sandboxes for running AI-generated Next.js code | `@e2b/code-interpreter`, Inngest function |
| **Inngest** | Background job queue for long-running AI agent workflows | `src/inngest/`, `/api/inngest` route |
| **Inngest Agent Kit** | Multi-agent orchestration framework | `@inngest/agent-kit`, `codeAgentFunction` |
| **Pollinations AI** | LLM provider for code generation via OpenAI-compatible API | `API_KEY` secret, `baseUrl: https://gen.pollinations.ai/v1` in agent-kit config |
| **PostgreSQL** | Primary relational database | Via Prisma, `DATABASE_URL` env var |
| **Prisma** | ORM and migration tool; client auto-generated on install | `src/lib/db.ts`, `src/generated/prisma/` |
| **TanStack React Query** | Client-side caching, SSR hydration for tRPC responses | `src/trpc/client.tsx`, `src/trpc/server.tsx` |
| **Radix UI** | Accessible headless UI primitives underlying Shadcn components | `src/components/ui/` |

## Bug Fixes Applied

- **`ProjectsList` unauthenticated query fix**: Added `enabled: !!user` to the `useQuery` call in `src/modules/home/ui/components/projects-list.tsx` to prevent the protected `projects.getMany` tRPC procedure from being called when the user is not authenticated. This was causing a `TRPCClientError: Not authenticated` runtime error on the home page.
- **Removed conflicting `.env` file**: The `.env` file had empty values (`=""`) for all secrets which were overriding the Replit secrets/environment variables (e.g., `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""`). This caused "Missing publishableKey" errors during `npm run build`. The file was removed — all required values are managed via Replit secrets and env vars.

### Required Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `CLERK_SECRET_KEY` + `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — Clerk credentials
- `CLERK_*` redirect URLs for sign-in/sign-up
- `INNGEST_*` — Inngest API keys (for production)
- `E2B_API_KEY` — E2B sandbox API key
- `NEXT_PUBLIC_APP_URL` — Public URL used for tRPC client on the server side
- `API_KEY` — Pollinations AI API key (models: `openai-large` for code generation, `openai-fast` for title/response generation)