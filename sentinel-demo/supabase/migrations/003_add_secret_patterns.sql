-- Add additional secret detection patterns: JWT keys, generic secrets, database URLs, Sentry DSN

UPDATE policies
SET 
  conditions = jsonb_set(
    conditions,
    '{patterns}',
    (conditions->'patterns') || '[
      "\\bJWT_SIGNING_KEY\\s*[:=]\\s*[^\\s\\n]+\\b",
      "\\b[A-Z_]+_KEY\\s*[:=]\\s*[^\\s\\n]+\\b",
      "\\b[A-Z_]+_SECRET\\s*[:=]\\s*[^\\s\\n]+\\b",
      "\\b[A-Z_]+_TOKEN\\s*[:=]\\s*[^\\s\\n]+\\b",
      "\\bDATABASE_URL\\s*[:=]\\s*[^\\s\\n]+\\b",
      "postgres://[^\\s\\n]+",
      "postgresql://[^\\s\\n]+",
      "mysql://[^\\s\\n]+",
      "mysql2://[^\\s\\n]+",
      "mongodb://[^\\s\\n]+",
      "mongodb\\+srv://[^\\s\\n]+",
      "\\bSENTRY_DSN\\s*[:=]\\s*[^\\s\\n]+\\b"
    ]'::jsonb
  ),
  version = version + 1,
  updated_at = now(),
  updated_by = 'demo_admin'
WHERE id = 'secrets-detection';
