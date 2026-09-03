-- Distributed, bounded rate limiting for inventory-reserving checkout calls.
CREATE TABLE IF NOT EXISTS public.checkout_rate_limits (
  bucket text PRIMARY KEY,
  window_started_at timestamptz NOT NULL DEFAULT now(),
  attempts integer NOT NULL DEFAULT 1 CHECK (attempts > 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS checkout_rate_limits_updated_at_idx
  ON public.checkout_rate_limits(updated_at);
ALTER TABLE public.checkout_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.checkout_rate_limits FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.checkout_rate_limits TO service_role;

CREATE OR REPLACE FUNCTION public.consume_checkout_rate_limit(
  p_bucket text,
  p_limit integer,
  p_window_seconds integer
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE v_attempts integer;
BEGIN
  IF COALESCE(p_bucket,'') = '' OR p_limit < 1 OR p_window_seconds < 1 OR p_window_seconds > 86400 THEN
    RAISE EXCEPTION 'invalid rate limit parameters';
  END IF;

  INSERT INTO checkout_rate_limits(bucket,window_started_at,attempts,updated_at)
  VALUES (p_bucket,now(),1,now())
  ON CONFLICT (bucket) DO UPDATE SET
    window_started_at = CASE
      WHEN checkout_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) THEN now()
      ELSE checkout_rate_limits.window_started_at
    END,
    attempts = CASE
      WHEN checkout_rate_limits.window_started_at <= now() - make_interval(secs => p_window_seconds) THEN 1
      ELSE checkout_rate_limits.attempts + 1
    END,
    updated_at = now()
  RETURNING attempts INTO v_attempts;

  DELETE FROM checkout_rate_limits WHERE updated_at < now() - interval '1 day';
  RETURN v_attempts <= p_limit;
END $$;

REVOKE ALL ON FUNCTION public.consume_checkout_rate_limit(text,integer,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.consume_checkout_rate_limit(text,integer,integer) TO service_role;
