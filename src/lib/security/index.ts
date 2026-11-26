/**
 * Facebook Public Content Search - Security Core Module
 * 
 * Provides:
 * - Server-only secret masking
 * - Error message & log sanitization (credential stripping)
 * - SSRF protection and query validation
 * - Strict Facebook domain verification
 * - In-memory sliding-window per-user rate limiting
 */

// Private IPv4 and IPv6 patterns for SSRF prevention
const PRIVATE_IP_PATTERNS = [
  /^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,             // Loopback 127.0.0.0/8
  /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/,              // Private 10.0.0.0/8
  /^192\.168\.\d{1,3}\.\d{1,3}$/,                 // Private 192.168.0.0/16
  /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}$/, // Private 172.16.0.0/12
  /^169\.254\.\d{1,3}\.\d{1,3}$/,                 // Link-local / AWS metadata 169.254.0.0/16
  /^0\.0\.0\.0$/,                                 // Broadcast 0.0.0.0
  /^::1$/,                                        // IPv6 loopback
  /^fc00:/i,                                      // IPv6 unique local
  /^fe80:/i,                                      // IPv6 link-local
];

const PROHIBITED_SCHEMES = [
  "file:",
  "gopher:",
  "dict:",
  "ftp:",
  "ldap:",
  "tftp:",
  "javascript:",
  "data:",
];

/**
 * Safely masks sensitive API keys and tokens for display.
 * Never displays raw credentials on the client or in logs.
 * Example: "tvly-9a8b...7x8y" -> "tvly-••••••••7x8y"
 */
export function maskSecret(secret?: string | null, visibleChars = 4): string {
  if (!secret || typeof secret !== "string") {
    return "Not configured";
  }

  const trimmed = secret.trim();
  if (trimmed.length === 0) {
    return "Not configured";
  }

  if (trimmed.length <= visibleChars * 2) {
    return "••••••••";
  }

  const prefix = trimmed.slice(0, Math.min(visibleChars, 4));
  const suffix = trimmed.slice(-visibleChars);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Strips API keys, access tokens, auth headers, and private IPs from error messages.
 * Prevents credential leakages in logs, database records, and UI responses.
 */
export function sanitizeErrorMessage(errorText?: string | null): string {
  if (!errorText || typeof errorText !== "string") {
    return "An unexpected error occurred.";
  }

  let sanitized = errorText;

  // Strip query string tokens (e.g. ?api_key=..., &access_token=...)
  sanitized = sanitized.replace(
    /(api_key|access_token|key|token|secret|password)=([a-zA-Z0-9_\-\.]+)/gi,
    "$1=[REDACTED]"
  );

  // Strip Bearer & Subscription tokens
  sanitized = sanitized.replace(/Bearer\s+([a-zA-Z0-9_\-\.]+)/gi, "Bearer [REDACTED]");
  sanitized = sanitized.replace(
    /X-Subscription-Token:\s*([a-zA-Z0-9_\-\.]+)/gi,
    "X-Subscription-Token: [REDACTED]"
  );

  // Strip AWS/Cloud metadata IPs
  sanitized = sanitized.replace(/169\.254\.169\.254/g, "[INTERNAL_METADATA_IP]");

  // Strip local filesystem paths
  sanitized = sanitized.replace(/[a-zA-Z]:\\[^:\n\r\t]+/g, "[LOCAL_PATH]");
  sanitized = sanitized.replace(/\/(?:home|var|usr|etc|root)\/[^:\n\r\t]+/g, "[LOCAL_PATH]");

  return sanitized.trim();
}

/**
 * Validates a search query for size limits and SSRF / injection patterns.
 * Request size limit: Max 200 characters for queries.
 */
export function validateSearchQuery(rawQuery: string): {
  isValid: boolean;
  sanitized: string;
  error?: string;
} {
  if (!rawQuery || typeof rawQuery !== "string") {
    return { isValid: false, sanitized: "", error: "Search query is required." };
  }

  const trimmed = rawQuery.trim();

  // 1. Length bounds (Request size limit)
  if (trimmed.length === 0) {
    return { isValid: false, sanitized: "", error: "Search query cannot be empty." };
  }
  if (trimmed.length > 200) {
    return {
      isValid: false,
      sanitized: trimmed.slice(0, 200),
      error: "Search query exceeds maximum length of 200 characters.",
    };
  }

  // 2. Reject prohibited protocol schemes
  const lower = trimmed.toLowerCase();
  for (const scheme of PROHIBITED_SCHEMES) {
    if (lower.includes(scheme)) {
      return {
        isValid: false,
        sanitized: "",
        error: `Query contains prohibited URI scheme (${scheme}) for SSRF security.`,
      };
    }
  }

  // 3. SSRF / Private network inspection
  if (
    lower.includes("localhost") ||
    lower.includes("127.0.0.1") ||
    lower.includes("169.254.169.254") ||
    lower.includes("0.0.0.0") ||
    lower.includes("::1")
  ) {
    return {
      isValid: false,
      sanitized: "",
      error: "Query references internal loopback or metadata address (SSRF protection).",
    };
  }

  // Check for private IPv4 patterns anywhere in the string
  const ipCandidates = lower.match(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g);
  if (ipCandidates) {
    for (const ip of ipCandidates) {
      for (const pattern of PRIVATE_IP_PATTERNS) {
        if (pattern.test(ip)) {
          return {
            isValid: false,
            sanitized: "",
            error: "Query references private internal network address (SSRF protection).",
          };
        }
      }
    }
  }

  // 4. Strip null bytes and non-printable control characters
  const sanitized = trimmed.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");

  return { isValid: true, sanitized };
}

/**
 * Strict Facebook domain validator.
 * Validates that any domain or URL strictly targets legitimate Facebook endpoints.
 */
export function validateFacebookDomain(domainOrUrl: string): boolean {
  if (!domainOrUrl || typeof domainOrUrl !== "string") return false;

  let hostname = domainOrUrl.trim().toLowerCase();

  // If a full URL is passed, extract hostname
  if (hostname.includes("://")) {
    try {
      const parsed = new URL(hostname);
      hostname = parsed.hostname.toLowerCase();
    } catch {
      return false;
    }
  }

  // Strip port if present
  hostname = hostname.split(":")[0];

  const allowedDomains = [
    "facebook.com",
    "www.facebook.com",
    "m.facebook.com",
    "web.facebook.com",
    "touch.facebook.com",
    "mbasic.facebook.com",
    "fb.watch",
    "www.fb.watch",
    "fb.me",
    "www.fb.me",
    "graph.facebook.com",
  ];

  if (allowedDomains.includes(hostname)) {
    return true;
  }

  // Subdomain matching
  if (
    hostname.endsWith(".facebook.com") ||
    hostname.endsWith(".fb.watch") ||
    hostname.endsWith(".fb.me")
  ) {
    // Reject suspicious prefixes like fake-facebook.com or evil.facebook.com.attacker.com
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      const topDomain = parts.slice(-2).join(".");
      return topDomain === "facebook.com" || topDomain === "fb.watch" || topDomain === "fb.me";
    }
  }

  return false;
}

// -------------------------------------------------------------
// In-Memory Sliding-Window Per-User Rate Limiting
// -------------------------------------------------------------

interface RateLimitBucket {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitBucket>();

/**
 * Enforces per-user search rate limits.
 * Default: 10 requests per minute per user or IP.
 */
export function checkUserRateLimit(
  userIdOrIp: string,
  maxRequestsPerMinute = 10,
  windowMs = 60000
): {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
} {
  const key = userIdOrIp || "anonymous";
  const now = Date.now();
  const windowStart = now - windowMs;

  let bucket = rateLimitStore.get(key);
  if (!bucket) {
    bucket = { timestamps: [] };
    rateLimitStore.set(key, bucket);
  }

  // Filter timestamps outside current rolling window
  bucket.timestamps = bucket.timestamps.filter((ts) => ts > windowStart);

  if (bucket.timestamps.length >= maxRequestsPerMinute) {
    const oldestTimestamp = bucket.timestamps[0];
    const resetInMs = Math.max(0, oldestTimestamp + windowMs - now);

    return {
      allowed: false,
      remaining: 0,
      resetInMs,
    };
  }

  // Record this request
  bucket.timestamps.push(now);

  return {
    allowed: true,
    remaining: maxRequestsPerMinute - bucket.timestamps.length,
    resetInMs: windowMs,
  };
}

/**
 * Resets the in-memory rate limit bucket for testing purposes.
 */
export function resetRateLimitStore(): void {
  rateLimitStore.clear();
}
