-- Update Governance Bypass policy (formerly "Prompt Injection Defense")
-- This policy blocks attempts to bypass safeguards or defeat governance controls

-- First, handle the case where the old 'injection_policy' ID exists - rename it to 'prompt-injection'
UPDATE policies
SET 
  id = 'prompt-injection',
  name = 'Governance Bypass Attempt',
  scope = ARRAY['chat'],
  status = 'ENABLED',
  version = version + 1,
  conditions = '{
    "phrases": [
      "bypass safeguards",
      "bypass safety",
      "ignore previous",
      "ignore instructions",
      "reveal system prompt",
      "reveal the system prompt",
      "unredacted",
      "internal policy",
      "override policy",
      "disable redaction",
      "defeat safeguards"
    ]
  }'::jsonb,
  action = 'BLOCK',
  updated_at = now(),
  updated_by = 'demo_admin'
WHERE id = 'injection_policy';

-- Now ensure the policy exists with the correct ID and updated values
-- This handles both the case where it was just renamed above, and the case where 'prompt-injection' already exists
INSERT INTO policies (id, name, scope, status, version, conditions, action, updated_at, updated_by) 
VALUES (
  'prompt-injection',
  'Governance Bypass Attempt',
  ARRAY['chat'],
  'ENABLED',
  5,
  '{
    "phrases": [
      "bypass safeguards",
      "bypass safety",
      "ignore previous",
      "ignore instructions",
      "reveal system prompt",
      "reveal the system prompt",
      "unredacted",
      "internal policy",
      "override policy",
      "disable redaction",
      "defeat safeguards"
    ]
  }'::jsonb,
  'BLOCK',
  now(),
  'demo_admin'
) ON CONFLICT (id) DO UPDATE
SET
  name = EXCLUDED.name,
  scope = EXCLUDED.scope,
  status = EXCLUDED.status,
  version = policies.version + 1,
  conditions = EXCLUDED.conditions,
  action = EXCLUDED.action,
  updated_at = now(),
  updated_by = EXCLUDED.updated_by;
