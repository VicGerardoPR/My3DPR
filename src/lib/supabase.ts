import { createClient } from '@supabase/supabase-js';
import { DEMO_PRODUCTS, DEMO_CATEGORIES, DEMO_BOX_TEMPLATES } from './seed-data';
import { Product, Category, BoxTemplate, CustomRequest, Order } from '@/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export const supabase = (supabaseUrl && supabaseAnonKey && !supabaseUrl.includes('your-project'))
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export class DataService {
  static async getProducts(): Promise<Product[]> {
    if (supabase) {
      const { data, error } = await supabase.from('products').select('*, categories(*), product_images(*)');
      if (!error && data && data.length > 0) return data as Product[];
    }
    return DEMO_PRODUCTS;
  }

  static async getProductBySlug(slug: string): Promise<Product | null> {
    if (supabase) {
      const { data, error } = await supabase.from('products').select('*, categories(*), product_images(*), product_variants(*)').eq('slug', slug).single();
      if (!error && data) return data as Product;
    }
    return DEMO_PRODUCTS.find((p) => p.slug === slug) || null;
  }

  static async getCategories(): Promise<Category[]> {
    if (supabase) {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      if (!error && data && data.length > 0) return data as Category[];
    }
    return DEMO_CATEGORIES;
  }

  static async getBoxTemplates(): Promise<BoxTemplate[]> {
    if (supabase) {
      const { data, error } = await supabase.from('box_templates').select('*');
      if (!error && data && data.length > 0) return data as BoxTemplate[];
    }
    return DEMO_BOX_TEMPLATES;
  }

  static async createCustomRequest(req: Partial<CustomRequest>): Promise<{ success: boolean; request_number: string }> {
    const requestNumber = `REQ-3D-${Math.floor(1000 + Math.random() * 9000)}`;
    if (supabase) {
      await supabase.from('custom_requests').insert([{ ...req, request_number: requestNumber }]);
    }
    return { success: true, request_number: requestNumber };
  }

  static async createOrder(orderData: Partial<Order>): Promise<{ success: boolean; order_number: string }> {
    const orderNumber = `MY3D-${Math.floor(10000 + Math.random() * 90000)}`;
    if (supabase) {
      await supabase.from('orders').insert([{ ...orderData, order_number: orderNumber }]);
    }
    return { success: true, order_number: orderNumber };
  }
}
