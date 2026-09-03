import { NextRequest, NextResponse } from 'next/server';
import { adminErrorResponse, requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const admin = await requireAdmin(request, 'view_dashboard');
    return NextResponse.json({ admin });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
