import { NextRequest, NextResponse } from 'next/server';
import { getFinancialKPIs } from '@/lib/auth';
import { verifyAdminSession } from '@/lib/admin-session';

export async function GET(request: NextRequest) {
  const session = await verifyAdminSession(
    request.cookies.get('admin_session')?.value,
    process.env.ADMIN_SESSION_SECRET || '',
  );
  if (!session) return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });

  try {
    const kpis = await getFinancialKPIs();
    return NextResponse.json(kpis);
  } catch {
    return NextResponse.json({ error: 'Error fetching KPIs' }, { status: 500 });
  }
}
