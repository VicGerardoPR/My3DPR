CREATE OR REPLACE FUNCTION public.admin_delete_product(
  p_actor_user_id uuid,
  p_product_id uuid
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_actor public.admin_whitelist;
  v_product public.products;
  v_images jsonb;
BEGIN
  SELECT * INTO v_actor
  FROM public.admin_whitelist
  WHERE user_id = p_actor_user_id AND active
  FOR UPDATE;
  IF v_actor.id IS NULL OR v_actor.role NOT IN ('SUPER_ADMIN', 'ADMIN', 'CATALOG_MANAGER') THEN
    RAISE EXCEPTION 'catalog access required';
  END IF;

  SELECT * INTO v_product
  FROM public.products
  WHERE id = p_product_id
  FOR UPDATE;
  IF v_product.id IS NULL THEN
    RAISE EXCEPTION 'product not found';
  END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object('url', image.url) ORDER BY image.sort_order), '[]'::jsonb)
  INTO v_images
  FROM public.product_images AS image
  WHERE image.product_id = p_product_id;

  INSERT INTO public.admin_audit_log(actor_user_id, actor_email, actor_role, action, target_type, target_id, metadata)
  VALUES (
    v_actor.user_id,
    v_actor.email,
    v_actor.role,
    'PRODUCT_DELETED',
    'PRODUCT',
    v_product.id,
    jsonb_build_object('name_es', v_product.name_es, 'sku', v_product.sku)
  );

  DELETE FROM public.products WHERE id = p_product_id;
  RETURN jsonb_build_object('id', v_product.id, 'images', v_images);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_delete_product(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_delete_product(uuid, uuid) TO service_role;
