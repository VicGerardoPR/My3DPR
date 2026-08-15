-- The function is used internally by the ensure_rls event trigger. It must not
-- be callable through PostgREST by anonymous or authenticated clients.
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.rls_auto_enable() TO service_role;
