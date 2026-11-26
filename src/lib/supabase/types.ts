export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          organization: string | null;
          avatar_url: string | null;
          role: string;
          timezone: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          organization?: string | null;
          avatar_url?: string | null;
          role?: string;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          organization?: string | null;
          avatar_url?: string | null;
          role?: string;
          timezone?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      facebook_pages: {
        Row: {
          id: string;
          name: string;
          username: string | null;
          url: string;
          avatar_url: string | null;
          category: string | null;
          followers_count: number;
          likes_count: number;
          verified: boolean;
          about: string | null;
          website: string | null;
          rating: number | null;
          posts_discovered: number;
          last_active: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          username?: string | null;
          url: string;
          avatar_url?: string | null;
          category?: string | null;
          followers_count?: number;
          likes_count?: number;
          verified?: boolean;
          about?: string | null;
          website?: string | null;
          rating?: number | null;
          posts_discovered?: number;
          last_active?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          username?: string | null;
          url?: string;
          avatar_url?: string | null;
          category?: string | null;
          followers_count?: number;
          likes_count?: number;
          verified?: boolean;
          about?: string | null;
          website?: string | null;
          rating?: number | null;
          posts_discovered?: number;
          last_active?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      facebook_posts: {
        Row: {
          id: string;
          page_id: string | null;
          page_name: string;
          page_avatar: string | null;
          page_verified: boolean;
          page_followers: number;
          title: string;
          snippet: string;
          full_text: string | null;
          facebook_url: string;
          provider: string;
          provider_name: string;
          content_type: string;
          data_access_status: string;
          comment_count: number;
          reactions_count: number;
          shares_count: number;
          video_duration: string | null;
          video_thumbnail: string | null;
          media_urls: string[];
          tags: string[];
          raw_payload: Json;
          published_at: string;
          discovered_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          page_id?: string | null;
          page_name: string;
          page_avatar?: string | null;
          page_verified?: boolean;
          page_followers?: number;
          title: string;
          snippet: string;
          full_text?: string | null;
          facebook_url: string;
          provider: string;
          provider_name: string;
          content_type?: string;
          data_access_status?: string;
          comment_count?: number;
          reactions_count?: number;
          shares_count?: number;
          video_duration?: string | null;
          video_thumbnail?: string | null;
          media_urls?: string[];
          tags?: string[];
          raw_payload?: Json;
          published_at: string;
          discovered_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          page_id?: string | null;
          page_name?: string;
          page_avatar?: string | null;
          page_verified?: boolean;
          page_followers?: number;
          title?: string;
          snippet?: string;
          full_text?: string | null;
          facebook_url?: string;
          provider?: string;
          provider_name?: string;
          content_type?: string;
          data_access_status?: string;
          comment_count?: number;
          reactions_count?: number;
          shares_count?: number;
          video_duration?: string | null;
          video_thumbnail?: string | null;
          media_urls?: string[];
          tags?: string[];
          raw_payload?: Json;
          published_at?: string;
          discovered_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      facebook_comments: {
        Row: {
          id: string;
          post_id: string;
          post_title: string | null;
          author_name: string;
          author_avatar: string | null;
          text: string;
          published_at: string;
          likes_count: number;
          replies_count: number;
          sentiment: string;
          is_top_comment: boolean;
          created_at: string;
        };
        Insert: {
          id: string;
          post_id: string;
          post_title?: string | null;
          author_name: string;
          author_avatar?: string | null;
          text: string;
          published_at: string;
          likes_count?: number;
          replies_count?: number;
          sentiment?: string;
          is_top_comment?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          post_title?: string | null;
          author_name?: string;
          author_avatar?: string | null;
          text?: string;
          published_at?: string;
          likes_count?: number;
          replies_count?: number;
          sentiment?: string;
          is_top_comment?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      searches: {
        Row: {
          id: string;
          user_id: string;
          query: string;
          exact_phrase: boolean;
          filters_summary: string | null;
          content_types: string[];
          require_comments: boolean;
          date_range: string;
          provider: string;
          results_count: number;
          execution_time_ms: number;
          status: string;
          executed_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          query: string;
          exact_phrase?: boolean;
          filters_summary?: string | null;
          content_types?: string[];
          require_comments?: boolean;
          date_range?: string;
          provider?: string;
          results_count?: number;
          execution_time_ms?: number;
          status?: string;
          executed_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          query?: string;
          exact_phrase?: boolean;
          filters_summary?: string | null;
          content_types?: string[];
          require_comments?: boolean;
          date_range?: string;
          provider?: string;
          results_count?: number;
          execution_time_ms?: number;
          status?: string;
          executed_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      search_jobs: {
        Row: {
          id: string;
          user_id: string;
          search_id: string | null;
          provider: string;
          status: string;
          total_found: number;
          error_message: string | null;
          started_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          search_id?: string | null;
          provider: string;
          status?: string;
          total_found?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          search_id?: string | null;
          provider?: string;
          status?: string;
          total_found?: number;
          error_message?: string | null;
          started_at?: string;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      search_results: {
        Row: {
          id: string;
          search_id: string;
          user_id: string;
          post_id: string;
          relevance_score: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          search_id: string;
          user_id: string;
          post_id: string;
          relevance_score?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          search_id?: string;
          user_id?: string;
          post_id?: string;
          relevance_score?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      saved_searches: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          query: string;
          exact_phrase: boolean;
          filters_summary: string | null;
          alert_frequency: string;
          notify_email: boolean;
          last_results_count: number;
          last_run_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          query: string;
          exact_phrase?: boolean;
          filters_summary?: string | null;
          alert_frequency?: string;
          notify_email?: boolean;
          last_results_count?: number;
          last_run_at?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          query?: string;
          exact_phrase?: boolean;
          filters_summary?: string | null;
          alert_frequency?: string;
          notify_email?: boolean;
          last_results_count?: number;
          last_run_at?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      provider_usage: {
        Row: {
          id: string;
          user_id: string | null;
          provider: string;
          endpoint: string;
          status_code: number;
          latency_ms: number;
          quota_cost: number;
          success: boolean;
          error_message: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id?: string | null;
          provider: string;
          endpoint: string;
          status_code?: number;
          latency_ms: number;
          quota_cost?: number;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string | null;
          provider?: string;
          endpoint?: string;
          status_code?: number;
          latency_ms?: number;
          quota_cost?: number;
          success?: boolean;
          error_message?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
