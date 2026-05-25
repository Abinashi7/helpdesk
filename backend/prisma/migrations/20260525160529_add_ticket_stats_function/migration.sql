CREATE OR REPLACE FUNCTION get_ticket_stats()
RETURNS TABLE (
  total                 BIGINT,
  open                  BIGINT,
  resolved_by_ai        BIGINT,
  ai_resolution_percent INTEGER,
  avg_resolution_hours  DOUBLE PRECISION
)
LANGUAGE sql
STABLE
AS $$
  SELECT
    COUNT(*)
      AS total,
    COUNT(*) FILTER (WHERE status IN ('new', 'processing', 'open', 'pending'))
      AS open,
    COUNT(*) FILTER (WHERE "resolvedByAi" = true)
      AS resolved_by_ai,
    CASE
      WHEN COUNT(*) FILTER (WHERE status IN ('resolved', 'closed')) = 0 THEN 0
      ELSE ROUND(
        COUNT(*) FILTER (WHERE "resolvedByAi" = true) * 100.0 /
        COUNT(*) FILTER (WHERE status IN ('resolved', 'closed'))
      )::INTEGER
    END
      AS ai_resolution_percent,
    AVG(EXTRACT(EPOCH FROM ("resolvedAt" - "createdAt")) / 3600.0)
      FILTER (WHERE "resolvedAt" IS NOT NULL)
      AS avg_resolution_hours
  FROM tickets
$$;
