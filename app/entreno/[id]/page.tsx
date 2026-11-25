import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { loadWorkout } from '@/lib/analyze';
import { hm, longDate } from '@/lib/dates';
import Analyze from '@/components/Analyze';
import TabBar from '@/components/TabBar';

export const dynamic = 'force-dynamic';

export default async function Entreno({ params }: { params: Promise<{ id: string }> }) {
  await requireAuth();
  const { id } = await params;
  let w: Awaited<ReturnType<typeof loadWorkout>> | null = null;
  let error = '';
  try {
    w = await loadWorkout(id);
  } catch (e) {
    error = (e as Error).message;
  }
  const a = w?.act;
  const ifv = a?.icu_intensity ? (a.icu_intensity > 2 ? a.icu_intensity / 100 : a.icu_intensity) : null;
  const ints = (a?.icu_intervals || []).filter((i) => (i.moving_time || 0) >= 20);
  return (
    <main className="phone">
      <div className="header">
        <div className="stack-sm" style={{ gap: 4 }}>
          <Link href="/tendencias" style={{ fontSize: 13, textDecoration: 'none' }}>← Entrenos</Link>
          <h1>{a?.name || 'Entreno'}</h1>
          {a && <span className="muted" style={{ fontSize: 13 }}>{longDate(a.start_date_local.slice(0, 10))}</span>}
        </div>
      </div>
      {error && <div className="banner">{error}</div>}
      {a && (
        <>
          <div className="tiles">
            <div className="card tile"><span className="small muted">Duración</span><span className="v">{hm(a.moving_time)}</span><span className="small muted">{a.distance ? `${(a.distance / 1000).toFixed(1).replace('.', ',')} km` : ''}</span></div>
            <div className="card tile"><span className="small muted">TSS</span><span className="v">{a.icu_training_load ?? '—'}</span><span className="small muted">{ifv ? `IF ${ifv.toFixed(2).replace('.', ',')}` : ''}</span></div>
            <div className="card tile"><span className="small muted">Potencia</span><span className="v">{a.icu_weighted_avg_watts ?? '—'} <small>W NP</small></span><span className="small muted">{a.icu_average_watts ? `media ${a.icu_average_watts} W` : ''}</span></div>
            <div className="card tile"><span className="small muted">Pulso</span><span className="v">{a.average_heartrate ? Math.round(a.average_heartrate) : '—'} <small>ppm</small></span><span className="small muted">{a.decoupling != null ? `desacople ${a.decoupling.toFixed(1).replace('.', ',')} %` : ''}</span></div>
          </div>
          {w?.plan && (
            <section className="card stack-sm">
              <h3>Lo que tocaba</h3>
              <span style={{ fontWeight: 600 }}>{w.plan.name}</span>
              {w.plan.description && <span style={{ fontSize: 14, color: '#C3C7CE', whiteSpace: 'pre-line' }}>{w.plan.description}</span>}
            </section>
          )}
          {ints.length > 0 && (
            <section className="card" style={{ padding: '8px 4px' }}>
              <div className="tablebox">
                <table>
                  <thead><tr><th>#</th><th>Tiempo</th><th>W</th><th>% FTP</th><th>FC</th></tr></thead>
                  <tbody>
                    {ints.slice(0, 30).map((i, k) => {
                      const iif = i.intensity ? (i.intensity > 2 ? i.intensity / 100 : i.intensity) : null;
                      return (
                        <tr key={k} style={{ opacity: i.type === 'RECOVERY' ? 0.6 : 1 }}>
                          <td>{k + 1}</td><td>{hm(i.moving_time)}</td><td>{i.average_watts ? Math.round(i.average_watts) : '—'}</td><td>{iif ? `${Math.round(iif * 100)} %` : '—'}</td><td>{i.average_heartrate ? Math.round(i.average_heartrate) : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}
          <Analyze id={id} />
        </>
      )}
      <TabBar active="/tendencias" />
    </main>
  );
}
