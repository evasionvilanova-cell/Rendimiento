import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { FIELDS, getProfile } from '@/lib/profile';
import ProfileForm from '@/components/ProfileForm';
import TabBar from '@/components/TabBar';

export const dynamic = 'force-dynamic';

export default async function Ficha() {
  await requireAuth();
  const p = await getProfile();
  return (
    <main className="phone">
      <div className="header">
        <div className="stack-sm" style={{ gap: 4 }}>
          <Link href="/coach" style={{ fontSize: 13, textDecoration: 'none' }}>← Coach IA</Link>
          <h1>Tu ficha de atleta</h1>
        </div>
      </div>
      <span style={{ fontSize: 14, color: '#C3C7CE' }}>El Coach IA la lee en cada respuesta y en cada análisis. Cuanto más completa, mejores consejos.</span>
      <ProfileForm fields={FIELDS} initial={p as Record<string, string>} />
      <TabBar active="/coach" />
    </main>
  );
}
