import { NextRequest, NextResponse } from 'next/server';
import { adminErrorResponse, getAdminDatabase, requireAdmin } from '@/lib/admin-auth';

export async function GET(request: NextRequest) {
  try {
    await requireAdmin(request, 'manage_quotes');
    const db = getAdminDatabase();
    const { data, error } = await db.from('custom_requests')
      .select('id,request_number,customer_name,customer_email,customer_phone,project_name,description,desired_size,quantity,colors,material,deadline,budget,status,files,admin_notes,updated_by_user_id,created_at,updated_at')
      .order('created_at', { ascending: false });
    if (error) throw new Error(`Could not list custom requests: ${error.code}`);
    return NextResponse.json({ quotes: data || [] });
  } catch (error) {
    return adminErrorResponse(error);
  }
}
