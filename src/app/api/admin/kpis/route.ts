import { NextResponse } from 'next/server';
import { getFinancialKPIs } from '@/lib/auth';

export async function GET() {
  try {
    const kpis = await getFinancialKPIs();
    return NextResponse.json(kpis);
  } catch (err) {
    return NextResponse.json({ error: 'Error fetching KPIs' }, { status: 500 });
  }
}
