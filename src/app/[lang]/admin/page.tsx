'use client';

import { use } from 'react';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import type { Locale } from '@/lib/i18n';

export default function AdminDashboardPage({ params }: { params: Promise<{ lang: Locale }> }) {
  const { lang } = use(params);
  return <AdminDashboard lang={lang} />;
}
