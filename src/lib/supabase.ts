import { createClient } from '@supabase/supabase-js';
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
    return [];
  }

  static async getProductBySlug(slug: string): Promise<Product | null> {
    if (supabase) {
      const { data, error } = await supabase.from('products').select('*, categories(*), product_images(*), product_variants(*)').eq('slug', slug).single();
      if (!error && data) return data as Product;
    }
    return null;
  }

  static async getCategories(): Promise<Category[]> {
    if (supabase) {
      const { data, error } = await supabase.from('categories').select('*').order('sort_order', { ascending: true });
      if (!error && data && data.length > 0) return data as Category[];
    }
    return [];
  }

  static async getBoxTemplates(): Promise<BoxTemplate[]> {
    if (supabase) {
      const { data, error } = await supabase.from('box_templates').select('*');
      if (!error && data && data.length > 0) return data as BoxTemplate[];
    }
    return [];
  }

  static async createCustomRequest(req: Partial<CustomRequest>): Promise<{ success: boolean; request_number: string }> {
    throw new Error('Use /api/custom-quotes for server-side quote creation.');
  }

  static async createOrder(orderData: Partial<Order>): Promise<{ success: boolean; order_number: string }> {
    throw new Error('Use /api/checkout for server-side order creation.');
  }
}
