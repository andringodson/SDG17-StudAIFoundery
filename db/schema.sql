-- =============================================================================
-- SDG 17 Global Partnership Platform — schema
-- Target: Neon (recommended — serverless Postgres, pools connections, scales
-- to zero) or any Postgres 14+, Supabase included. Run this once against a
-- fresh database with `npm run db:migrate` (DATABASE_URL set), or paste it
-- into your provider's SQL console.
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
    -- Role-based access. 'government' registers agencies/departments the same
    -- self-declared way 'company' and 'investor' already do — nothing here
    -- verifies a government profile is a real authority, exactly as nothing
    -- verifies a company profile is a real company.
    role VARCHAR(20) NOT NULL DEFAULT 'general_user'
        CHECK (role IN ('company', 'investor', 'government', 'general_user', 'admin', 'compliance_admin')),
    full_name VARCHAR(120),
    profile_completed_pct INT NOT NULL DEFAULT 0,
    -- Bumping this invalidates every JWT issued before the bump — the
    -- mechanism behind "log out of all devices" without a session table.
    session_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- CREATE TABLE IF NOT EXISTS above is a no-op against a database that
-- already has a users table — which every real deployment of this project
-- does — so the 'government' value in that CHECK never actually reaches an
-- existing database without this. Named explicitly so re-running this block
-- (safe, and it always does) finds and replaces exactly its own constraint.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_role_check') THEN
        ALTER TABLE users DROP CONSTRAINT users_role_check;
    END IF;
    ALTER TABLE users ADD CONSTRAINT users_role_check
        CHECK (role IN ('company', 'investor', 'government', 'general_user', 'admin', 'compliance_admin'));
END $$;

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

CREATE TABLE IF NOT EXISTS government_profiles (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    agency_name VARCHAR(160) NOT NULL,
    department VARCHAR(120),
    jurisdiction_level VARCHAR(40) NOT NULL DEFAULT 'National'
        CHECK (jurisdiction_level IN ('Local', 'Regional', 'National', 'International')),
    country VARCHAR(80) NOT NULL,
    focus_area VARCHAR(80) NOT NULL,
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
    contact_phone VARCHAR(20),
    contact_consent BOOLEAN NOT NULL DEFAULT FALSE,
    status VARCHAR(24) NOT NULL DEFAULT 'received'
        CHECK (status IN ('received', 'in_review', 'resolved', 'closed')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- -----------------------------------------------------------------------------
-- 7. OAuth account links
-- One row per (provider, external account) a user has connected. A user row
-- is created here on first Google/Facebook sign-in if no matching email
-- already exists; if one does, the provider account links to it instead of
-- creating a duplicate. Nothing in this table works until GOOGLE_CLIENT_ID /
-- FACEBOOK_CLIENT_ID (+ secrets) are set — see src/lib/oauth.ts.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(20) NOT NULL CHECK (provider IN ('google', 'facebook')),
    provider_account_id VARCHAR(120) NOT NULL,
    email VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (provider, provider_account_id)
);

-- -----------------------------------------------------------------------------
-- 8. Assistant knowledge base (admin-managed)
-- The assistant's hardcoded knowledge (src/lib/assistant/knowledge.ts) stays
-- as a fallback that always works with no database; these rows let an admin
-- add or correct answers without a code deploy. Matched the same way: total
-- keyword-length score, highest wins.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS assistant_faqs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    keywords TEXT[] NOT NULL,
    response TEXT NOT NULL,
    action_label VARCHAR(80),
    action_href VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_assistant_faqs_active ON assistant_faqs (is_active);

-- -----------------------------------------------------------------------------
-- 9. Real-time partner connect
-- Direct messaging between any two signed-in accounts (business, government,
-- investor, or explorer) — this is what the role-selection page's "Communicate
-- with Investors/Companies" bullets actually refer to, and what the
-- dashboards previously listed as "coming soon." One row per unordered pair
-- of users; user_a is always the lexicographically smaller UUID so a pair
-- can only ever create one thread regardless of who messages whom first.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_a UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    last_read_at_a TIMESTAMPTZ,
    last_read_at_b TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (user_a < user_b),
    UNIQUE (user_a, user_b)
);

CREATE INDEX IF NOT EXISTS idx_connections_user_a ON connections (user_a);
CREATE INDEX IF NOT EXISTS idx_connections_user_b ON connections (user_b);

CREATE TABLE IF NOT EXISTS connection_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    connection_id UUID NOT NULL REFERENCES connections(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_connection_messages_thread ON connection_messages (connection_id, created_at);

-- -----------------------------------------------------------------------------
-- Row-Level Security
-- The app talks to Postgres with one connection string from API routes only
-- (never from the browser) — that connecting role is the actual primary
-- access control (enforced again at the app layer via requireRole /
-- requireApiRole). RLS here is defense-in-depth, not the primary gate.
--
-- This runs against plain Postgres (Neon, RDS, self-hosted) as well as
-- Supabase, and those don't have the same built-in roles: Supabase provisions
-- `service_role` / `anon` / `authenticated` via its auth extension; a vanilla
-- Postgres database has none of them. Every policy below is created only if
-- its target role actually exists, so this file applies cleanly on both —
-- on a database with none of those roles, RLS is simply enabled with no
-- policies, which is a safe default-deny for every role except the table
-- owner (the one this app actually connects as).
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
ALTER TABLE oauth_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE assistant_faqs ENABLE ROW LEVEL SECURITY;
ALTER TABLE government_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE connection_messages ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    tbl TEXT;
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
        FOREACH tbl IN ARRAY ARRAY[
            'users', 'user_progress', 'pledges', 'audience_votes', 'telegram_link_tokens',
            'company_profiles', 'investor_profiles', 'password_reset_tokens', 'ai_audit_log',
            'ai_reminders', 'support_tickets', 'oauth_accounts', 'assistant_faqs',
            'government_profiles', 'connections', 'connection_messages'
        ]
        LOOP
            IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'service_role_all_' || tbl AND tablename = tbl) THEN
                EXECUTE format('CREATE POLICY %I ON %I FOR ALL TO service_role USING (true) WITH CHECK (true)', 'service_role_all_' || tbl, tbl);
            END IF;
        END LOOP;
    END IF;
END $$;

-- Public, read-only pledge wall for anon/authenticated roles — only meaningful
-- if the database is ever queried directly (e.g. Supabase's PostgREST)
-- instead of exclusively through this app's API, and only created where
-- those roles exist.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
       AND EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
       AND NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'public_read_pledges') THEN
        CREATE POLICY public_read_pledges ON pledges FOR SELECT TO anon, authenticated USING (true);
    END IF;
END $$;
