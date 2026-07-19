# MyPomo — End-to-End Architecture

This document is the definitive technical reference for the MyPomo codebase. It explains every layer of the system — from how a browser request lands to how data is stored in the database — so that any contributor (or AI agent) can reason about the system accurately before making changes.

---

## Table of Contents

1. [Tech Stack Overview](#1-tech-stack-overview)
2. [Project File Structure](#2-project-file-structure)
3. [Infrastructure & Deployment](#3-infrastructure--deployment)
4. [Database Schema](#4-database-schema)
5. [Authentication Layer](#5-authentication-layer)
6. [Request Lifecycle — How a Page Load Works](#6-request-lifecycle--how-a-page-load-works)
7. [Server Actions — The Data Layer](#7-server-actions--the-data-layer)
8. [Page-by-Page Breakdown](#8-page-by-page-breakdown)
9. [Timer Architecture (Server-Driven)](#9-timer-architecture-server-driven)
10. [Connection Pooling Strategy](#10-connection-pooling-strategy)
11. [Known Issues & Current Limitations](#11-known-issues--current-limitations)

---

## 1. Tech Stack Overview

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.3 |
| UI Library | React | 19.2.4 |
| Styling | Vanilla CSS (no Tailwind) | — |
| Authentication | Auth.js (next-auth v5 beta) | 5.0.0-beta.31 |
| Auth Adapter | @auth/prisma-adapter | 2.11.2 |
| ORM | Prisma | 5.14.0 |
| Database | PostgreSQL (Supabase) | — |
| Connection Pooler | PgBouncer (Supabase managed) | — |
| Deployment | Vercel (Serverless Functions) | — |
| OAuth Provider | Google OAuth 2.0 | — |

---

## 2. Project File Structure

```
MyPomo/
├── middleware.js               # Route guard (runs before every request)
├── next.config.mjs             # Next.js configuration
├── prisma/
│   └── schema.prisma           # Database schema definition
├── src/
│   ├── app/                    # Next.js App Router
│   │   ├── layout.js           # Root layout (wraps all pages)
│   │   ├── page.js             # Dashboard (route: /)
│   │   ├── globals.css         # All CSS styles (design system)
│   │   ├── actions.js          # ALL server-side database operations
│   │   ├── api/
│   │   │   └── auth/[...nextauth]/route.js  # Auth.js HTTP handlers
│   │   ├── auth/signin/page.js # Login page
│   │   ├── timer/page.js       # Focus Timer (route: /timer)
│   │   ├── analytics/page.js   # Analytics (route: /analytics)
│   │   ├── sessions/
│   │   │   ├── page.js         # Session list page (route: /sessions)
│   │   │   └── SessionManager.js  # Client component for session list UI
│   │   ├── categories/
│   │   │   ├── page.js         # Categories page (route: /categories)
│   │   │   └── CategoryManager.js  # Client component for category CRUD UI
│   │   └── settings/page.js    # Settings page (route: /settings)
│   ├── components/
│   │   ├── AppShell.js         # Layout wrapper (Sidebar + main content area)
│   │   ├── Sidebar.js          # Left navigation sidebar
│   │   └── Providers.js        # Wraps app with SessionProvider (Auth.js client context)
│   └── lib/
│       ├── auth.js             # Auth.js instance (handlers, auth, signIn, signOut)
│       ├── auth.config.js      # Auth providers, callbacks, page redirects
│       └── prisma.js           # Prisma client singleton
```

---

## 3. Infrastructure & Deployment

### Hosting: Vercel (Serverless)
The app is deployed on Vercel. Every page and server action runs as a **serverless function** — there is no persistent server process. Each incoming request spins up a fresh, short-lived execution environment. This is critical context for understanding why database connection management is a recurring concern.

### Database: Supabase PostgreSQL
All data is stored in a PostgreSQL database managed by Supabase, hosted on AWS (`ap-northeast-1`).

### Branch-to-Deployment Mapping
| Git Branch | Vercel Environment |
|---|---|
| `prod` | **Production** (live URL) |
| `dev` | **Preview** (dev URL) |
| `main` | Not mapped to any deployment |

### Environment Variables
```
# Google OAuth credentials
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET

# Auth.js
NEXTAUTH_URL          # http://localhost:3000 (local) / your production URL (vercel)
NEXTAUTH_SECRET       # Random secret for JWT signing

# Database connections
DATABASE_URL          # Port 6543 (PgBouncer/Transaction Pooler) — used by app at runtime
DIRECT_URL            # Port 5432 (Direct connection) — used only by Prisma for migrations
```

### Build Script
```json
"build": "prisma generate && next build"
```
`prisma generate` is run before every build to ensure the Prisma client is regenerated from the current schema. This is required on Vercel since node_modules are not cached in the same way.

---

## 4. Database Schema

There are two types of models: **Auth.js system models** (managed by the framework) and **MyPomo domain models** (managed by us).

### Auth.js System Models (auto-managed)
```
User            — Core user record (id, email, name, image)
Account         — Linked OAuth accounts (Google provider data)
Session         — Active browser sessions
VerificationToken — Email verification (not used in current OAuth-only setup)
```

### MyPomo Domain Models

#### Category
```prisma
model Category {
  id        String   @id @default(uuid())
  userId    String
  name      String
  color     String   // hex color e.g. "#7c5af0"
  icon      String   // emoji e.g. "💻"
  createdAt DateTime @default(now())

  @@unique([userId, id])  // Composite key for safe scoped queries
}
```

#### FocusSession
```prisma
model FocusSession {
  id                    String    @id @default(uuid())
  userId                String
  categoryId            String
  status                String    // "in_progress" | "paused" | "completed" | "abandoned"
  durationMinutes       Int       // The intended duration (e.g. 25)
  actualDurationSeconds Int       @default(0)  // How long the user actually focused
  startedAt             DateTime  @default(now())  // Slides forward on resume
  endedAt               DateTime?
  goal                  Goal?
  notes                 Note[]

  @@unique([userId, id])  // Composite key for safe scoped queries
}
```

> **Important — `startedAt` semantics:** `startedAt` is not a fixed creation timestamp. When a session is **resumed** after a pause, `startedAt` is **reset to** `now() - actualDurationSeconds`. This allows the client to compute `elapsed time = now() - startedAt` correctly without needing any separate offset field.

#### Goal
```prisma
model Goal {
  id             String       @id @default(uuid())
  focusSessionId String       @unique  // One-to-one with FocusSession
  text           String       // The goal statement
  achieved       Boolean?     // null = not yet rated, true/false = rated in reflection
}
```

#### Note
```prisma
model Note {
  id             String   @id @default(uuid())
  focusSessionId String
  text           String
  createdAt      DateTime @default(now())
}
```

### Entity Relationships
```
User ──< Category
User ──< FocusSession
FocusSession ──1 Goal
FocusSession ──< Note
FocusSession >── Category
```

---

## 5. Authentication Layer

### Flow Overview
```
Browser request
    │
    ▼
middleware.js  ←──── Runs on every request (Edge Runtime)
    │                Uses auth.config.js ONLY (no Prisma — Edge compatible)
    │
    ├── Is the user logged in? (checks JWT cookie)
    │
    ├── YES → allow request through to page
    └── NO  → redirect to /auth/signin
```

### Why two auth files?
- **`auth.config.js`** — Contains providers and callbacks only. No Prisma import. This is intentional because `middleware.js` runs on Vercel's **Edge Runtime**, which cannot use Node.js APIs like Prisma.
- **`auth.js`** — Imports Prisma, attaches the `PrismaAdapter`, and creates the full Auth.js instance. Used everywhere else (server actions, API routes).

### JWT + Session Strategy
- Auth.js is configured to use **JWT strategy** (not database sessions). 
- On login, the user's `id` from the database is embedded into the JWT via the `jwt` callback: `token.uid = user.id`.
- On every request, the `session` callback reads `token.uid` back and exposes it as `session.user.id`.
- The `getUserId()` function in `actions.js` calls `auth()` to read this JWT and extract the `userId`. It also has a fallback: if `token.uid` is missing (a known bug in the Auth.js beta), it does a direct database lookup by `session.user.email`.

### Protected Routes
The following routes require authentication (enforced in `middleware.js`):
- `/` (Dashboard)
- `/timer`
- `/analytics`
- `/sessions`
- `/settings`
- `/categories`

The `/auth/signin` route is public. If a logged-in user visits it, they are redirected to `/`.

---

## 6. Request Lifecycle — How a Page Load Works

This section traces the complete journey of a request through the system.

### Example: User navigates to `/analytics`

```
1. Browser sends GET /analytics

2. Vercel Edge Network receives the request
   → Runs middleware.js (Edge Runtime)
   → Checks JWT cookie via auth()
   → User is logged in → allows request through

3. Vercel spins up a Serverless Function for the /analytics route
   → Next.js App Router matches to src/app/analytics/page.js

4. analytics/page.js is a Server Component (no 'use client')
   → It calls getAnalyticsData() from actions.js directly
   → getAnalyticsData() calls getUserId() → reads JWT → gets userId
   → Makes 2 database queries via Prisma → PgBouncer → Supabase PostgreSQL
   → Returns sessions + categories

5. Next.js renders the full HTML on the server with real data
   → Sends complete HTML to the browser

6. Browser hydrates the page (React takes over the interactive parts)
```

### Client-Side Data Fetching (Dashboard)
The Dashboard (`page.js`) is marked `'use client'`. It calls `getAnalyticsData` inside a `useEffect`. Server Actions can be called from client components — Next.js serializes the call as an HTTP POST to a special internal endpoint. This means the Dashboard **loads empty first, then fetches data** (no SSR for the stats).

---

## 7. Server Actions — The Data Layer

`src/app/actions.js` is the **single source of truth** for all database operations. It is marked `'use server'` at the top, which means every exported function is a **Server Action** — it always runs on the server, never in the browser.

### Security Model
Every single action begins with:
```js
const userId = await getUserId();
```
And all database queries are **always scoped by `userId`**:
```js
prisma.focusSession.findMany({ where: { userId, ... } })
```
This ensures a user can never read or modify another user's data, even if they know the ID of a record.

### Available Server Actions

| Function | Purpose |
|---|---|
| `getCategories()` | Fetch all categories for the user |
| `saveCategory(catForm)` | Create or update a category |
| `deleteCategory(id)` | Delete a category by ID |
| `getSessions()` | Fetch all sessions (for /sessions page) |
| `createSession({id, categoryId, goalText, durationMinutes})` | Start a new focus session. Enforces single-active-session rule. |
| `completeSession(id, {actualDurationSeconds, goalAchieved, note})` | Mark session complete + save reflection |
| `abandonSession(id, actualDurationSeconds)` | Mark session abandoned |
| `addNoteToSession(sessionId, text)` | Add a freeform note to a past session |
| `getAnalyticsData(range)` | Fetch analytics. Runs 2 DB queries, computes all stats in-memory |
| `getActiveSession()` | Find any `in_progress` or `paused` session for the user |
| `pauseSession(id, elapsedSeconds)` | Set status to `paused`, save `actualDurationSeconds` |
| `resumeSession(id)` | Set status back to `in_progress`, recalculate `startedAt` |

### Cache Revalidation
After any mutation (create/update/delete), `revalidatePath()` is called for affected routes. This tells Next.js to bust its cache so the next visit to that page fetches fresh data.

---

## 8. Page-by-Page Breakdown

### `/` — Dashboard (`page.js`)
- **Rendering:** `'use client'` — data is fetched client-side in `useEffect`
- **Data:** Calls `getAnalyticsData('week')`. Derives today's sessions and weekly category breakdown from the result in-memory.
- **Displays:** Greeting, 3 stat cards (today's focus, this week, all-time), Recent Sessions list, This Week category breakdown.

### `/timer` — Focus Timer (`timer/page.js`)
- **Rendering:** `'use client'`
- **State:** Fully managed in React state (`phase`: idle → running → paused → done)
- **Data Source:** 100% server-driven via `getActiveSession`, `pauseSession`, `resumeSession`. **Zero localStorage.**
- See [Section 9](#9-timer-architecture-server-driven) for full detail.

### `/analytics` — Analytics (`analytics/page.js`)
- **Rendering:** Server Component (no `'use client'`) — full SSR
- **Data:** Calls `getAnalyticsData(range)` where `range` comes from URL query params (`?range=week/month/all`).
- **Displays:** 4 stat cards, Donut chart (focus by category), Daily bar chart, Category breakdown table.
- **Navigation:** Range selector uses Next.js `<Link>` components with query params. Each click is a full server-side navigation and re-render.

### `/sessions` — Session Log (`sessions/page.js` + `SessionManager.js`)
- **Rendering:** `sessions/page.js` is a Server Component that fetches data via `getSessions()` and passes it as a prop to `SessionManager.js` (a Client Component).
- **Displays:** Filterable list of all sessions with status badges. Live (in-progress) sessions link to `/timer`. Allows adding notes to past sessions via a modal.

### `/categories` — Categories (`categories/page.js` + `CategoryManager.js`)
- **Rendering:** Same split as Sessions — Server Component fetches, Client Component handles UI.
- **Displays:** List of user's categories. CRUD operations (create, edit, delete) via `saveCategory` and `deleteCategory`.

### `/settings` — Settings (`settings/page.js`)
- **Rendering:** `'use client'`
- **Functionality:** Shows auth status, provides Sign Out button (calls `signOut` from `next-auth/react`), placeholder for future settings (export, theme).

### `/auth/signin` — Login Page
- **Rendering:** `'use client'` (needs `useSearchParams` hook)
- **Functionality:** Single button: "Continue with Google" — calls `signIn('google', { callbackUrl: '/' })` which initiates the Google OAuth 2.0 flow.

---

## 9. Timer Architecture (Server-Driven)

The timer is the most complex part of the system. Here is a complete breakdown.

### Core Principle
**The database is the source of truth for all timer state.** The browser only holds a local React state copy for rendering the ticking countdown. No data is ever persisted to `localStorage` or any other browser storage.

### Session Lifecycle

```
IDLE
 │
 │  User clicks "Start Session"
 ▼
RUNNING  ──────────────────────────────────────────────────────────────────┐
 │                                                                         │
 │  Timer ticks in browser (setInterval)                                  │
 │  Status in DB: "in_progress"                                           │
 │  DB field startedAt = time session was (last) started/resumed          │
 │                                                                         │
 │  User clicks Pause                        Timer naturally reaches 0     │
 ▼                                                                         │
PAUSED                                                                 DONE │
 │                                                                         │
 │  Status in DB: "paused"                   Status in DB: still          │
 │  DB field actualDurationSeconds = elapsed "in_progress" (not yet       │
 │                 at time of pause          updated until reflection)     │
 │                                                                         │
 │  User clicks Resume                                                     │
 ▼                                                                         │
RUNNING (again)                                                            │
                                                                           │
                              User fills in reflection form                │
                              Clicks "Save & Return"                        │
                                          │                                │
                                          ▼                                │
                                     COMPLETED ◄─────────────────────────┘
                                  Status in DB: "completed"
                                  actualDurationSeconds = final elapsed
                                  endedAt = now()
                                  goal.achieved = true/false
```

### Key Data Fields Used
| DB Field | Role |
|---|---|
| `status` | `in_progress`, `paused`, `completed`, `abandoned` |
| `startedAt` | The wall-clock time the timer last started or resumed. Gets **updated** on each resume. |
| `actualDurationSeconds` | Updated on Pause (to save elapsed time) and on Complete/Abandon. |
| `durationMinutes` | The original intended duration. Never changes. Used to compute `totalSecs = durationMinutes * 60`. |

### How Elapsed Time Is Calculated
- **While running:** `elapsed = Math.floor((Date.now() - startedAt) / 1000)`
- **While paused:** `elapsed = actualDurationSeconds` (last saved value)

### Resume Mechanics (`resumeSession`)
When a user resumes a paused session, the server **slides the `startedAt` timestamp backwards** so that the formula above continues to work correctly:
```js
const newStartedAt = new Date(Date.now() - (existing.actualDurationSeconds * 1000));
```
This means: if I paused after 5 minutes (300 seconds), and I resume now, set `startedAt = now() - 300 seconds`. The browser then correctly computes `elapsed = now() - startedAt = 300s`.

### On-Mount Initialization
Every time `/timer` is opened, it calls `getActiveSession()` which returns any `in_progress` or `paused` session from the database. The client then reconciles:

| DB Status | Client Action |
|---|---|
| `null` (no active session) | Shows idle form |
| `paused` | Restores paused state with `elapsed = actualDurationSeconds` |
| `in_progress` (still within time) | Resumes ticker from `elapsed = now() - startedAt` |
| `in_progress` (time exceeded) | Treats as `done`, shows reflection screen |

### Optimistic UI on Start
When the user clicks "Start Session", the UI transitions to `running` **immediately** before the server responds. A `crypto.randomUUID()` is generated on the client and sent to the server as the session `id`. This ensures the client and server always agree on the session ID without a round-trip. If the server rejects (e.g., duplicate session error), the UI rolls back to idle.

---

## 10. Connection Pooling Strategy

### The Problem
Vercel serverless functions are **stateless and short-lived**. Each function invocation can create a new Prisma client and a new database connection. Under load, this can exhaust the Supabase free tier connection limit (typically 60 connections) very quickly, causing all new requests to fail.

### The Solution: PgBouncer (Transaction Mode)
Supabase provides a managed **PgBouncer** connection pooler on port `6543`. In transaction pooling mode, a single long-lived physical connection to Postgres can be shared by many serverless function invocations — Prisma borrows a connection, runs its query, and immediately returns it to the pool.

**`DATABASE_URL` (used at runtime by Prisma):**
```
postgresql://...@pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1
```
- Port `6543` = PgBouncer pooler
- `pgbouncer=true` = Tells Prisma to disable prepared statements (incompatible with PgBouncer transaction mode)
- `connection_limit=1` = Tells the Prisma client to request at most 1 connection from the pool per serverless instance

**`DIRECT_URL` (used only by Prisma migrations):**
```
postgresql://...@pooler.supabase.com:5432/postgres
```
- Port `5432` = Direct connection, bypasses pooler
- Required for `prisma migrate deploy` because migrations need a persistent session

### Prisma Singleton
`src/lib/prisma.js` creates the Prisma client as a **global singleton**:
```js
export const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
```
In development (with Next.js hot reload), this prevents creating hundreds of new Prisma clients every time a file changes.

---

## 11. Known Issues & Current Limitations

### Analytics — Query Optimization (In Progress)
- **Current state (dev branch):** `getAnalyticsData` runs **2 DB queries** and computes all aggregates (totals, today stats, weekly stats) in JavaScript memory.
- **Current state (prod branch):** Still uses **5 DB queries** (3 aggregate + 2 findMany) via `Promise.all`.
- **Root cause of original issue:** On the old architecture, 5 simultaneous Prisma queries from a single serverless function attempted to open 5 connections, hitting the pool limit.

### Dashboard Data Fetch
- The Dashboard (`/`) is a `'use client'` component that calls `getAnalyticsData` in a `useEffect`. This means:
  - The page initially renders empty (no SSR for stats).
  - Stats appear after a client-side round-trip.
  - This is inconsistent with `/analytics` which is a full Server Component with SSR.
  - **Opportunity:** Converting the Dashboard to a Server Component would eliminate the client-side loading delay.

### Single Active Session Constraint
- The app enforces "one active session at a time" in `createSession`. If a user already has an `in_progress` session, the server returns an error.
- However, there is no cleanup mechanism to automatically expire stale `in_progress` sessions if the user never visits `/timer`. A very old session will remain `in_progress` in the database until the user manually opens the timer page.

### No Real-Time Updates
- There is no WebSocket or SSE connection. The timer countdown runs purely on the client via `setInterval`. If two browser tabs are open, they do not sync with each other.

### Settings Page
- Sign Out is functional.
- Export Data (CSV) is a placeholder — not yet implemented.
- Theme switching is a placeholder — not yet implemented.
