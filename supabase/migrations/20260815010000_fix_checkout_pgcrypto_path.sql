-- pgcrypto is installed in Supabase's extensions schema. Keep the trusted
-- application schema first and explicitly allow extension functions used by
-- the checkout implementation.
ALTER FUNCTION public.create_pending_order_atomic(text, jsonb, jsonb, text, uuid)
  SET search_path = public, extensions;
