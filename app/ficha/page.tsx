import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { FIELDS, getProfile } from '@/lib/profile';
import ProfileForm from '@/components/ProfileForm';
import TabBar from '@/components/TabBar';
import { headers } from 'next/headers';

const PAUTIA = process.env.PAUTIA_URL || 'https://menu-equipo.vercel.app';

export const dynamic = 'force-dynamic';

export default async function Ficha() {
  await requireAuth();
  const p = await getProfile();
  const host = (await headers()).get('host') || 'rendimiento-ten.vercel.app';
  return (
    <main className="phone">
      <div className="header">
        <div className="stack-sm" style={{ gap: 4 }}>
          <Link href="/coach" style={{ fontSize: 13, textDecoration: 'none' }}>← Coach IA</Link>
          <h1>Tu ficha de atleta</h1>
        </div>
      </div>
      <span style={{ fontSize: 14, color: '#C3C7CE' }}>El Coach IA la lee en cada respuesta y en cada análisis. Cuanto más completa, mejores consejos.</span>
      <section className="card stack-sm">
        <div className="row"><h3>Pautia (menús del nutricionista)</h3><span className="small" style={{ color: p.pautia ? '#4ADE80' : '#9BA1AB' }}>{p.pautia ? 'Conectada ✓' : 'Sin conectar'}</span></div>
        <span style={{ fontSize: 14, color: '#C3C7CE' }}>Conéctala para ver el menú de cada día en Hoy y que el Coach lo tenga en cuenta.</span>
        <a className="primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }} href={`${PAUTIA}/?conectar=rendimiento&volver=${encodeURIComponent(`https://${host}/api/pautia/conectar`)}`}>
          {p.pautia ? 'Volver a conectar con Pautia' : 'Conectar con Pautia'}
        </a>
      </section>
      <ProfileForm fields={FIELDS.filter((f) => f.key !== 'pautia')} initial={p as Record<string, string>} />
      <TabBar active="/coach" />
    </main>
  );
}
