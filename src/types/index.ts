export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'FULFILLMENT' | 'CUSTOMER';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  role: UserRole;
  avatar_url?: string;
  created_at: string;
}

export interface Category {
  id: string;
  name_es: string;
  name_en: string;
  slug: string;
  description_es?: string;
  description_en?: string;
  image_url?: string;
  parent_id?: string;
  sort_order: number;
  active: boolean;
}

export interface Collection {
  id: string;
  name_es: string;
  name_en: string;
  slug: string;
  description_es?: string;
  description_en?: string;
  image_url?: string;
  active: boolean;
}

export type ProductStatus =
  | 'AVAILABLE'
  | 'READY_TO_SHIP'
  | 'MADE_TO_ORDER'
  | 'LOW_STOCK'
  | 'OUT_OF_STOCK'
  | 'PRE_ORDER'
  | 'COMING_SOON';

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  size?: string;
  color?: string;
  material?: string;
  style?: string;
  finish?: string;
  price?: number;
  sale_price?: number;
  stock_quantity: number;
  image_url?: string;
  weight_grams?: number;
  active: boolean;
}

export interface ProductImage {
  id: string;
  product_id: string;
  url: string;
  alt_text?: string;
  sort_order: number;
  is_primary: boolean;
}

export interface Product {
  id: string;
  name_es: string;
  name_en: string;
  slug: string;
  sku: string;
  description_es: string;
  description_en: string;
  price: number;
  sale_price?: number;
  cost_price?: number;
  category_id?: string;
  category?: Category;
  collection_id?: string;
  status: ProductStatus;
  is_customizable: boolean;
  is_featured: boolean;
  is_new: boolean;
  is_best_seller: boolean;
  material: string;
  weight_grams: number;
  dimensions_cm?: string;
  lead_time_days: number;
  variants?: ProductVariant[];
  images?: ProductImage[];
  rating?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  id: string;
  product_id: string;
  product: Product;
  variant_id?: string;
  variant?: ProductVariant;
  quantity: number;
  custom_text?: string;
  custom_notes?: string;
  selected_options?: Record<string, string>;
  is_box_bundle?: boolean;
  box_template_id?: string;
}

export type OrderStatus =
  | 'ORDER_RECEIVED'
  | 'PAYMENT_CONFIRMED'
  | 'IN_PRODUCTION'
  | 'READY_TO_SHIP'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';

export type PaymentMethod = 'STRIPE' | 'PAYPAL' | 'ATH_MOVIL';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface Address {
  full_name: string;
  street_line1: string;
  street_line2?: string;
  city: string;
  state: string;
  zip_code: string;
  country: string;
  phone?: string;
}

export interface OrderItem {
  id: string;
  product_id?: string;
  product_name: string;
  variant_name?: string;
  price: number;
  quantity: number;
  custom_text?: string;
  custom_notes?: string;
  item_total: number;
}

export interface Order {
  id: string;
  order_number: string;
  user_id?: string;
  guest_email?: string;
  status: OrderStatus;
  subtotal: number;
  discount: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  shipping_address: Address;
  billing_address?: Address;
  shipping_method: string;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  tracking_number?: string;
  carrier?: string;
  tracking_link?: string;
  items: OrderItem[];
  created_at: string;
}

export type CustomRequestStatus =
  | 'SUBMITTED'
  | 'UNDER_REVIEW'
  | 'NEEDS_INFORMATION'
  | 'QUOTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'PAID'
  | 'IN_PRODUCTION'
  | 'READY'
  | 'SHIPPED'
  | 'COMPLETED'
  | 'CANCELLED';

export interface CustomRequestFile {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size_bytes: number;
  created_at: string;
}

export interface CustomRequest {
  id: string;
  request_number: string;
  user_id?: string;
  customer_name: string;
  customer_email: string;
  customer_phone?: string;
  project_name: string;
  description: string;
  desired_size?: string;
  quantity: number;
  colors?: string;
  material?: string;
  deadline?: string;
  budget?: number;
  status: CustomRequestStatus;
  files: CustomRequestFile[];
  quote?: Quote;
  created_at: string;
}

export type QuoteStatus = 'DRAFT' | 'SENT' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED' | 'PAID';

export interface Quote {
  id: string;
  quote_number: string;
  custom_request_id: string;
  user_id?: string;
  price: number;
  shipping_cost: number;
  tax_amount: number;
  total_amount: number;
  lead_time_days: number;
  internal_notes?: string;
  customer_notes?: string;
  expires_at: string;
  status: QuoteStatus;
  created_at: string;
}

export interface BoxTemplate {
  id: string;
  name_es: string;
  name_en: string;
  slug: string;
  description_es: string;
  description_en: string;
  required_item_count: number;
  base_price: number;
  bundle_discount_percent: number;
  image_url: string;
  active: boolean;
  eligible_product_ids?: string[];
}

export interface Coupon {
  id: string;
  code: string;
  discount_type: 'PERCENTAGE' | 'FIXED' | 'FREE_SHIPPING';
  discount_value: number;
  min_purchase_amount: number;
  active: boolean;
}

export interface Review {
  id: string;
  product_id: string;
  author_name: string;
  rating: number;
  title: string;
  comment: string;
  is_verified_purchase: boolean;
  created_at: string;
}
