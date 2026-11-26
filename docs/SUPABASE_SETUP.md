# Supabase Database & Authentication Setup Guide

This document describes the Supabase PostgreSQL database architecture, authentication flows, Row Level Security (RLS) policies, and deployment setup for **Facebook Public Content Search**.

---

## 1. Architecture Overview

- **Auth Provider**: Supabase Auth (Email & Password, OAuth callback support, PKCE flow)
- **SSR Client**: `@supabase/ssr` with Next.js App Router cookie handling
- **Database**: PostgreSQL 15+ hosted on Supabase
- **Access Control**: Row Level Security (RLS) enabled on all 9 tables
- **Security Boundaries**:
  - `anon` key used strictly on client and authenticated sessions
  - `service_role` key used strictly on the server (`createAdminClient()`), never exposed to frontend code

---

## 2. Database Schema & Tables

The schema is defined in [`supabase/migrations/20261122000000_phase2_schema_and_rls.sql`](../supabase/migrations/20261122000000_phase2_schema_and_rls.sql).

| Table Name | Description | RLS Policy Summary |
|---|---|---|
| `profiles` | Extended user profile metadata (name, organization, timezone, role). Auto-created on signup via trigger. | Users can view and update **only their own** profile (`auth.uid() = id`). |
| `searches` | Audit log of executed search queries, parameters, and latency. | Users can view, insert, update, delete **only their own** search records (`auth.uid() = user_id`). |
| `search_jobs` | Multi-provider background extraction job status tracker. | Users can view, insert, update **only their own** search jobs (`auth.uid() = user_id`). |
| `search_results` | Relational join table mapping user searches to discovered posts. | Users can view, insert, delete **only their own** mappings (`auth.uid() = user_id`). |
| `saved_searches` | Monitored query profiles with alert frequency and notification settings. | Users can view, create, update, delete **only their own** monitors (`auth.uid() = user_id`). |
| `facebook_pages` | Public cache of discovered Facebook pages and follower metrics. | Authenticated users can read. Write operations restricted to service role / scraper jobs. |
| `facebook_posts` | Public cache of discovered posts, video metadata, and reaction counts. | Authenticated users can read. Write operations restricted to service role / scraper jobs. |
| `facebook_comments` | Public comments extracted from posts with sentiment classification. | Authenticated users can read. Write operations restricted to service role / scraper jobs. |
| `provider_usage` | Telemetry logs tracking API calls, latencies, and quota costs across providers. | Users can view their own calls (`auth.uid() = user_id`). Admin client logs server calls. |

---

## 3. Step-by-Step Setup Instructions

### Step 1: Create a Supabase Project
1. Log in to [Supabase Console](https://supabase.com/dashboard).
2. Click **New Project**, choose your organization, name it `facebook-public-search`, and set a secure database password.
3. Select your preferred hosting region.

### Step 2: Apply Migrations & Schema
1. Open the **SQL Editor** in your Supabase project dashboard.
2. Open [`supabase/migrations/20261122000000_phase2_schema_and_rls.sql`](../supabase/migrations/20261122000000_phase2_schema_and_rls.sql).
3. Paste and run the entire script. It creates:
   - All 9 tables with constraints and indexes
   - The `handle_new_user()` auto-profile trigger on `auth.users`
   - Explicit Row Level Security (RLS) policies for strict tenant isolation
4. *(Optional)* Run [`supabase/seed.sql`](../supabase/seed.sql) to populate initial demonstration pages, posts, and comments.

### Step 3: Configure Auth & Redirect URLs
1. Navigate to **Authentication -> URL Configuration** in your Supabase dashboard.
2. Set **Site URL** to:
   ```
   http://localhost:3000
   ```
3. Add Redirect URLs:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3000/reset-password
   https://your-production-domain.com/auth/callback
   https://your-production-domain.com/reset-password
   ```

### Step 4: Configure Environment Variables
Copy `.env.example` to `.env.local` and add your project credentials:

```bash
# Found in Supabase Dashboard -> Project Settings -> API
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# SERVER-SIDE ONLY - Found in Supabase Dashboard -> Project Settings -> API -> service_role secret
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Base application URL
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

---

## 4. Authentication Flow Details

1. **Sign Up (`/register`)**:
   - Collects Full Name, Email, Organization, and Password (min. 8 characters).
   - Calls `signUp()` in `src/app/auth/actions.ts`.
   - Sends confirmation email or auto-signs in if email confirmation is disabled.
   - Profile record is automatically generated in `public.profiles`.

2. **Sign In (`/login`)**:
   - Accepts user credentials.
   - Calls `signIn()` in `src/app/auth/actions.ts`.
   - Includes a one-click **Demo Analyst Account** prefill button for offline/demo evaluation without requiring active Supabase connectivity.
   - Redirects to `/dashboard` or the originally requested protected URL (`?redirectTo=...`).

3. **Session Refresh & Protection (`src/middleware.ts`)**:
   - Every request to `/dashboard/*`, `/search/*`, `/posts/*`, `/pages/*`, `/videos/*`, `/comments/*`, `/history/*`, `/saved/*`, and `/settings/*` is intercepted.
   - Calls `updateSession()` with `@supabase/ssr` to refresh expiring JWT tokens.
   - Unauthenticated requests are redirected to `/login?redirectTo=<target>`.

4. **Sign Out**:
   - Calling `signOut()` terminates the Supabase session, purges session cookies, and redirects to `/login`.

5. **Password Reset (`/forgot-password` & `/reset-password`)**:
   - User requests reset link via `requestPasswordReset()`.
   - Supabase emails a secure PKCE verification link to `/auth/callback?next=/reset-password`.
   - User inputs new password on `/reset-password` and `updatePassword()` updates their credentials.

---

## 5. Security & Verification Checklist

- [x] **No Service-Role Key Leaks**: `SUPABASE_SERVICE_ROLE_KEY` is never prefixed with `NEXT_PUBLIC_` and `createAdminClient()` explicitly validates `typeof window === 'undefined'`.
- [x] **Strict RLS Enforcement**: Every table has RLS enabled. User searches and saved searches are isolated via `USING (auth.uid() = user_id)`.
- [x] **IDOR Protection**: Repositories require both `id` AND `user_id` when accessing or mutating user records (`getSearchById`, `deleteSearch`, `updateSavedSearch`).
- [x] **Input Validation**: All forms and repository inputs validate string lengths, types, and required fields before executing queries.
- [x] **Automated Tests**: Unit and security verification test suite in `scripts/test-phase2.ts` passes (12/12 tests green).
- [x] **Build Verification**: `npm run build` succeeds with zero errors (all 20 static and dynamic routes compiled).
