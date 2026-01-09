-- Update policy patterns to include email, phone, Stripe keys, and AWS keys

-- Update Sensitive Data Policy to include email and phone regex patterns
UPDATE policies
SET 
  conditions = '{
    "keywords": ["SSN", "Social Security"],
    "patterns": [
      "\\b\\d{3}-\\d{2}-\\d{4}\\b",
      "\\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}\\b",
      "\\b(?:\\+?1[\\s.-]?)?(?:\\(\\d{3}\\)|\\d{3})[\\s.-]?\\d{3}[\\s.-]?\\d{4}\\b"
    ]
  }'::jsonb,
  version = version + 1,
  updated_at = now(),
  updated_by = 'demo_admin'
WHERE id = 'sensitive-data';

-- Update Secrets Detection Policy to include Stripe keys, AWS keys, and add chat scope
UPDATE policies
SET 
  scope = ARRAY['code', 'chat'],
  conditions = '{
    "patterns": [
      "\\bsk_(?:live|test)_[A-Za-z0-9]{16,}\\b",
      "\\bAKIA[0-9A-Z]{16}\\b",
      "\\bAWS_ACCESS_KEY_ID\\s*[:=]\\s*[^\\s\\n]+\\b",
      "\\bAWS_SECRET_ACCESS_KEY\\s*[:=]\\s*[^\\s\\n]+\\b"
    ]
  }'::jsonb,
  version = version + 1,
  updated_at = now(),
  updated_by = 'demo_admin'
WHERE id = 'secrets-detection';
