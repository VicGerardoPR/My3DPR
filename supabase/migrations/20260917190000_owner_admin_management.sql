-- Atomic, audited administrator membership mutations.

CREATE OR REPLACE FUNCTION public.admin_grant_access(
  p_actor_user_id uuid,
  p_target_user_id uuid,
  p_email text,
  p_full_name text,
  p_role text,
  p_invited boolean DEFAULT false
) RETURNS public.admin_whitelist
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_actor public.admin_whitelist; v_target public.admin_whitelist;
BEGIN
  PERFORM pg_advisory_xact_lock(771342);
  SELECT * INTO v_actor FROM public.admin_whitelist WHERE user_id = p_actor_user_id AND active FOR UPDATE;
  IF v_actor.id IS NULL OR v_actor.role <> 'SUPER_ADMIN' THEN RAISE EXCEPTION 'super admin access required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_actor_user_id AND lower(email) = 'victor.rivera@arcanointelligence.com' AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'verified owner required'; END IF;
  IF p_role NOT IN ('SUPER_ADMIN','ADMIN','CATALOG_MANAGER','QUOTE_MANAGER') THEN RAISE EXCEPTION 'invalid admin role'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_target_user_id AND lower(email) = lower(trim(p_email))) THEN RAISE EXCEPTION 'target auth identity mismatch'; END IF;

  INSERT INTO public.admin_whitelist(user_id,email,full_name,role,active,created_by_user_id,updated_by_user_id)
  VALUES(p_target_user_id,lower(trim(p_email)),trim(p_full_name),p_role,true,p_actor_user_id,p_actor_user_id)
  ON CONFLICT (user_id) DO UPDATE SET email=excluded.email,full_name=excluded.full_name,role=excluded.role,active=true,updated_by_user_id=p_actor_user_id
  RETURNING * INTO v_target;

  INSERT INTO public.admin_audit_log(actor_user_id,actor_email,actor_role,action,target_type,target_id,metadata)
  VALUES(v_actor.user_id,v_actor.email,v_actor.role,'ADMIN_ACCESS_GRANTED','ADMIN',v_target.id,jsonb_build_object('role',v_target.role,'invited',p_invited));
  RETURN v_target;
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_access(
  p_actor_user_id uuid,
  p_target_admin_id uuid,
  p_role text DEFAULT NULL,
  p_active boolean DEFAULT NULL,
  p_full_name text DEFAULT NULL
) RETURNS public.admin_whitelist
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE v_actor public.admin_whitelist; v_current public.admin_whitelist; v_target public.admin_whitelist;
BEGIN
  PERFORM pg_advisory_xact_lock(771342);
  SELECT * INTO v_actor FROM public.admin_whitelist WHERE user_id=p_actor_user_id AND active FOR UPDATE;
  IF v_actor.id IS NULL OR v_actor.role <> 'SUPER_ADMIN' THEN RAISE EXCEPTION 'super admin access required'; END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_actor_user_id AND lower(email) = 'victor.rivera@arcanointelligence.com' AND email_confirmed_at IS NOT NULL) THEN RAISE EXCEPTION 'verified owner required'; END IF;
  SELECT * INTO v_current FROM public.admin_whitelist WHERE id=p_target_admin_id FOR UPDATE;
  IF v_current.id IS NULL THEN RAISE EXCEPTION 'administrator not found'; END IF;
  IF p_role IS NOT NULL AND p_role NOT IN ('SUPER_ADMIN','ADMIN','CATALOG_MANAGER','QUOTE_MANAGER') THEN RAISE EXCEPTION 'invalid admin role'; END IF;
  IF v_current.id=v_actor.id AND (p_active=false OR (p_role IS NOT NULL AND p_role<>'SUPER_ADMIN')) THEN RAISE EXCEPTION 'cannot revoke or demote current super admin'; END IF;

  UPDATE public.admin_whitelist SET
    role=coalesce(p_role,role), active=coalesce(p_active,active), full_name=coalesce(trim(p_full_name),full_name), updated_by_user_id=p_actor_user_id
  WHERE id=p_target_admin_id RETURNING * INTO v_target;

  INSERT INTO public.admin_audit_log(actor_user_id,actor_email,actor_role,action,target_type,target_id,metadata)
  VALUES(v_actor.user_id,v_actor.email,v_actor.role,CASE WHEN v_target.active THEN 'ADMIN_UPDATED' ELSE 'ADMIN_REVOKED' END,'ADMIN',v_target.id,jsonb_build_object('role',v_target.role,'active',v_target.active));
  RETURN v_target;
END $$;

REVOKE ALL ON FUNCTION public.admin_grant_access(uuid,uuid,text,text,text,boolean) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_update_access(uuid,uuid,text,boolean,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_grant_access(uuid,uuid,text,text,text,boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_access(uuid,uuid,text,boolean,text) TO service_role;

-- Changing an Auth password invalidates independent HMAC admin sessions too.
CREATE OR REPLACE FUNCTION public.invalidate_admin_password_sessions()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  IF NEW.encrypted_password IS DISTINCT FROM OLD.encrypted_password THEN
    UPDATE public.admin_whitelist SET session_version = session_version + 1 WHERE user_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.invalidate_admin_password_sessions() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER invalidate_admin_password_sessions AFTER UPDATE OF encrypted_password ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.invalidate_admin_password_sessions();
