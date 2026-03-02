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
- **AI Agent System**: Uses `@inngest/agent-kit` to create a multi-agent network
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
| **Pollinations AI** | LLM provider for code generation | `API_KEY` |
| **PostgreSQL** | Primary relational database | `DATABASE_URL` |
| **Auth Secret** | JWT signing secret | `AUTH_SECRET` |

## Required Environment Variables

- `DATABASE_URL` — PostgreSQL connection string
- `AUTH_SECRET` — Secret key for JWT signing (already set in Replit secrets)
- `E2B_API_KEY` — E2B sandbox API key
- `API_KEY` — Pollinations AI API key
- `INNGEST_API_KEY`, `INNGEST_SIGNING_KEY` — Inngest credentials (for production)
- `NEXT_PUBLIC_APP_URL` — Public URL (auto-detected on Replit)
