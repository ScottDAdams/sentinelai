-- Backfill actor and source metadata for existing runs
-- Ensures all runs have consistent actor/source context for investigation

UPDATE runs
SET meta = jsonb_set(
    jsonb_set(
        COALESCE(meta, '{}'::jsonb),
        '{actor}',
        '{"id": "u_demo_001", "display": "Demo User", "role": "Employee", "dept": "N/A"}'::jsonb
    ),
    '{source}',
    jsonb_build_object(
        'surface', input_type,
        'platform', CASE 
            WHEN input_type = 'copilot' THEN 'Microsoft 365 Copilot'
            ELSE 'Sentinel Demo UI'
        END
    )
)
WHERE meta->'actor' IS NULL OR meta->'actor' = 'null'::jsonb;

-- Verify backfill
DO $$
DECLARE
    missing_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO missing_count
    FROM runs
    WHERE meta->'actor' IS NULL OR meta->'actor' = 'null'::jsonb;
    
    IF missing_count > 0 THEN
        RAISE WARNING 'Backfill incomplete: % runs still missing actor metadata', missing_count;
    END IF;
END $$;
