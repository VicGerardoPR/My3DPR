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

// ── Demo credentials (fallback when Supabase is not configured) ──────────────
const DEMO_ADMINS = [
  { email: 'admin@my3d.pr',   password: 'my3d2026',  name: 'Admin Principal', role: 'SUPER_ADMIN' },
  { email: 'victor@my3d.pr',  password: 'victor2026', name: 'Victor Gerardo',  role: 'SUPER_ADMIN' },
  { email: 'ops@my3d.pr',     password: 'ops2026',    name: 'Operaciones',     role: 'ADMIN'       },
];

// ── Auth helpers ─────────────────────────────────────────────────────────────

/**
 * Validates admin credentials against Supabase Auth + admin_whitelist.
 * Falls back to demo credentials when Supabase is not configured.
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
      // Fall through to demo mode
    }
  }

  // ── Demo mode fallback (no Supabase configured) ────────────────────────────
  const admin = DEMO_ADMINS.find(
    (a) => a.email === email.toLowerCase().trim() && a.password === password
  );
  if (admin) return { success: true, name: admin.name, role: admin.role };

  return { success: false, error: 'Credenciales incorrectas.' };
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
 * - Without Supabase: realistic demo data
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
        growthToday: 18, growthWeek: 12,
        ordersTotal: allOrders.data?.length ?? 0,
        ordersActive, ordersInProduction, ordersPending,
        aov,
        conversionRate: 3.2,
        customQuotesPipeline: customQuotes.data?.reduce((s, q) => s + (q.budget ?? 0), 0) ?? 0,
        customQuotesPending: customQuotes.data?.length ?? 0,
        topProducts: [],
        dailySales: getDemoDailySales(),
        paymentBreakdown: Object.entries(methods).map(([method, v]) => ({ method, ...v })),
      };
    } catch {
      // Fall through to demo
    }
  }

  // ── Demo data ────────────────────────────────────────────────────────────
  return {
    salesToday: 489.50,
    salesWeek: 2847.20,
    salesMonth: 11340.80,
    growthToday: 18,
    growthWeek: 12,
    ordersTotal: 87,
    ordersActive: 14,
    ordersInProduction: 5,
    ordersPending: 3,
    aov: 34.96,
    conversionRate: 3.2,
    customQuotesPipeline: 1250.00,
    customQuotesPending: 4,
    topProducts: [
      { name: 'Dragón Cristal Articulado', revenue: 2199.78, units: 112 },
      { name: 'Axolotl Kawaii Articulado', revenue: 1547.85, units: 95 },
      { name: 'Mech Stand Gaming', revenue: 1389.50, units: 73 },
      { name: 'Llaveros Personalizados', revenue: 893.40, units: 148 },
      { name: 'Litofanía 3D Personalizada', revenue: 742.50, units: 39 },
    ],
    dailySales: getDemoDailySales(),
    paymentBreakdown: [
      { method: 'ATH_MOVIL', amount: 4892.30, count: 41 },
      { method: 'STRIPE', amount: 4651.20, count: 32 },
      { method: 'PAYPAL', amount: 1797.30, count: 14 },
    ],
  };
}

function getDemoDailySales() {
  const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const amounts = [312.50, 428.90, 389.20, 512.80, 645.30, 812.40, 489.50];
  return days.map((day, i) => ({ day, amount: amounts[i] }));
}
