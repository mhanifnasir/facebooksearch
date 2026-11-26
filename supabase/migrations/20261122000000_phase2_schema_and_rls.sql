-- ==============================================================================
-- Facebook Public Content Search: Schema & Row Level Security (Phase 2)
-- ==============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    organization TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'analyst',
    timezone TEXT DEFAULT 'America/New_York (UTC-5)',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update updated_at on profiles
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_profiles_updated_at ON public.profiles;
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

-- Trigger to auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, full_name, organization, avatar_url, role)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'organization', 'Independent Analyst'),
        COALESCE(NEW.raw_user_meta_data->>'avatar_url', ''),
        'analyst'
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. FACEBOOK_PAGES TABLE (Public Cache / Directory)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facebook_pages (
    id TEXT PRIMARY KEY, -- Facebook Page ID or normalized slug
    name TEXT NOT NULL,
    username TEXT,
    url TEXT NOT NULL,
    avatar_url TEXT,
    category TEXT,
    followers_count BIGINT DEFAULT 0,
    likes_count BIGINT DEFAULT 0,
    verified BOOLEAN DEFAULT FALSE,
    about TEXT,
    website TEXT,
    rating NUMERIC(2,1) DEFAULT 4.5,
    posts_discovered INTEGER DEFAULT 0,
    last_active TEXT DEFAULT 'Recently',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facebook_pages_name ON public.facebook_pages(name);
CREATE INDEX IF NOT EXISTS idx_facebook_pages_category ON public.facebook_pages(category);

-- ------------------------------------------------------------------------------
-- 3. FACEBOOK_POSTS TABLE (Discovered Public Posts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facebook_posts (
    id TEXT PRIMARY KEY, -- Facebook Post ID
    page_id TEXT REFERENCES public.facebook_pages(id) ON DELETE SET NULL,
    page_name TEXT NOT NULL,
    page_avatar TEXT,
    page_verified BOOLEAN DEFAULT FALSE,
    page_followers BIGINT DEFAULT 0,
    title TEXT NOT NULL,
    snippet TEXT NOT NULL,
    full_text TEXT,
    facebook_url TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_name TEXT NOT NULL,
    content_type TEXT NOT NULL DEFAULT 'post', -- post, video, reel, page_update
    data_access_status TEXT NOT NULL DEFAULT 'public', -- public, verified, restricted, archived
    comment_count INTEGER DEFAULT 0,
    reactions_count INTEGER DEFAULT 0,
    shares_count INTEGER DEFAULT 0,
    video_duration TEXT,
    video_thumbnail TEXT,
    media_urls TEXT[] DEFAULT '{}',
    tags TEXT[] DEFAULT '{}',
    raw_payload JSONB DEFAULT '{}'::jsonb,
    published_at TIMESTAMPTZ NOT NULL,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facebook_posts_page_id ON public.facebook_posts(page_id);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_content_type ON public.facebook_posts(content_type);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_published_at ON public.facebook_posts(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_facebook_posts_comment_count ON public.facebook_posts(comment_count DESC);

-- ------------------------------------------------------------------------------
-- 4. FACEBOOK_COMMENTS TABLE (Extracted Public Comments)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.facebook_comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL REFERENCES public.facebook_posts(id) ON DELETE CASCADE,
    post_title TEXT,
    author_name TEXT NOT NULL,
    author_avatar TEXT,
    text TEXT NOT NULL,
    published_at TIMESTAMPTZ NOT NULL,
    likes_count INTEGER DEFAULT 0,
    replies_count INTEGER DEFAULT 0,
    sentiment TEXT NOT NULL DEFAULT 'neutral', -- positive, neutral, negative
    is_top_comment BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_facebook_comments_post_id ON public.facebook_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_facebook_comments_sentiment ON public.facebook_comments(sentiment);

-- ------------------------------------------------------------------------------
-- 5. SEARCHES TABLE (User Search History)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    exact_phrase BOOLEAN DEFAULT FALSE,
    filters_summary TEXT,
    content_types TEXT[] DEFAULT ARRAY['post', 'page', 'video'],
    require_comments BOOLEAN DEFAULT FALSE,
    date_range TEXT DEFAULT 'all',
    provider TEXT DEFAULT 'all',
    results_count INTEGER DEFAULT 0,
    execution_time_ms INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'completed', -- completed, partial, cached, failed
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_searches_user_id ON public.searches(user_id);
CREATE INDEX IF NOT EXISTS idx_searches_executed_at ON public.searches(executed_at DESC);

-- ------------------------------------------------------------------------------
-- 6. SEARCH_JOBS TABLE (Multi-Provider Background Extraction Jobs)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    search_id UUID REFERENCES public.searches(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, cancelled
    total_found INTEGER DEFAULT 0,
    error_message TEXT,
    started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_search_jobs_user_id ON public.search_jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_search_jobs_search_id ON public.search_jobs(search_id);

-- ------------------------------------------------------------------------------
-- 7. SEARCH_RESULTS TABLE (User Search to Post Link / Audit Mapping)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    search_id UUID NOT NULL REFERENCES public.searches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    post_id TEXT NOT NULL REFERENCES public.facebook_posts(id) ON DELETE CASCADE,
    relevance_score NUMERIC(5,2) DEFAULT 1.0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT unique_search_post UNIQUE(search_id, post_id)
);

CREATE INDEX IF NOT EXISTS idx_search_results_user_id ON public.search_results(user_id);
CREATE INDEX IF NOT EXISTS idx_search_results_search_id ON public.search_results(search_id);

-- ------------------------------------------------------------------------------
-- 8. SAVED_SEARCHES TABLE (Monitored Queries & Alerts)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.saved_searches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    query TEXT NOT NULL,
    exact_phrase BOOLEAN DEFAULT FALSE,
    filters_summary TEXT,
    alert_frequency TEXT NOT NULL DEFAULT 'daily', -- realtime, daily, weekly, disabled
    notify_email BOOLEAN DEFAULT TRUE,
    last_results_count INTEGER DEFAULT 0,
    last_run_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_saved_searches_user_id ON public.saved_searches(user_id);

-- ------------------------------------------------------------------------------
-- 9. PROVIDER_USAGE TABLE (API Metrics & Rate Limits Audit)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.provider_usage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    provider TEXT NOT NULL,
    endpoint TEXT NOT NULL,
    status_code INTEGER DEFAULT 200,
    latency_ms INTEGER NOT NULL,
    quota_cost INTEGER DEFAULT 1,
    success BOOLEAN DEFAULT TRUE,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_provider_usage_user_id ON public.provider_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_provider_usage_provider ON public.provider_usage(provider);
CREATE INDEX IF NOT EXISTS idx_provider_usage_created_at ON public.provider_usage(created_at DESC);


-- ==============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- 1. PROFILES RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. SEARCHES RLS (Strict User Isolation)
ALTER TABLE public.searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own searches"
    ON public.searches FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own searches"
    ON public.searches FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own searches"
    ON public.searches FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own searches"
    ON public.searches FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 3. SEARCH_JOBS RLS
ALTER TABLE public.search_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search jobs"
    ON public.search_jobs FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search jobs"
    ON public.search_jobs FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own search jobs"
    ON public.search_jobs FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- 4. SEARCH_RESULTS RLS
ALTER TABLE public.search_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own search results"
    ON public.search_results FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own search results"
    ON public.search_results FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own search results"
    ON public.search_results FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 5. SAVED_SEARCHES RLS (Strict User Isolation)
ALTER TABLE public.saved_searches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own saved searches"
    ON public.saved_searches FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own saved searches"
    ON public.saved_searches FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own saved searches"
    ON public.saved_searches FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own saved searches"
    ON public.saved_searches FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- 6. FACEBOOK_PAGES RLS (Public read for authenticated users)
ALTER TABLE public.facebook_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view facebook pages"
    ON public.facebook_pages FOR SELECT
    TO authenticated
    USING (true);

-- 7. FACEBOOK_POSTS RLS (Public read for authenticated users)
ALTER TABLE public.facebook_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view facebook posts"
    ON public.facebook_posts FOR SELECT
    TO authenticated
    USING (true);

-- 8. FACEBOOK_COMMENTS RLS (Public read for authenticated users)
ALTER TABLE public.facebook_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view facebook comments"
    ON public.facebook_comments FOR SELECT
    TO authenticated
    USING (true);

-- 9. PROVIDER_USAGE RLS (Users view own logs, service role manages all)
ALTER TABLE public.provider_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own provider usage"
    ON public.provider_usage FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own provider usage"
    ON public.provider_usage FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
