-- MY3D.PR Schema — Tablas principales para producción
-- Ejecutar en Supabase SQL Editor

-- ── Admin Whitelist ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admin_whitelist (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER')),
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Administrators are provisioned explicitly by the owner; no demo users are seeded.

-- ── Categories ──────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name_es text NOT NULL,
  name_en text NOT NULL,
  slug text UNIQUE NOT NULL,
  description_es text,
  description_en text,
  image_url text,
  parent_id uuid REFERENCES categories(id),
  sort_order int DEFAULT 0,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── Products ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS products (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name_es text NOT NULL,
  name_en text NOT NULL,
  slug text UNIQUE NOT NULL,
  sku text UNIQUE NOT NULL,
  description_es text DEFAULT '',
  description_en text DEFAULT '',
  price numeric(10,2) NOT NULL,
  sale_price numeric(10,2),
  cost_price numeric(10,2),
  category_id uuid REFERENCES categories(id),
  status text DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE','READY_TO_SHIP','MADE_TO_ORDER','LOW_STOCK','OUT_OF_STOCK','PRE_ORDER','COMING_SOON')),
  is_customizable boolean DEFAULT false,
  is_featured boolean DEFAULT false,
  is_new boolean DEFAULT false,
  is_best_seller boolean DEFAULT false,
  material text DEFAULT 'PLA',
  weight_grams int DEFAULT 100,
  dimensions_cm text,
  lead_time_days int DEFAULT 3,
  rating numeric(3,1),
  review_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Product Images ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_images (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  url text NOT NULL,
  alt_text text,
  sort_order int DEFAULT 0,
  is_primary boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- ── Product Variants ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS product_variants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  sku text UNIQUE NOT NULL,
  size text,
  color text,
  material text,
  style text,
  finish text,
  price numeric(10,2),
  sale_price numeric(10,2),
  stock_quantity int DEFAULT 0,
  image_url text,
  weight_grams int,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── Orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  order_number text UNIQUE NOT NULL,
  user_id uuid,
  guest_email text,
  status text DEFAULT 'ORDER_RECEIVED' CHECK (status IN ('ORDER_RECEIVED','PAYMENT_CONFIRMED','IN_PRODUCTION','READY_TO_SHIP','SHIPPED','DELIVERED','CANCELLED')),
  subtotal numeric(10,2) NOT NULL DEFAULT 0,
  discount numeric(10,2) DEFAULT 0,
  shipping_cost numeric(10,2) DEFAULT 0,
  tax_amount numeric(10,2) DEFAULT 0,
  total_amount numeric(10,2) NOT NULL DEFAULT 0,
  currency text DEFAULT 'USD',
  shipping_address jsonb,
  billing_address jsonb,
  shipping_method text DEFAULT 'STANDARD',
  payment_status text DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING','PAID','FAILED','REFUNDED')),
  payment_method text CHECK (payment_method IN ('STRIPE','PAYPAL','ATH_MOVIL')),
  tracking_number text,
  carrier text,
  tracking_link text,
  items jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Custom Requests ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS custom_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  request_number text UNIQUE NOT NULL,
  user_id uuid,
  customer_name text NOT NULL,
  customer_email text NOT NULL,
  customer_phone text,
  project_name text NOT NULL,
  description text,
  desired_size text,
  quantity int DEFAULT 1,
  colors text,
  material text,
  deadline text,
  budget numeric(10,2),
  status text DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED','UNDER_REVIEW','NEEDS_INFORMATION','QUOTED','APPROVED','REJECTED','PAID','IN_PRODUCTION','READY','SHIPPED','COMPLETED','CANCELLED')),
  files jsonb DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ── Box Templates ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS box_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name_es text NOT NULL,
  name_en text NOT NULL,
  slug text UNIQUE NOT NULL,
  description_es text DEFAULT '',
  description_en text DEFAULT '',
  required_item_count int NOT NULL,
  base_price numeric(10,2) NOT NULL,
  bundle_discount_percent numeric(5,2) DEFAULT 15,
  image_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- ── RLS Policies ──────────────────────────────────────────────────────────────
ALTER TABLE admin_whitelist ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE box_templates ENABLE ROW LEVEL SECURITY;

-- Products & Categories: public read
CREATE POLICY "Products public read" ON products FOR SELECT USING (true);
CREATE POLICY "Categories public read" ON categories FOR SELECT USING (true);
CREATE POLICY "Box templates public read" ON box_templates FOR SELECT USING (true);

-- Orders: users see their own
CREATE POLICY "Users see own orders" ON orders FOR SELECT USING (guest_email = current_setting('request.jwt.claims', true)::json->>'email' OR user_id::text = auth.uid()::text);
CREATE POLICY "Anyone can create order" ON orders FOR INSERT WITH CHECK (true);

-- Custom requests: users see their own
CREATE POLICY "Anyone can submit custom request" ON custom_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "Users see own requests" ON custom_requests FOR SELECT USING (customer_email = current_setting('request.jwt.claims', true)::json->>'email');

-- Admin whitelist: service role only
CREATE POLICY "Service role only" ON admin_whitelist FOR ALL USING (auth.role() = 'service_role');

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_slug ON products(slug);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_payment ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_custom_requests_status ON custom_requests(status);
