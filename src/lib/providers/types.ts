export type ProviderName = "tavily" | "brave" | "meta_graph";

export type NormalizedContentType =
  | "post"
  | "video"
  | "reel"
  | "page"
  | "comment"
  | "general"
  | "unknown";

export type DataAccessStatus =
  | "public"
  | "verified"
  | "restricted"
  | "archived";

export type SearchStatus =
  | "pending"
  | "processing"
  | "completed"
  | "partial"
  | "failed";

export type JobStatus =
  | "pending"
  | "processing"
  | "completed"
  | "failed";

export interface ProviderProvenance {
  provider: ProviderName;
  score?: number;
  originalUrl?: string;
  foundAt?: string;
}

export interface NormalizedSearchResult {
  id: string;
  title: string;
  snippet: string;
  fullText?: string;
  url: string;
  originalUrl?: string;
  normalizedUrl?: string;
  canonicalPostId?: string;
  pageName: string;
  pageUsername?: string;
  pageAvatar?: string;
  pageVerified?: boolean;
  publishedAt?: string;
  contentType: NormalizedContentType;
  provider: ProviderName;
  providers?: ProviderName[];
  provenance?: ProviderProvenance[];
  providerName: string;
  score?: number;
  commentCount?: number;
  reactionsCount?: number;
  sharesCount?: number;
  videoDuration?: string;
  videoThumbnail?: string;
  dataAccessStatus: DataAccessStatus;
  raw?: Record<string, unknown>;
}

export interface ProviderSearchOptions {
  query: string;
  exactPhrase?: boolean;
  targetType?: "all" | "post" | "page" | "video" | "unknown";
  requireComments?: boolean;
  dateRange?: "all" | "24h" | "7d" | "30d" | "custom";
  startDate?: string;
  endDate?: string;
  limit?: number;
  timeoutMs?: number;
  searchDepth?: "basic" | "advanced";
  includeRawContent?: boolean;
}

export interface NormalizedSearchResponse {
  provider: ProviderName;
  providerName: string;
  results: NormalizedSearchResult[];
  totalFound: number;
  executionTimeMs: number;
  quotaCost: number;
  error?: string;
  isFallback?: boolean;
}

export interface SearchProvider {
  name: ProviderName;
  displayName: string;
  isConfigured(): boolean;
  search(options: ProviderSearchOptions): Promise<NormalizedSearchResponse>;
}

export interface ProviderJobSummary {
  id?: string;
  searchId?: string;
  provider: ProviderName;
  status: JobStatus;
  totalFound: number;
  errorMessage?: string | null;
  startedAt?: string;
  completedAt?: string | null;
}

export interface MetaCommentItem {
  id: string;
  postId: string;
  postTitle?: string;
  text: string;
  authorName: string;
  authorId?: string;
  authorAvatar?: string;
  publishedAt: string;
  likesCount: number;
  repliesCount?: number;
}

export interface MetaCommentsResponse {
  comments: MetaCommentItem[];
  totalCount?: number;
  hasMore: boolean;
  nextCursor?: string;
  error?: string;
  isTokenExpired?: boolean;
  isRestricted?: boolean;
}
