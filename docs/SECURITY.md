# Security Architecture & Production Guardrail Decisions

This document outlines the security architecture, threat model, free-tier cost protections, and implementation decisions for the **Facebook Public Content Search** platform.

---

## 1. Threat Model & Design Principles

The application interfaces with external search engines, Meta Graph API v21.0, and Supabase PostgreSQL. The core security principles enforced are:

1. **Least Privilege & Zero Client-Side Trust**: All API keys, database service-role secrets, and access tokens are strictly server-bound. The frontend only receives masked references and sanitized data.
2. **Deterministic Cost Guardrails**: The system enforces hard safety caps below published free-tier thresholds to prevent unexpected billing. Paid automatic top-ups and silent plan upgrades are strictly prohibited.
3. **Resilient Failover**: If any individual provider exhausts its monthly quota or encounters upstream errors, the orchestrator gracefully marks that provider as `quota_exhausted` and continues fulfilling search queries with remaining healthy providers.
4. **Input Defense in Depth**: All inputs pass dual validation via Zod schemas and security inspection (SSRF protection, domain validation, size bounding, and rate limiting).

---

## 2. Server-Only Secrets & Masking

### Threat
Client-side exfiltration of search API tokens (`TAVILY_API_KEY`, `BRAVE_SEARCH_API_KEY`, `META_PAGE_ACCESS_TOKEN`, `META_APP_SECRET`, Supabase service role).

### Implementation
- **Isolation**: Environment variables are accessed solely within Node.js Server Actions and server modules (`src/lib/providers/`, `src/lib/security/`).
- **Masking Protocol**: In administrative and provider settings views (`/settings/providers`), secrets are masked via `maskSecret()`:
  - Example: `tvly-9a8b...7x8y` is displayed as `tvly-••••••••7x8y`.
  - Keys with less than 8 characters are fully obscured (`••••••••`).
  - Missing keys return an explicit `Not configured` state without exposing environment variables.
- **Client Bundling Audit**: Verified zero references to `process.env.*` secrets in client bundles.

---

## 3. Free-Tier Usage Protection & Cost Controls

### Threat
Unexpected billing spikes, paid auto-renewal top-ups, or unmetered background calls exhausting developer tiers.

### Configured Safety Buffers & Limits

| Provider | Published Limit | Safety Buffer | Hard Quota Cap | Unit / Operation Cost | Auto Top-Up Policy |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Tavily** | 1,000 credits/mo | 5% (50 credits) | **950 credits** | 1 credit (basic search)<br>2 credits (advanced / raw content) | **Prohibited** |
| **Brave** | 1,000 queries ($5.00) | 5% ($0.25 / 50 req) | **950 queries ($4.75)** | $0.005 / request | **Prohibited** |
| **Meta Graph** | 2,000 calls/mo | 5% (100 calls) | **1,900 calls** | 1 call / edge request | **Prohibited** |

### Dynamic Credit Computation (Tavily)
As per specifications, the system does not assume a constant 1-to-1 ratio:
- `calculateTavilyCredits()` calculates credits dynamically:
  - Standard basic search: **1 credit**.
  - Advanced search (`search_depth: "advanced"`) or raw extraction (`include_raw_content: true`): **2 credits**.

### Quota Exhaustion Behavior
Before invoking any provider:
1. `checkProviderQuota(provider, cost)` checks monthly consumption against the hard cap.
2. If `usedThisMonth + cost > limit`:
   - The provider status changes to `quota_exhausted`.
   - The provider is skipped for the remainder of the calendar month.
   - The orchestrator appends a telemetry note: `"[Provider] Skipped: Monthly free-tier quota limit reached"`.
   - Remaining active providers continue search execution uninterrupted.
   - **Zero Automatic Upgrades**: No billing top-ups or credit card charges can be triggered programmatically.

---

## 4. Server-Side Request Forgery (SSRF) Defense

### Threat
Attackers submitting search queries crafted to probe internal cloud metadata (`169.254.169.254`), loopback services (`localhost`, `127.0.0.1`, `::1`), or private intranet hosts (`10.0.0.0/8`, `192.168.0.0/16`, `172.16.0.0/12`).

### Implementation (`validateSearchQuery`)
- **Prohibited Schemes**: Immediate rejection of `file://`, `gopher://`, `dict://`, `ftp://`, `ldap://`, `tftp:`, `javascript:`, and `data:` URIs.
- **Loopback & Metadata Blocker**:
  - Rejects any query referencing `localhost`, `127.0.0.1`, `0.0.0.0`, `::1`, or `169.254.169.254`.
- **Private IP Range Regex**:
  - Scans all IPv4 address candidates in queries and blocks RFC 1918 private subnets.
- **Request Size Limiting**:
  - Queries are capped at **200 characters maximum**. Excessively large payloads or buffer overflow vectors are rejected immediately.
- **Character Sanitization**:
  - Strips null bytes (`\x00`) and unprintable ASCII control characters.

---

## 5. Strict Facebook Domain Verification

### Threat
Malicious domain redirection, phishing links, lookalike domains, or subdomain spoofing.

### Implementation (`validateFacebookDomain` & `isValidFacebookUrl`)
- **Strict Host Whitelist**:
  - Allowed: `facebook.com`, `www.facebook.com`, `m.facebook.com`, `web.facebook.com`, `touch.facebook.com`, `mbasic.facebook.com`, `fb.watch`, `www.fb.watch`, `fb.me`, `www.fb.me`, `graph.facebook.com`.
- **Anti-Spoofing Checks**:
  - Rejects lookalikes (`evil-facebook.com`, `facebook-login.net`).
  - Rejects subdomain injection (`facebook.com.attacker.com`).
  - Enforces HTTPS canonicalization.

---

## 6. Per-User Search Rate Limiting

### Threat
Query flooding, DDoS, scraping abuse, or rapid credential exhaustion by a single user session or IP.

### Implementation (`checkUserRateLimit`)
- **Algorithm**: Sliding-window rate limiting keyed by authenticated `userId` (or client IP for unauthenticated routes).
- **Default Threshold**: **10 searches per minute** per user.
- **Behavior on Violation**:
  - Returns HTTP 429 status code with a user-friendly message stating exact seconds until reset (`resetInMs`).
  - Search pipeline terminates before hitting external provider APIs or database write jobs.

---

## 7. Credential Sanitization in Error Messages & Logs

### Threat
Upstream provider error responses reflecting API keys in URLs or headers (e.g. `api.tavily.com/search?api_key=tvly-xxx`), subsequently stored in database error logs or shown in client alerts.

### Implementation (`sanitizeErrorMessage`)
All error messages returned by providers or passed to `logProviderUsage` are sanitized:
- Replaces `api_key=...`, `access_token=...`, `token=...`, `secret=...` with `[REDACTED]`.
- Replaces `Authorization: Bearer <token>` with `Bearer [REDACTED]`.
- Replaces `X-Subscription-Token: <token>` with `X-Subscription-Token: [REDACTED]`.
- Strips internal server filesystem paths (`D:\...`, `/var/...`).
- Masks cloud metadata IPs (`169.254.169.254` -> `[INTERNAL_METADATA_IP]`).

---

## 8. Meta Graph API Security & Token Validation

### Threat
Expired user access tokens, revoked permissions, session invalidations, or lack of request authenticity.

### Implementation
- **HMAC-SHA256 `appsecret_proof`**:
  - When `META_APP_SECRET` is configured, all requests to `graph.facebook.com` compute an `appsecret_proof` (`crypto.createHmac('sha256', appSecret).update(token).digest('hex')`). This prevents attackers from using stolen access tokens from unauthorized IPs.
- **Token Validation (`validateToken`)**:
  - Validates connection health against `/me` or `/debug_token`.
- **Expired Token Handling**:
  - Explicitly checks for Meta OAuth Exception **Code 190** (token expired / revoked).
  - Automatically marks status as `token_expired`.
  - Disables Meta post enrichment and comment edge gracefully without crashing general search queries.
- **Comment Edge Security**:
  - Enforces pagination (`after` cursor, max 25-100 comments).
  - Disallows search snippets from being treated as genuine comments.

---

## 9. Row-Level Security (RLS) Verification

All Supabase tables (`profiles`, `searches`, `search_jobs`, `search_results`, `saved_searches`, `provider_usage`) enforce RLS policies:
- `auth.uid() = user_id`: Users can only read and modify their own search history, saved searches, and result associations.
- Server-side admin operations utilize `createAdminClient()` strictly in protected server actions and background synchronization tasks.
- Service-role keys are never exported or referenced in client-side code.
