-- Sentinel Demo: Initial Schema
-- Run this in Supabase SQL Editor

-- 1. runs table
CREATE TABLE IF NOT EXISTS runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at timestamptz DEFAULT now(),
    input_type text NOT NULL CHECK (input_type IN ('chat', 'file', 'code')),
    input_preview text,
    input_content text NOT NULL,
    scenario_id text,
    verdict text NOT NULL CHECK (verdict IN ('SHIPPABLE', 'REDACTED', 'BLOCKED')),
    baseline_output text,
    governed_output text,
    user_message text,
    policy_pack_version text DEFAULT 'v1',
    meta jsonb DEFAULT '{}'::jsonb
);

-- 2. run_events table
CREATE TABLE IF NOT EXISTS run_events (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    run_id uuid NOT NULL REFERENCES runs(id) ON DELETE CASCADE,
    ts timestamptz DEFAULT now(),
    seq int NOT NULL,
    event_type text NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb
);

-- 3. policies table (read-only placeholder)
CREATE TABLE IF NOT EXISTS policies (
    id text PRIMARY KEY,
    name text NOT NULL,
    scope text[] NOT NULL,
    status text NOT NULL CHECK (status IN ('ENABLED', 'DISABLED')),
    version int NOT NULL DEFAULT 1,
    conditions jsonb DEFAULT '{}'::jsonb,
    action text NOT NULL,
    updated_at timestamptz DEFAULT now(),
    updated_by text DEFAULT 'demo_admin'
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_run_events_run_id_seq ON run_events(run_id, seq);
CREATE INDEX IF NOT EXISTS idx_runs_created_at ON runs(created_at DESC);

-- Seed policies
INSERT INTO policies (id, name, scope, status, version, conditions, action, updated_at, updated_by) VALUES
    ('pii_policy', 'Sensitive Data Policy', ARRAY['chat', 'file'], 'ENABLED', 1, '{"patterns": ["ssn", "phone", "email"]}'::jsonb, 'REDACT', now(), 'demo_admin'),
    ('secrets_policy', 'Secrets Policy', ARRAY['code', 'file'], 'ENABLED', 1, '{"patterns": ["api_key", "password", "secret"]}'::jsonb, 'REDACT', now(), 'demo_admin'),
    ('injection_policy', 'Prompt Injection Defense', ARRAY['chat'], 'ENABLED', 1, '{"patterns": ["ignore", "forget", "reveal"]}'::jsonb, 'BLOCK', now(), 'demo_admin'),
    ('confidential_policy', 'Confidential File Policy', ARRAY['file'], 'ENABLED', 1, '{"patterns": ["salary", "compensation", "ssn"]}'::jsonb, 'REDACT', now(), 'demo_admin')
ON CONFLICT (id) DO NOTHING;
