import * as z from "zod";

export const searchExecutionSchema = z.object({
  query: z
    .string()
    .min(1, "Search keyword is required")
    .max(200, "Search query exceeds maximum length of 200 characters")
    .transform((val) => val.trim()),
  exactPhrase: z.boolean().default(false),
  targetType: z.enum(["all", "post", "page", "video", "unknown"]).default("all"),
  contentTypes: z.array(z.string()).optional(),
  requireComments: z.boolean().default(false),
  dateRange: z.enum(["all", "24h", "7d", "30d", "custom"]).default("all"),
  provider: z.enum(["all", "tavily", "brave", "meta_graph"]).default("all"),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  timeoutMs: z.number().int().min(1000).max(30000).default(8000),
  searchDepth: z.enum(["basic", "advanced"]).default("basic"),
  includeRawContent: z.boolean().default(false),
  userId: z.string().uuid().optional(),
});

export type ValidatedSearchInput = z.infer<typeof searchExecutionSchema>;
