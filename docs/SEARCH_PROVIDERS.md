# Multi-Provider Facebook Search Integration Guide (Phase 3)

This document provides architectural details, configuration instructions, and operational guidelines for the multi-provider search engine powering the **Facebook Public Content Search** platform.

---

## 1. Architectural Overview

The search engine employs a decoupled, multi-provider architecture managed by an orchestrator (`SearchOrchestrator`). This design ensures high availability, resilient query routing, and strict adherence to external API policies.

```
                          [User Query / Keyword]
                                    |
                        [buildTargetedFacebookQueries]
                                    |
       +----------------------------+----------------------------+
       |                            |                            |
       v                            v                            v
[TavilyProvider]             [BraveProvider]             [MetaGraphProvider]
(Primary Search)          (Secondary Discovery)        (Official Page Access)
       |                            |                            |
       +----------------------------+----------------------------+
                                    |
                           [Promise.allSettled]
                                    |
                   [classifyFacebookUrl & Deduplication]
                                    |
                       [NormalizedSearchResult[]]
                                    |
                    +---------------+---------------+
                    |                               |
             [UI Result Cards]          [Supabase Usage Telemetry]
```

### Core Provider Modules
- **`src/lib/providers/types.ts`**: Unified TypeScript data structures (`SearchProvider`, `NormalizedSearchResult`, `NormalizedSearchResponse`, `ProviderSearchOptions`).
- **`src/lib/search/query-builder.ts`**: Query builder generating targeted Facebook dorks and regex-based URL classifier.
- **`src/lib/providers/tavily.ts`**: Primary search adapter using the official Tavily API with domain restrictions (`include_domains: ["facebook.com"]`).
- **`src/lib/providers/brave.ts`**: Secondary discovery adapter using Brave Search API with quota exhaustion guards.
- **`src/lib/providers/meta.ts`**: Official Meta Graph API v21.0 connector for authorized Page posts and comment edge inspection.
- **`src/lib/search/orchestrator.ts`**: Concurrent search runner with deduplication, error isolation, and usage logging.

---

## 2. Provider Specifications & Guardrails

### A. Tavily Search API (Default Provider)
- **Role**: Primary discovery engine for indexed public Facebook posts, pages, and videos.
- **Endpoint**: `https://api.tavily.com/search`
- **Configuration**:
  - `include_domains`: `["facebook.com"]`
  - `search_depth`: `"advanced"`
  - `include_raw_content`: `false` (avoids bloated payloads, fetches snippets cleanly)
- **Resilience**: Exponential backoff retry logic (up to 2 retries) and configurable 8-second timeout.

### B. Brave Search API (Secondary Discovery)
- **Role**: Supplemental web discovery engine for public Facebook content.
- **Endpoint**: `https://api.search.brave.com/res/v1/web/search`
- **Query Prefix**: `site:facebook.com ...`
- **Quota & Top-Up Protection**:
  - **HTTP 429 Quota Exhaustion Guard**: When quota is exceeded or rate-limited, the provider immediately halts and records `brave_quota_exhausted: true`.
  - **No Paid Auto Top-Ups**: Adheres strictly to the requirement that paid automatic wallet top-ups are disabled.
  - Returns empty results without crashing other active providers.

### C. Meta Graph API v21.0 (Official Connector)
- **Role**: Direct access connector for authorized Facebook Pages and permitted post details.
- **Endpoint**: `https://graph.facebook.com/v21.0`
- **Features Supported**:
  - Page Post retrieval (`/{page-id}/posts` or `/me/posts`)
  - Reaction counts and shares summary
  - Official comments edge (`/{post-id}/comments`)
- **Compliance & Privacy Guardrails**:
  - **No Unrestricted Profile Scraping**: Does not claim or attempt unauthorized scraping of private user profiles (which Meta removed in Graph API v2.0).
  - **Disabled by Default**: Remains inactive unless `META_PAGE_ACCESS_TOKEN` is configured and passes validation.
  - **Token Expiration Handling**: Specifically detects OAuth error code `190` (`Error validating access token: Session has expired`), surfaces user-friendly re-authentication alerts, and logs the incident without throwing unhandled exceptions.

---

## 3. Query Generation & Facebook URL Classification

A common pitfall is assuming any link from `facebook.com` represents a standard post. The query builder and classifier distinguish content types via URL structure:

| URL Pattern | Classified Type | Notes |
| :--- | :--- | :--- |
| `facebook.com/.../videos/...` | `video` | Video content |
| `facebook.com/watch/?v=...` | `video` | Facebook Watch player |
| `facebook.com/reel/...` | `reel` | Short-form vertical video |
| `facebook.com/.../posts/...` | `post` | Standard feed post |
| `facebook.com/permalink.php?id=...`| `post` | Legacy permalink post |
| `facebook.com/[vanity-name]` | `page` | Brand/organization vanity page |
| Other Facebook links | `general` | Fallback classification |

Targeted queries generated by `buildTargetedFacebookQueries("keyword")`:
- **General**: `site:facebook.com "keyword"`
- **Posts**: `site:facebook.com inurl:posts OR inurl:permalink "keyword"`
- **Videos**: `site:facebook.com inurl:videos OR inurl:watch OR inurl:reel "keyword"`
- **Pages**: `site:facebook.com -inurl:posts -inurl:videos -inurl:photos "keyword"`

---

## 4. Environment Variables Configuration

Add the following provider keys to your `.env.local` file:

```env
# Tavily Search API
TAVILY_API_KEY=tvly-your-tavily-api-key-here

# Brave Search API
BRAVE_SEARCH_API_KEY=BSA-your-brave-search-key-here

# Meta Graph API (Optional - for approved Page access)
META_PAGE_ACCESS_TOKEN=EAAB...your-page-access-token-here
META_APP_ID=123456789012345
META_APP_SECRET=your_app_secret_here
META_GRAPH_API_VERSION=v21.0
```

> [!NOTE]
> All provider secrets are accessed strictly on the server (`process.env.*`) and are never prefixed with `NEXT_PUBLIC_`. Client components communicate with providers exclusively through Next.js Server Actions.

---

## 5. Verification & Testing

The project includes an automated verification script covering mock unit tests and live integration tests:

```bash
# Run the Phase 3 Multi-Provider test suite
npx tsx scripts/test-phase3.ts
```

### Verification Criteria:
1. **Query Builder & URL Classifier**: 12/12 assertions passed.
2. **Tavily Provider**: Configuration check & response normalization.
3. **Brave Provider**: 429 quota exhaustion guard verification.
4. **Meta Graph Provider**: Disabled state when token missing, Code 190 token expiration guard.
5. **Search Orchestrator**: Concurrency, deduplication, and fault isolation when one provider encounters errors.
