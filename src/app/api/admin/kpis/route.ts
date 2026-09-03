import { NextRequest, NextResponse } from 'next/server';
import { getFinancialKPIs } from '@/lib/auth';
import { adminErrorResponse, requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request, 'view_dashboard');
    const kpis = await getFinancialKPIs();
    return NextResponse.json(kpis);
  } catch (error) {
    return adminErrorResponse(error);
  }
}
