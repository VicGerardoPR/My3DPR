import { createClient } from '@supabase/supabase-js';

// ── Supabase client with service role (server-side only) ─────────────────────
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Public client for auth operations (uses anon key)
const getAuthClient = () => {
  if (!supabaseUrl || !anonKey || supabaseUrl.includes('your-project')) return null;
  return createClient(supabaseUrl, anonKey);
};

// Admin client for whitelist verification (uses service role)
const getAdminClient = () => {
  if (!supabaseUrl || !serviceRoleKey || supabaseUrl.includes('your-project')) return null;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
};


// ── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Validates admin credentials against Supabase Auth + admin_whitelist.
 * Fails closed when Supabase Auth is not configured.
 */
export async function validateAdminLogin(
  email: string,
  password: string
): Promise<{ success: boolean; name?: string; role?: string; error?: string }> {
  const authClient = getAuthClient();
  const adminClient = getAdminClient();

  if (authClient && adminClient) {
    try {
      // 1. Authenticate with Supabase Auth
      const { data, error } = await authClient.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      if (error || !data.user) {
        return { success: false, error: 'Email o contraseña incorrectos.' };
      }

      // 2. Verify email is in admin_whitelist (using service role to bypass RLS)
      const { data: whitelist, error: wlError } = await adminClient
        .from('admin_whitelist')
        .select('role, full_name, active')
        .eq('email', email.toLowerCase().trim())
        .eq('active', true)
        .single();

      if (wlError || !whitelist) {
        await authClient.auth.signOut();
        return { success: false, error: 'No tienes acceso al panel administrativo. Contacta al administrador.' };
      }

      return { success: true, name: whitelist.full_name, role: whitelist.role };
    } catch (err) {
      console.error('Supabase auth error:', err);
      return { success: false, error: 'No fue posible validar la sesión administrativa.' };
    }
  }

  return { success: false, error: 'Autenticación administrativa no configurada.' };
}

// ── Financial Data ──────────────────────────────────────────────────────────

export interface FinancialKPIs {
  salesToday: number;
  salesWeek: number;
  salesMonth: number;
  growthToday: number;
  growthWeek: number;
  ordersTotal: number;
  ordersActive: number;
  ordersInProduction: number;
  ordersPending: number;
  aov: number;
  conversionRate: number;
  customQuotesPipeline: number;
  customQuotesPending: number;
  topProducts: { name: string; revenue: number; units: number }[];
  dailySales: { day: string; amount: number }[];
  paymentBreakdown: { method: string; amount: number; count: number }[];
}

/**
 * Returns financial KPIs.
 * - With Supabase: real data from orders table
 * - Without Supabase: zero-valued safe state
 */
export async function getFinancialKPIs(): Promise<FinancialKPIs> {
  const db = getAdminClient();
  if (db) {
    try {
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const monthAgo = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      const [todayOrders, weekOrders, monthOrders, allOrders, customQuotes] = await Promise.all([
        db.from('orders').select('total_amount, payment_method').gte('created_at', todayStr).eq('payment_status', 'PAID'),
        db.from('orders').select('total_amount').gte('created_at', weekAgo).eq('payment_status', 'PAID'),
        db.from('orders').select('total_amount').gte('created_at', monthAgo).eq('payment_status', 'PAID'),
        db.from('orders').select('status, total_amount, payment_method').order('created_at', { ascending: false }).limit(200),
        db.from('custom_requests').select('budget, status').eq('status', 'SUBMITTED'),
      ]);

      const salesToday = todayOrders.data?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
      const salesWeek = weekOrders.data?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
      const salesMonth = monthOrders.data?.reduce((s, o) => s + o.total_amount, 0) ?? 0;
      const ordersActive = allOrders.data?.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length ?? 0;
      const ordersInProduction = allOrders.data?.filter((o) => o.status === 'IN_PRODUCTION').length ?? 0;
      const ordersPending = allOrders.data?.filter((o) => o.status === 'ORDER_RECEIVED').length ?? 0;
      const aov = allOrders.data && allOrders.data.length > 0 ? salesMonth / allOrders.data.length : 0;

      // Payment breakdown
      const methods: Record<string, { amount: number; count: number }> = {};
      allOrders.data?.forEach((o) => {
        if (!methods[o.payment_method]) methods[o.payment_method] = { amount: 0, count: 0 };
        methods[o.payment_method].amount += o.total_amount;
        methods[o.payment_method].count += 1;
      });

      return {
        salesToday, salesWeek, salesMonth,
        growthToday: 0, growthWeek: 0,
        ordersTotal: allOrders.data?.length ?? 0,
        ordersActive, ordersInProduction, ordersPending,
        aov,
        conversionRate: 0,
        customQuotesPipeline: customQuotes.data?.reduce((s, q) => s + (q.budget ?? 0), 0) ?? 0,
        customQuotesPending: customQuotes.data?.length ?? 0,
        topProducts: [],
        dailySales: getEmptyDailySales(),
        paymentBreakdown: Object.entries(methods).map(([method, v]) => ({ method, ...v })),
      };
    } catch {
      // Fall through to a zero-valued safe state.
    }
  }

  // ── Production Fallback (No Demo Data) ──────────────────────────────────
  return {
    salesToday: 0,
    salesWeek: 0,
    salesMonth: 0,
    growthToday: 0,
    growthWeek: 0,
    ordersTotal: 0,
    ordersActive: 0,
    ordersInProduction: 0,
    ordersPending: 0,
    aov: 0,
    conversionRate: 0,
    customQuotesPipeline: 0,
    customQuotesPending: 0,
    topProducts: [],
    dailySales: getEmptyDailySales(),
    paymentBreakdown: [],
  };
}

function getEmptyDailySales() {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  return days.map((day) => ({ day, amount: 0 }));
}
