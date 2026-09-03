-- Atomic catalog and quote mutations with mandatory audit records.

CREATE OR REPLACE FUNCTION public.admin_create_product(
  p_actor_user_id uuid, p_name_es text, p_name_en text, p_slug text, p_sku text,
  p_description_es text, p_description_en text, p_price numeric, p_cost_price numeric,
  p_status text, p_material text, p_weight_grams integer, p_dimensions_cm text,
  p_lead_time_days integer, p_is_featured boolean, p_stock integer, p_color text,
  p_size text, p_image_url text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_actor public.admin_whitelist; v_product public.products; v_image public.product_images; v_variant public.product_variants;
BEGIN
  SELECT * INTO v_actor FROM public.admin_whitelist WHERE user_id=p_actor_user_id AND active FOR UPDATE;
  IF v_actor.id IS NULL OR v_actor.role NOT IN ('SUPER_ADMIN','ADMIN','CATALOG_MANAGER') THEN RAISE EXCEPTION 'catalog access required'; END IF;
  INSERT INTO public.products(name_es,name_en,slug,sku,description_es,description_en,price,cost_price,status,material,weight_grams,dimensions_cm,lead_time_days,is_customizable,is_featured,is_new,is_best_seller)
  VALUES(trim(p_name_es),trim(p_name_en),p_slug,p_sku,coalesce(p_description_es,''),coalesce(p_description_en,''),p_price,p_cost_price,p_status,p_material,p_weight_grams,p_dimensions_cm,p_lead_time_days,false,p_is_featured,true,false)
  RETURNING * INTO v_product;
  INSERT INTO public.product_images(product_id,url,alt_text,sort_order,is_primary) VALUES(v_product.id,p_image_url,p_name_es,0,true) RETURNING * INTO v_image;
  INSERT INTO public.product_variants(product_id,sku,size,color,material,price,stock_quantity,image_url,weight_grams,active)
  VALUES(v_product.id,p_sku||'-STD',p_size,p_color,p_material,p_price,p_stock,p_image_url,p_weight_grams,true) RETURNING * INTO v_variant;
  INSERT INTO public.admin_audit_log(actor_user_id,actor_email,actor_role,action,target_type,target_id,metadata)
  VALUES(v_actor.user_id,v_actor.email,v_actor.role,'PRODUCT_CREATED','PRODUCT',v_product.id,jsonb_build_object('sku',p_sku,'slug',p_slug));
  RETURN to_jsonb(v_product)||jsonb_build_object('images',jsonb_build_array(to_jsonb(v_image)),'variants',jsonb_build_array(to_jsonb(v_variant)));
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_product(
  p_actor_user_id uuid, p_product_id uuid, p_changes jsonb
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_actor public.admin_whitelist; v_product public.products; v_variant public.product_variants; v_variant_count integer; v_action text;
BEGIN
  SELECT * INTO v_actor FROM public.admin_whitelist WHERE user_id=p_actor_user_id AND active FOR UPDATE;
  IF v_actor.id IS NULL OR v_actor.role NOT IN ('SUPER_ADMIN','ADMIN','CATALOG_MANAGER') THEN RAISE EXCEPTION 'catalog access required'; END IF;
  SELECT * INTO v_product FROM public.products WHERE id=p_product_id FOR UPDATE;
  IF v_product.id IS NULL THEN RAISE EXCEPTION 'product not found'; END IF;
  SELECT count(*) INTO v_variant_count FROM public.product_variants WHERE product_id=p_product_id;
  IF v_variant_count <> 1 THEN RAISE EXCEPTION 'exactly one product variant is required'; END IF;
  SELECT * INTO v_variant FROM public.product_variants WHERE product_id=p_product_id FOR UPDATE;

  UPDATE public.products SET
    name_es=CASE WHEN p_changes?'name_es' THEN p_changes->>'name_es' ELSE name_es END,
    name_en=CASE WHEN p_changes?'name_en' THEN p_changes->>'name_en' ELSE name_en END,
    description_es=CASE WHEN p_changes?'description_es' THEN p_changes->>'description_es' ELSE description_es END,
    description_en=CASE WHEN p_changes?'description_en' THEN p_changes->>'description_en' ELSE description_en END,
    price=CASE WHEN p_changes?'price' THEN (p_changes->>'price')::numeric ELSE price END,
    cost_price=CASE WHEN p_changes?'cost_price' THEN (p_changes->>'cost_price')::numeric ELSE cost_price END,
    material=CASE WHEN p_changes?'material' THEN p_changes->>'material' ELSE material END,
    status=CASE WHEN p_changes?'archived' AND (p_changes->>'archived')::boolean THEN 'OUT_OF_STOCK' WHEN p_changes?'archived' AND NOT (p_changes->>'archived')::boolean AND NOT (p_changes?'status') THEN 'AVAILABLE' WHEN p_changes?'status' THEN p_changes->>'status' ELSE status END,
    dimensions_cm=CASE WHEN p_changes?'dimensions_cm' THEN p_changes->>'dimensions_cm' ELSE dimensions_cm END,
    weight_grams=CASE WHEN p_changes?'weight_grams' THEN (p_changes->>'weight_grams')::integer ELSE weight_grams END,
    lead_time_days=CASE WHEN p_changes?'lead_time_days' THEN (p_changes->>'lead_time_days')::integer ELSE lead_time_days END,
    is_featured=CASE WHEN p_changes?'is_featured' THEN (p_changes->>'is_featured')::boolean ELSE is_featured END,
    archived_at=CASE WHEN p_changes?'archived' AND (p_changes->>'archived')::boolean THEN now() WHEN p_changes?'archived' THEN NULL ELSE archived_at END,
    archived_by_user_id=CASE WHEN p_changes?'archived' AND (p_changes->>'archived')::boolean THEN p_actor_user_id WHEN p_changes?'archived' THEN NULL ELSE archived_by_user_id END,
    updated_at=now()
  WHERE id=p_product_id RETURNING * INTO v_product;

  UPDATE public.product_variants SET
    price=CASE WHEN p_changes?'price' THEN (p_changes->>'price')::numeric ELSE price END,
    stock_quantity=CASE WHEN p_changes?'stock' THEN (p_changes->>'stock')::integer ELSE stock_quantity END,
    material=CASE WHEN p_changes?'material' THEN p_changes->>'material' ELSE material END,
    color=CASE WHEN p_changes?'color' THEN p_changes->>'color' ELSE color END,
    size=CASE WHEN p_changes?'size' THEN p_changes->>'size' ELSE size END,
    weight_grams=CASE WHEN p_changes?'weight_grams' THEN (p_changes->>'weight_grams')::integer ELSE weight_grams END,
    active=CASE WHEN p_changes?'archived' THEN NOT (p_changes->>'archived')::boolean ELSE active END
  WHERE id=v_variant.id RETURNING * INTO v_variant;

  v_action:=CASE WHEN p_changes?'archived' AND (p_changes->>'archived')::boolean THEN 'PRODUCT_ARCHIVED' WHEN p_changes?'archived' THEN 'PRODUCT_RESTORED' ELSE 'PRODUCT_UPDATED' END;
  INSERT INTO public.admin_audit_log(actor_user_id,actor_email,actor_role,action,target_type,target_id,metadata)
  VALUES(v_actor.user_id,v_actor.email,v_actor.role,v_action,'PRODUCT',v_product.id,jsonb_build_object('fields',(SELECT jsonb_agg(key) FROM jsonb_object_keys(p_changes) key)));
  RETURN to_jsonb(v_product)||jsonb_build_object('images',coalesce((SELECT jsonb_agg(to_jsonb(i) ORDER BY i.sort_order) FROM public.product_images i WHERE i.product_id=v_product.id),'[]'::jsonb),'variants',jsonb_build_array(to_jsonb(v_variant)));
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_quote(
  p_actor_user_id uuid, p_quote_id uuid, p_changes jsonb
) RETURNS public.custom_requests LANGUAGE plpgsql SECURITY DEFINER SET search_path=pg_catalog,public AS $$
DECLARE v_actor public.admin_whitelist; v_quote public.custom_requests;
BEGIN
  SELECT * INTO v_actor FROM public.admin_whitelist WHERE user_id=p_actor_user_id AND active FOR UPDATE;
  IF v_actor.id IS NULL OR v_actor.role NOT IN ('SUPER_ADMIN','ADMIN','QUOTE_MANAGER') THEN RAISE EXCEPTION 'quote access required'; END IF;
  UPDATE public.custom_requests SET
    status=CASE WHEN p_changes?'status' THEN p_changes->>'status' ELSE status END,
    budget=CASE WHEN p_changes?'budget' THEN (p_changes->>'budget')::numeric ELSE budget END,
    admin_notes=CASE WHEN p_changes?'admin_notes' THEN p_changes->>'admin_notes' ELSE admin_notes END,
    updated_by_user_id=p_actor_user_id,updated_at=now()
  WHERE id=p_quote_id RETURNING * INTO v_quote;
  IF v_quote.id IS NULL THEN RAISE EXCEPTION 'quote not found'; END IF;
  INSERT INTO public.admin_audit_log(actor_user_id,actor_email,actor_role,action,target_type,target_id,metadata)
  VALUES(v_actor.user_id,v_actor.email,v_actor.role,'QUOTE_UPDATED','QUOTE',v_quote.id,jsonb_build_object('fields',(SELECT jsonb_agg(key) FROM jsonb_object_keys(p_changes) key),'status',p_changes->>'status'));
  RETURN v_quote;
END $$;

REVOKE ALL ON FUNCTION public.admin_create_product(uuid,text,text,text,text,text,text,numeric,numeric,text,text,integer,text,integer,boolean,integer,text,text,text) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_update_product(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
REVOKE ALL ON FUNCTION public.admin_update_quote(uuid,uuid,jsonb) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.admin_create_product(uuid,text,text,text,text,text,text,numeric,numeric,text,text,integer,text,integer,boolean,integer,text,text,text) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_product(uuid,uuid,jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.admin_update_quote(uuid,uuid,jsonb) TO service_role;
