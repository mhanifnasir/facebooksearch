# Facebook Public Content Search SaaS

[![Next.js](https://img.shields.io/badge/Next.js-16.4.6-black?style=flat&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.3.0-blue?style=flat&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4.0-38bdf8?style=flat&logo=tailwind-css)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Auth%20%26%20Postgres-3ecf8e?style=flat&logo=supabase)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-Proprietary-red)](#)

A production-grade web application for discovering, monitoring, analyzing, and indexing public Facebook content (Posts, Pages, Videos, Comments) via resilient multi-provider search orchestration (Tavily, Brave Search, and Meta Graph API v21.0) with strict free-tier cost protections and zero demonstration data in production.

---

## Features

- **Multi-Provider Search Engine**:
  - **Tavily Search API**: Primary content discovery with targeted Facebook query builders and domain restriction.
  - **Brave Search API**: Secondary independent web search index with strict $5 monthly budget enforcement.
  - **Meta Graph API v21.0**: Authorized Page retrieval and authentic comment edge inspection via official Graph endpoints.
- **Intelligent Life-Cycle Processing**:
  - Conservative content classification (`post`, `page`, `video`, `unknown`).
  - URL canonicalization, tracking parameter stripping (`fbclid`, `utm_*`), and multi-provider provenance deduplication.
  - Authentic comment edge cursor pagination (strictly distinguishes verified comments from search snippets).
- **Free-Tier Protection & Cost Controls**:
  - Tavily hard cap at 950 credits/mo (5% safety margin below 1,000). Dynamic credit computation (1 credit basic, 2 credits deep/extract).
  - Brave Search capped at 950 queries ($4.75 budget). **Strictly zero automatic top-ups**.
  - Provider auto-failover: quota exhaustion marks the provider paused while remaining providers fulfill search queries.
- **Enterprise Security**:
  - Server-only secrets; masked API keys in UI (`tvly-••••••••7x8y`).
  - Server-Side Request Forgery (SSRF) protection blocking loopback, AWS metadata (`169.254.169.254`), and private RFC 1918 subnets.
  - Per-user rate limiting (10 searches/min) with HTTP 429 backoff timers.
  - Credential stripping in logs and error strings (`api_key=[REDACTED]`).
- **Complete SaaS Dashboard**:
  - Live PostgreSQL-backed metrics: Total Searches, Discovered Posts, Facebook Pages, Videos, Discovered Comments, Provider Telemetry.
  - Saved searches with email notification triggers and serverless cron execution.
  - Search history with repeat query actions and CSV/JSON exports.
  - Fully responsive layout featuring a dark navy sidebar and blue accents.

---

## Tech Stack

- **Framework**: Next.js 16 (App Router, Turbopack, Server Actions)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4, shadcn/ui design patterns, Lucide icons
- **Charts**: Recharts
- **Database & Auth**: Supabase PostgreSQL with Row Level Security (RLS) & `@supabase/ssr`
- **Validation**: Zod schema validation
- **Deployment Targets**: Vercel Serverless & Supabase Cloud

---

## Getting Started

### 1. Prerequisites
- Node.js 20+ (LTS recommended)
- A Supabase project (free tier works)
- Tavily API key ([tavily.com](https://tavily.com))
- Brave Search API key ([brave.com/search/api](https://brave.com/search/api/))
- *(Optional)* Meta Graph App & Page Access Token ([developers.facebook.com](https://developers.facebook.com/))

### 2. Installation
```bash
git clone https://github.com/your-username/facebooksearch.git
cd facebooksearch
npm install
```

### 3. Environment Configuration
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Populate the required credentials:
```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Search Providers (Server-Side Only)
TAVILY_API_KEY=tvly-your-api-key
BRAVE_API_KEY=BSA-your-api-key
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_ACCESS_TOKEN=your-meta-page-token
META_GRAPH_API_VERSION=v21.0
```

> **Security Note**: Only variables prefixed with `NEXT_PUBLIC_` are bundled to the browser. All API keys and service-role credentials remain strictly server-bound.

### 4. Supabase Database Setup
1. Log in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Navigate to the **SQL Editor**.
3. Run the schema migration found in:
   `supabase/migrations/20261122000000_phase2_schema_and_rls.sql`
4. This creates all 9 application tables, triggers, and Row Level Security policies:
   - `profiles`
   - `facebook_pages`
   - `facebook_posts`
   - `facebook_comments`
   - `searches`
   - `search_jobs`
   - `search_results`
   - `saved_searches`
   - `provider_usage`

### 5. Running Locally
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to view the application.

---

## API Provider Setup Instructions

### 1. Tavily Search API (Primary Discovery)
1. Sign up at [tavily.com](https://tavily.com).
2. Generate an API Key in your dashboard (starts with `tvly-`).
3. Add to `.env.local`: `TAVILY_API_KEY=tvly-xxxxxxxx`.
4. Free tier provides **1,000 monthly credits**. The application applies a 5% safety margin, enforcing a hard cap at **950 credits**.

### 2. Brave Search API (Secondary Index)
1. Sign up at [brave.com/search/api](https://brave.com/search/api/).
2. Create a Free API plan ($5.00 monthly credit budget).
3. Copy your subscription token.
4. Add to `.env.local`: `BRAVE_API_KEY=BSA-xxxxxxxx` (or `BRAVE_SEARCH_API_KEY`).
5. **No auto-reload**: The application hard-caps usage at **950 queries** ($4.75) and explicitly disables paid automatic top-ups.

### 3. Meta Graph API (Optional Direct Page Edge)
1. Go to [developers.facebook.com](https://developers.facebook.com/) and create a Business App.
2. In App Settings, note your **App ID** and **App Secret**.
3. Use the Graph API Explorer or your Page settings to generate a Page Access Token with public reading permissions.
4. Add to `.env.local`:
   ```env
   META_APP_ID=your_app_id
   META_APP_SECRET=your_app_secret
   META_ACCESS_TOKEN=your_page_access_token
   META_GRAPH_API_VERSION=v21.0
   ```
5. If unconfigured or token expires (OAuth Code 190), the system automatically degrades gracefully and falls back to Tavily and Brave Search.

---

## Required Manual Meta Permissions

To enable live Meta Graph API enrichment and comment retrieval, the following permissions are required depending on your deployment scope:

1. **Development Mode**:
   - `pages_show_list`: Allows the app to list Facebook Pages managed by the developer.
   - `pages_read_engagement`: Grants access to public posts, comments, likes, and reactions for managed Pages.
2. **Production App Review (Public Access)**:
   - **Page Public Content Access (PPCA)**: Required to read public posts from third-party verified Facebook Pages that you do not own. Requires submitting a Meta App Review with video demonstration.
   - **Business Verification**: The Meta Developer account must be connected to a verified Meta Business Manager organization.
3. **App Secret Proof**:
   - In App Settings > Advanced, keep **Require App Secret** enabled. The backend automatically signs every Graph API request with HMAC-SHA256 (`appsecret_proof = hash_hmac('sha256', access_token, app_secret)`).

---

## Production Limitations & Compliance Disclosures

- **Video Compliance Notice**: In accordance with Facebook Platform Terms, this application **never downloads, scrapes raw binary video files, or rehosts Facebook videos**. All video cards display public metadata, durations, and direct links to the official Facebook Watch player.
- **Authentic Comments Notice**: Search engine snippets are never stored or presented as genuine Facebook comments. Comments are sourced exclusively from the official Meta Graph API `/comments` edge when authorized.
- **Global Scraping Boundary**: Meta Graph API does not provide an unrestricted global search endpoint across private personal Facebook profiles. Global discovery is facilitated through web-indexed search endpoints (Tavily & Brave) with strict Facebook domain filters.
- **Vercel Serverless Limits**: Serverless execution functions on Vercel Hobby tier have a 15-second execution timeout. All provider operations enforce internal 5–8 second abort signals to stay well within serverless limits.

---

## Deployment Guide

### Vercel Deployment

1. **Push to GitHub**:
   Ensure all changes are committed and pushed to your GitHub repository:
   ```bash
   git add .
   git commit -m "feat: production deployment readiness"
   git push origin main
   ```

2. **Import Project to Vercel**:
   - Go to [vercel.com/new](https://vercel.com/new).
   - Select your `facebooksearch` repository.
   - Framework Preset: **Next.js**.
   - Build Command: `npm run build`.

3. **Configure Environment Variables in Vercel**:
   In **Project Settings** > **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXT_PUBLIC_SITE_URL` (e.g. `https://your-domain.vercel.app`)
   - `TAVILY_API_KEY`
   - `BRAVE_API_KEY`
   - `META_APP_ID` (optional)
   - `META_APP_SECRET` (optional)
   - `META_ACCESS_TOKEN` (optional)
   - `CRON_SECRET` (generate a random 32-character string for securing cron jobs)

4. **Deploy**:
   Click **Deploy**. Vercel will run Turbopack, compile routes, and provision serverless functions.

### Supabase Production Configuration

1. **Authentication Redirect URLs**:
   - In Supabase Dashboard > **Authentication** > **URL Configuration**:
     - **Site URL**: `https://your-domain.vercel.app`
     - **Redirect URLs**:
       - `https://your-domain.vercel.app/**`
       - `https://your-domain.vercel.app/auth/callback`
       - `http://localhost:3000/**` (for local development)

2. **Verify Row Level Security (RLS)**:
   - In **Authentication** > **Policies**, verify that RLS is active on all 9 tables. All user data access is scoped strictly via `auth.uid() = user_id`.

---

## Testing & Quality Verification

Run the automated test suites:
```bash
# Run all verified test suites across Phases 3 to 7 (190 tests)
npm run test:all

# Or run individual phase test suites:
npx tsx scripts/test-phase3.ts  # Multi-Provider Adapters & Normalization (27 tests)
npx tsx scripts/test-phase4.ts  # Search Orchestrator, Classification & Deduplication (37 tests)
npx tsx scripts/test-phase5.ts  # Real Dashboard & Backend CRUD Integration (19 tests)
npx tsx scripts/test-phase6.ts  # Provider Quotas, SSRF & Rate Limiting (55 tests)
npx tsx scripts/test-phase7.ts  # Production Deployment & Vercel Verification (52 tests)
```

Check TypeScript types and production build:
```bash
npx tsc --noEmit
npm run build
```

---

## Security Architecture

For detailed security disclosures, rate limit models, and SSRF defenses, see [docs/SECURITY.md](docs/SECURITY.md).
