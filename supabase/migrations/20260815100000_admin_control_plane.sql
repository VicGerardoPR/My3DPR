-- Durable administrative control plane with least-privilege roles.
-- Append-only: preserves existing admins/catalog and aborts if Auth identity linkage is ambiguous.

UPDATE public.admin_whitelist SET email = lower(trim(email));
UPDATE public.admin_whitelist SET role = 'ADMIN' WHERE role = 'MANAGER';
ALTER TABLE public.admin_whitelist DROP CONSTRAINT IF EXISTS admin_whitelist_role_check;
ALTER TABLE public.admin_whitelist
  ADD CONSTRAINT admin_whitelist_role_check
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'QUOTE_MANAGER')),
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS updated_by_user_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_login_at timestamptz,
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1 CHECK (session_version > 0);

UPDATE public.admin_whitelist aw
SET user_id = u.id
FROM auth.users u
WHERE aw.user_id IS NULL AND lower(u.email) = lower(aw.email);

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.admin_whitelist WHERE active AND user_id IS NULL) THEN
    RAISE EXCEPTION 'active admin without a matching auth.users identity';
  END IF;
  IF EXISTS (
    SELECT lower(email) FROM auth.users WHERE email IS NOT NULL
    GROUP BY lower(email) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'ambiguous normalized auth user email';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.admin_whitelist WHERE active AND role = 'SUPER_ADMIN') THEN
    RAISE EXCEPTION 'at least one active super admin is required';
  END IF;
END $$;

ALTER TABLE public.admin_whitelist ALTER COLUMN user_id SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS admin_whitelist_email_lower_unique ON public.admin_whitelist (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS admin_whitelist_user_id_unique ON public.admin_whitelist (user_id);
ALTER TABLE public.admin_whitelist DROP CONSTRAINT IF EXISTS admin_whitelist_email_normalized;
ALTER TABLE public.admin_whitelist ADD CONSTRAINT admin_whitelist_email_normalized CHECK (email = lower(trim(email)));

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_whitelist_user_id_fkey') THEN
    ALTER TABLE public.admin_whitelist ADD CONSTRAINT admin_whitelist_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE RESTRICT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_whitelist_created_by_user_id_fkey') THEN
    ALTER TABLE public.admin_whitelist ADD CONSTRAINT admin_whitelist_created_by_user_id_fkey FOREIGN KEY (created_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'admin_whitelist_updated_by_user_id_fkey') THEN
    ALTER TABLE public.admin_whitelist ADD CONSTRAINT admin_whitelist_updated_by_user_id_fkey FOREIGN KEY (updated_by_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.protect_last_super_admin()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_remaining integer;
BEGIN
  PERFORM pg_advisory_xact_lock(771342);
  IF OLD.role = 'SUPER_ADMIN' AND OLD.active = true AND (TG_OP = 'DELETE' OR NEW.role <> 'SUPER_ADMIN' OR NEW.active = false) THEN
    SELECT count(*) INTO v_remaining FROM public.admin_whitelist
    WHERE id <> OLD.id AND role = 'SUPER_ADMIN' AND active = true;
    IF v_remaining = 0 THEN RAISE EXCEPTION 'cannot remove the last active super admin'; END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  NEW.email := lower(trim(NEW.email));
  NEW.updated_at := now();
  IF NEW.role IS DISTINCT FROM OLD.role OR NEW.active IS DISTINCT FROM OLD.active OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
    NEW.session_version := OLD.session_version + 1;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS protect_last_super_admin_trigger ON public.admin_whitelist;
CREATE TRIGGER protect_last_super_admin_trigger BEFORE UPDATE OR DELETE ON public.admin_whitelist
FOR EACH ROW EXECUTE FUNCTION public.protect_last_super_admin();

CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  actor_email text NOT NULL,
  actor_role text NOT NULL CHECK (actor_role IN ('SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER', 'QUOTE_MANAGER')),
  action text NOT NULL,
  target_type text NOT NULL CHECK (target_type IN ('ADMIN', 'PRODUCT', 'QUOTE')),
  target_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_log FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_audit_log FROM PUBLIC, anon, authenticated;
CREATE INDEX IF NOT EXISTS admin_audit_log_created_idx ON public.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS admin_audit_log_target_idx ON public.admin_audit_log(target_type, target_id);

ALTER TABLE public.admin_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_whitelist FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.admin_whitelist FROM PUBLIC, anon, authenticated;

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS archived_at timestamptz, ADD COLUMN IF NOT EXISTS archived_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS products_active_catalog_idx ON public.products(created_at DESC) WHERE archived_at IS NULL;

ALTER TABLE public.custom_requests
  ADD COLUMN IF NOT EXISTS admin_notes text,
  ADD COLUMN IF NOT EXISTS updated_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
CREATE INDEX IF NOT EXISTS custom_requests_admin_queue_idx ON public.custom_requests(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.set_row_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END $$;
DROP TRIGGER IF EXISTS custom_requests_set_updated_at ON public.custom_requests;
CREATE TRIGGER custom_requests_set_updated_at BEFORE UPDATE ON public.custom_requests
FOR EACH ROW EXECUTE FUNCTION public.set_row_updated_at();

DROP POLICY IF EXISTS "Products public read" ON public.products;
CREATE POLICY "Products public read" ON public.products FOR SELECT TO anon, authenticated USING (products.archived_at IS NULL);
DROP POLICY IF EXISTS "Product images public read" ON public.product_images;
CREATE POLICY "Product images public read" ON public.product_images FOR SELECT TO anon, authenticated USING (EXISTS (
  SELECT 1 FROM public.products p WHERE p.id = product_images.product_id AND p.archived_at IS NULL AND p.status NOT IN ('COMING_SOON')
));
DROP POLICY IF EXISTS "Product variants public read" ON public.product_variants;
CREATE POLICY "Product variants public read" ON public.product_variants FOR SELECT TO anon, authenticated USING (active AND EXISTS (
  SELECT 1 FROM public.products p WHERE p.id = product_variants.product_id AND p.archived_at IS NULL AND p.status NOT IN ('COMING_SOON')
));

REVOKE ALL ON FUNCTION public.protect_last_super_admin() FROM PUBLIC, anon, authenticated;
