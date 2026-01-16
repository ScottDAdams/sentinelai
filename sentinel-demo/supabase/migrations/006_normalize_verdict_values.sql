-- Normalize Sentinel run verdicts to canonical set
-- Canonical values: ALLOWED, REDACTED, HELD_FOR_REVIEW, BLOCKED

-- Step 1: Backfill existing data
UPDATE runs
SET verdict = 'ALLOWED'
WHERE verdict = 'SHIPPABLE';

UPDATE runs
SET verdict = 'HELD_FOR_REVIEW'
WHERE verdict = 'REVIEW' OR verdict ILIKE '%HELD%REVIEW%' OR verdict ILIKE '%REVIEW%';

-- Step 2: Drop old constraint
-- Find and drop any existing CHECK constraint on verdict column
DO $$
DECLARE
    constraint_name text;
BEGIN
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'runs'::regclass
    AND contype = 'c'
    AND conname LIKE '%verdict%'
    LIMIT 1;
    
    IF constraint_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE runs DROP CONSTRAINT IF EXISTS %I', constraint_name);
    END IF;
END $$;

-- Step 3: Add new constraint with canonical values
ALTER TABLE runs
ADD CONSTRAINT runs_verdict_check
CHECK (verdict IN ('ALLOWED', 'REDACTED', 'HELD_FOR_REVIEW', 'BLOCKED'));

-- Step 4: Verify no rows violate the constraint
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM runs
    WHERE verdict NOT IN ('ALLOWED', 'REDACTED', 'HELD_FOR_REVIEW', 'BLOCKED');
    
    IF invalid_count > 0 THEN
        RAISE EXCEPTION 'Migration failed: % rows have invalid verdict values', invalid_count;
    END IF;
END $$;
