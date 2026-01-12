-- Add Sensitivity Label Guard policy for copilot input type
-- This policy triggers REVIEW when sensitivity_label contains "Confidential" 
-- OR compliance_flags includes "financial_data" or "executive_discussion"

INSERT INTO policies (id, name, scope, status, version, conditions, action, updated_at, updated_by) 
VALUES (
  'sensitivity-label-guard',
  'Sensitivity Label Guard',
  ARRAY['copilot'],
  'ENABLED',
  1,
  '{
    "sensitivity_label_contains": ["Confidential"],
    "compliance_flags_include": ["financial_data", "executive_discussion"]
  }'::jsonb,
  'REVIEW',
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
