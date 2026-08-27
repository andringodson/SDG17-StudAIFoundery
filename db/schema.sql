-- =============================================================================
-- SDG 17 Global Partnership Platform — schema
-- Target: Supabase / any Postgres 14+. Run this once against a fresh database
-- (Supabase SQL Editor, or `npm run db:migrate` with DATABASE_URL set).
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto"; -- gen_random_uuid()

-- -----------------------------------------------------------------------------
-- 1. Users & authentication
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    is_email_verified BOOLEAN NOT NULL DEFAULT FALSE,
    is_phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
    otp_code VARCHAR(6),
    otp_expires_at TIMESTAMPTZ,
    -- Role-based access. 'admin' / 'compliance_admin' exist as a destination
    -- for future use but nothing provisions them yet — there is no admin
    -- console in this build, so these roles have no extra privileges wired up.
    role VARCHAR(20) NOT NULL DEFAULT 'general_user'
        CHECK (role IN ('company', 'investor', 'general_user', 'admin', 'compliance_admin')),
    full_name VARCHAR(120),
    profile_completed_pct INT NOT NULL DEFAULT 0,
    -- Bumping this invalidates every JWT issued before the bump — the
    -- mechanism behind "log out of all devices" without a session table.
    session_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

-- -----------------------------------------------------------------------------
-- 2. Telegram deep-link tokens
-- Short-lived tokens issued by /api/auth/telegram/start and consumed by the
-- bot when the user taps the /start deep link, so the bot can identify which
-- web session requested the link.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS telegram_link_tokens (
    token VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 3. Per-user platform progress
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_progress (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    finance_budget_inr NUMERIC(15, 2) NOT NULL DEFAULT 10000000.00, -- ₹1 Crore default
    gamification_points INT NOT NULL DEFAULT 0,
    earned_badges JSONB NOT NULL DEFAULT '[]'::jsonb,
    active_partnerships JSONB NOT NULL DEFAULT '[]'::jsonb,
    pledge_text TEXT,
    last_completed_step INT NOT NULL DEFAULT 1,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4. Public pledge wall
-- A separate append-only table from user_progress.pledge_text: the wall shows
-- every pledge ever made, not just each user's most recent one.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pledges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    display_name VARCHAR(60) NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'Other',
    pledge_text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pledges_created_at ON pledges (created_at DESC);

-- -----------------------------------------------------------------------------
-- 4b. Role-specific profiles
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    company_name VARCHAR(160) NOT NULL,
    website VARCHAR(255),
    industry VARCHAR(80),
    country VARCHAR(80),
    city VARCHAR(80),
    year_founded INT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS investor_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    investor_type VARCHAR(60) NOT NULL,
    organisation_name VARCHAR(160),
    country VARCHAR(80),
    preferred_sector VARCHAR(80),
    preferred_stage VARCHAR(60),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 4c. Password reset tokens
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS password_reset_tokens (
    token VARCHAR(64) PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -----------------------------------------------------------------------------
-- 5. Live audience poll votes
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audience_votes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pillar_id VARCHAR(50) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    voted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audience_votes_pillar ON audience_votes (pillar_id);

-- One live vote per user (re-voting updates their pick rather than stacking).
CREATE UNIQUE INDEX IF NOT EXISTS uq_audience_votes_user ON audience_votes (user_id)
    WHERE user_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 6. AI assistant audit log
-- Every tool call the assistant makes is recorded here, whether it succeeded,
-- was denied, or failed — this is the accountability trail required before
-- any "AI can act on the user's behalf" feature is trustworthy.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ai_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_role VARCHAR(20),
    tool_name VARCHAR(60) NOT NULL,
    permission_decision VARCHAR(20) NOT NULL CHECK (permission_decision IN ('allowed', 'denied')),
    confirmation_status VARCHAR(20) NOT NULL DEFAULT 'not_required'
        CHECK (confirmation_status IN ('not_required', 'pending', 'confirmed', 'cancelled')),
    result_status VARCHAR(20) NOT NULL CHECK (result_status IN ('success', 'error', 'denied')),
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_audit_log_user ON ai_audit_log (user_id, created_at DESC);

-- The one write-capable tool implemented in this build: a simple reminder.
-- Deliberately the least sensitive possible "action" tool — nothing is sent,
-- messaged, or paid as a result of the assistant acting alone.
CREATE TABLE IF NOT EXISTS ai_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    note TEXT NOT NULL,
    remind_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User-submitted support requests. Contact details are optional and only
-- stored when the requester explicitly opts in on the support form.
CREATE TABLE IF NOT EXISTS support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reference VARCHAR(24) UNIQUE NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    category VARCHAR(60) NOT NULL,
    description TEXT NOT NULL,
    current_page VARCHAR(255),
    contact_email VARCHAR(255),
    contact_consent BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(24) NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'in_review', 'resolved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- The app talks to Postgres with the service-role connection string from API
-- routes only (never from the browser), so RLS here is a defense-in-depth
-- backstop, not the primary access control. Policies allow the service role
-- full access and deny anon/authenticated roles by default.
-- -----------------------------------------------------------------------------
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE pledges ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_votes ENABLE ROW LEVEL SECURITY;
ALTER TABLE telegram_link_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE investor_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_reset_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_users') THEN
        CREATE POLICY service_role_all_users ON users FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_progress') THEN
        CREATE POLICY service_role_all_progress ON user_progress FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_pledges') THEN
        CREATE POLICY service_role_all_pledges ON pledges FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_votes') THEN
        CREATE POLICY service_role_all_votes ON audience_votes FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_tokens') THEN
        CREATE POLICY service_role_all_tokens ON telegram_link_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_company_profiles') THEN
        CREATE POLICY service_role_all_company_profiles ON company_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_investor_profiles') THEN
        CREATE POLICY service_role_all_investor_profiles ON investor_profiles FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_reset_tokens') THEN
        CREATE POLICY service_role_all_reset_tokens ON password_reset_tokens FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_ai_audit_log') THEN
        CREATE POLICY service_role_all_ai_audit_log ON ai_audit_log FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_ai_reminders') THEN
        CREATE POLICY service_role_all_ai_reminders ON ai_reminders FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_support_tickets') THEN
        CREATE POLICY service_role_all_support_tickets ON support_tickets FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Public, read-only pledge wall for anon/authenticated roles (if the app is
-- ever queried directly via Supabase's PostgREST instead of our API):
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_pledges') THEN
        CREATE POLICY public_read_pledges ON pledges FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;
