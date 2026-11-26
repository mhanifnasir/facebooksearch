import * as z from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  rememberMe: z.boolean().default(false),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  organization: z.string().min(2, "Organization name is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  agreeTerms: z.boolean().refine((val) => val === true, {
    message: "You must agree to the Terms of Service",
  }),
});

export type ContentType = 'post' | 'video' | 'reel' | 'page_update' | 'page' | 'unknown' | 'general';

export type DataAccessStatus = 'public' | 'verified' | 'restricted' | 'archived';

export type ProviderId = 'meta_graph' | 'apify' | 'rapidapi' | 'crawlbase' | 'custom_crawler' | 'tavily' | 'brave';

export interface FacebookPost {
  id: string;
  title: string;
  snippet: string;
  fullText: string;
  pageName: string;
  pageId: string;
  pageAvatar: string;
  pageVerified: boolean;
  pageFollowers: number;
  facebookUrl: string;
  originalUrl?: string;
  provider: ProviderId;
  providers?: string[];
  providerName: string;
  publishedAt: string;
  discoveredAt: string;
  contentType: ContentType;
  dataAccessStatus: DataAccessStatus;
  commentCount: number;
  reactionsCount: number;
  sharesCount: number;
  videoDuration?: string;
  videoThumbnail?: string;
  mediaUrls?: string[];
  tags: string[];
  rawPayload?: Record<string, unknown>;
}

export interface FacebookPage {
  id: string;
  name: string;
  username: string;
  url: string;
  avatarUrl: string;
  category: string;
  followersCount: number;
  likesCount: number;
  verified: boolean;
  about: string;
  website?: string;
  phone?: string;
  email?: string;
  postsDiscovered: number;
  lastActive: string;
  rating?: number;
}

export interface FacebookVideo {
  id: string;
  title: string;
  description: string;
  pageName: string;
  pageAvatar: string;
  pageVerified: boolean;
  facebookUrl: string;
  duration: string;
  viewsCount: number;
  commentCount: number;
  reactionsCount: number;
  publishedAt: string;
  thumbnailUrl: string;
  provider: ProviderId;
  videoResolution: string;
}

export interface FacebookComment {
  id: string;
  postId: string;
  postTitle: string;
  authorName: string;
  authorAvatar: string;
  text: string;
  publishedAt: string;
  likesCount: number;
  repliesCount: number;
  sentiment: 'positive' | 'neutral' | 'negative';
  isTopComment?: boolean;
}

export interface SearchFilters {
  keyword: string;
  exactPhrase: boolean;
  contentTypes: ContentType[];
  requireComments: boolean;
  dateRange: 'all' | '24h' | '7d' | '30d' | 'custom';
  customStartDate?: string;
  customEndDate?: string;
  provider: ProviderId | 'all';
  sortBy: 'relevance' | 'date_desc' | 'comments_desc' | 'reactions_desc';
}

export interface SearchHistoryItem {
  id: string;
  query: string;
  exactPhrase: boolean;
  filtersSummary: string;
  resultsCount: number;
  executedAt: string;
  provider: string;
  executionTimeMs: number;
  status: 'completed' | 'partial' | 'cached';
}

export interface SavedSearchItem {
  id: string;
  name: string;
  query: string;
  filtersSummary: string;
  lastResultsCount: number;
  alertFrequency: 'daily' | 'weekly' | 'realtime' | 'disabled';
  notifyEmail: boolean;
  createdAt: string;
  lastRunAt: string;
}

export interface ApiProvider {
  id: ProviderId;
  name: string;
  status: 'operational' | 'degraded' | 'maintenance' | 'offline';
  latencyMs: number;
  monthlyQuota: number;
  usedQuota: number;
  successRate: number;
  description: string;
  documentationUrl: string;
  isConfigured: boolean;
  rateLimitPerMin: number;
  supportsComments: boolean;
  supportsVideos: boolean;
}

export interface DashboardStats {
  totalSearches: number;
  searchesChange: number;
  totalResults: number;
  resultsChange: number;
  facebookPages: number;
  pagesChange: number;
  videosFound: number;
  videosChange: number;
  availableComments: number;
  commentsChange: number;
  apiUsagePercent: number;
  apiUsageCalls: number;
  apiUsageLimit: number;
}

export interface ActivityDataPoint {
  date: string;
  searches: number;
  postsDiscovered: number;
  commentsParsed: number;
}
