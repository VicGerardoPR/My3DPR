-- The API uses ON CONFLICT (email). The lowercase check guarantees canonical
-- storage, so a direct unique index remains case-insensitive in practice and
-- can be inferred by PostgreSQL for the upsert clause.
DROP INDEX IF EXISTS public.newsletter_email_unique;
CREATE UNIQUE INDEX newsletter_email_unique
  ON public.newsletter_subscribers (email);
