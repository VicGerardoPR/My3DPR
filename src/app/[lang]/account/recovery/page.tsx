import type { Metadata } from 'next';
import { PasswordRecovery } from '@/components/admin/PasswordRecovery';
export const metadata: Metadata = { title: 'Configurar contraseña', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default function RecoveryPage() { return <PasswordRecovery />; }
