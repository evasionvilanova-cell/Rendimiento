import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { loadData, loadPowerCurves } from '@/lib/data';
import TabBar from '@/components/TabBar';
import { scoreDay, fmtSigned } from '@/lib/scores';
import { hm, shortDate, weekdayShort, addDays } from '@/lib/dates';
import { LineChart, SleepBars, PowerCurveChart, wattsAt } from '@/components/Charts';

export const dynamic = 'force-dynamic';

const DAYS = 42;

export default async function Tendencias() {
  await requireAuth();
  const [data, pc] = await Promise.all([loadData(), loadPowerCurves()]);
  const W = data.wellness;
  const start = Math.max(0, W.length - DAYS);
  const win = W.slice(start);
  const idxs = win.map((_, i) => start + i);
  const scores = idxs.map((i) => scoreDay(W, i));

  // TSS diario a partir de las actividades
  const tssByDay = new Map<string, number>();
  data.activities.forEach((a) => {
    const d = a.start_date_local.slice(0, 10);
    tssByDay.set(d, (tssByDay.get(d) || 0) + (a.icu_training_load || 0));
  });
  const tss = win.map((w) => tssByDay.get(w.id) || 0);
  const week = (from: number, to: number) => {
    let s = 0;
    for (let i = from; i < to; i++) s += tssByDay.get(addDays(data.today, -i)) || 0;
    return Math.round(s);
  };

  const last = W[W.length - 1];
  const lastWith = (k: 'ctl' | 'atl') => [...W].reverse().find((w) => w[k] != null)?.[k] ?? null;
  const ctl = lastWith('ctl');
  const atl = lastWith('atl');
  const ctl6 = win[0]?.ctl;
  const tsb = ctl != null && atl != null ? Math.round(ctl - atl) : null;
  const hrvs = win.map((w) => w.hrv || null);
  const hrv7 = hrvs.map((_, i) => {
    const s = hrvs.slice(Math.max(0, i - 6), i + 1).filter((v): v is number => v != null);
    return s.length ? s.reduce((a, b) => a + b, 0) / s.length : null;
  });
  const hrvBase = W.slice(-61, -1).map((w) => w.hrv).filter((v): v is number => !!v).map(Math.log);
  let range: [number, number] | null = null;
  if (hrvBase.length >= 7) {
    const m = hrvBase.reduce((a, b) => a + b, 0) / hrvBase.length;
    const s = Math.sqrt(hrvBase.reduce((a, b) => a + (b - m) ** 2, 0) / (hrvBase.length - 1));
    range = [Math.exp(m - s), Math.exp(m + s)];
  }
  const hv = hrvs.filter((v): v is number => v != null);
  const need = Number(process.env.SLEEP_NEED_HOURS || 7.5);
  const sleep14 = W.slice(-14).map((w) => (w.sleepSecs ? w.sleepSecs / 3600 : null));
  const lastHrv7 = hrv7[hrv7.length - 1];

  // FTP a lo largo del tiempo (el que tenía cada actividad)
  const ftpPts = [...data.activities].reverse().filter((a) => a.icu_ftp).map((a) => ({ d: a.start_date_local.slice(0, 10), v: a.icu_ftp as number }));
  const ftpNow = ftpPts.length ? ftpPts[ftpPts.length - 1].v : null;
  const ftpFirst = ftpPts.length ? ftpPts[0].v : null;
  const weights = W.slice(-90).map((w) => w.weight || null);
  const wVals = weights.filter((v): v is number => v != null);
  const weightNow = wVals.length ? wVals[wVals.length - 1] : null;
  const DUR = [{ s: 5, l: '5 s' }, { s: 60, l: '1 min' }, { s: 300, l: '5 min' }, { s: 1200, l: '20 min' }, { s: 3600, l: '1 h' }];
  const loadMin = Math.max(0, Math.min(...win.map((w) => Math.min(w.ctl ?? 999, w.atl ?? 999))) - 25);
  const loadMax = Math.max(40, ...win.map((w) => Math.max(w.ctl || 0, w.atl || 0))) * 1.1;
  const first = win[0]?.id || data.today;
  const mid = win[Math.floor(win.length / 2)]?.id || data.today;

  return (
    <main className="page">
      <div className="row" style={{ alignItems: 'center' }}>
        <div className="stack-sm" style={{ gap: 4 }}>
          <Link href="/" style={{ fontSize: 13, textDecoration: 'none' }}>← Hoy</Link>
          <h1>Tendencias</h1>
        </div>
        <span className="muted small">Últimas 6 semanas</span>
      </div>

      {data.demo && <div className="banner">Estás viendo datos de ejemplo. Añade tu clave de intervals.icu en Vercel para ver los tuyos.</div>}

      <div className="kpis">
        <Kpi label="Fitness (CTL)" value={ctl != null ? Math.round(ctl) : '—'} sub={ctl != null && ctl6 != null ? `${ctl - ctl6 >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(ctl - ctl6))} en 6 semanas` : ''} />
        <Kpi label="Fatiga (ATL)" value={atl != null ? Math.round(atl) : '—'} sub={atl != null && ctl != null && atl > ctl * 1.15 ? 'Alta' : 'Normal'} />
        <Kpi label="Forma (TSB)" value={tsb != null ? fmtSigned(tsb) : '—'} sub={tsb == null ? '' : tsb < -25 ? 'Mucha carga' : tsb < -10 ? 'Zona de carga' : tsb > 10 ? 'Fresco' : 'Equilibrado'} />
        <Kpi label="TSS últimos 7 días" value={week(0, 7)} sub={`7 días anteriores ${week(7, 14)}`} />
        <Kpi label="HRV media 7 días" value={lastHrv7 ? `${Math.round(lastHrv7)} ms` : '—'} sub={range && lastHrv7 ? (lastHrv7 < range[0] ? 'Por debajo de tu rango' : 'Dentro de tu rango') : ''} />
      </div>

      <section className="card stack">
        <div className="row">
          <h2>Recuperación, sueño y preparación (%)</h2>
          <div className="legend">
            <span><span style={{ color: '#C8F25A' }}>━</span> Recuperación</span>
            <span><span style={{ color: '#60A5FA' }}>━</span> Sueño</span>
            <span><span style={{ color: '#F59E0B' }}>━</span> Listo para entrenar</span>
          </div>
        </div>
        <LineChart
          label="Porcentajes diarios de recuperación, sueño y preparación"
          height={210}
          min={0}
          max={100}
          hlines={[34, 67]}
          band={[{ from: 67, to: 100, color: '#4ADE80', opacity: 0.05 }, { from: 0, to: 34, color: '#F87171', opacity: 0.06 }]}
          series={[
            { values: scores.map((s) => s.sleep), color: '#60A5FA', width: 2 },
            { values: scores.map((s) => s.recovery), color: '#C8F25A', width: 3 },
            { values: scores.map((s) => s.readiness), color: '#F59E0B', width: 3 },
          ]}
        />
        <div className="axis"><span>{shortDate(first)}</span><span>verde ≥ 67 % · rojo &lt; 34 %</span><span>hoy</span></div>
      </section>

      <section className="card stack">
        <div className="row">
          <h2>Carga de entrenamiento</h2>
          <div className="legend">
            <span><span style={{ color: '#C8F25A' }}>━</span> Fitness (CTL)</span>
            <span><span style={{ color: '#60A5FA' }}>━</span> Fatiga (ATL)</span>
            <span><span style={{ color: '#6B7280' }}>▮</span> TSS diario</span>
          </div>
        </div>
        <LineChart
          label="Fitness, fatiga y TSS diario de las últimas 6 semanas"
          height={260}
          min={loadMin}
          max={loadMax}
          bars={{ values: tss, max: Math.max(100, ...tss), color: '#3A3F48' }}
          series={[
            { values: win.map((w) => w.ctl ?? null), color: '#C8F25A', width: 3 },
            { values: win.map((w) => w.atl ?? null), color: '#60A5FA', width: 3 },
          ]}
        />
        <div className="axis"><span>{shortDate(first)}</span><span>{shortDate(mid)}</span><span>hoy</span></div>
      </section>

      <div className="two">
        <section className="card stack">
          <div className="row"><h2>HRV · 6 semanas</h2><span className="small muted">▬ rango normal · ━ media 7 días</span></div>
          <LineChart
            label="HRV diario y media de 7 días frente a tu rango normal"
            height={180}
            min={Math.min(...hv, range?.[0] ?? 999) - 5}
            max={Math.max(...hv, range?.[1] ?? 0) + 5}
            band={range ? [{ from: range[0], to: range[1], color: '#C8F25A' }] : []}
            series={[{ values: hrvs, color: '#6B7280', width: 1.5 }, { values: hrv7, color: '#C8F25A', width: 3 }]}
          />
        </section>
        <section className="card stack">
          <div className="row"><h2>Sueño · 14 noches</h2><span className="small muted">objetivo {hm(need * 3600)}</span></div>
          <SleepBars hours={sleep14} need={need} label="Horas de sueño de las últimas 14 noches" />
        </section>
      </div>

      <section className="card stack">
        <div className="row">
          <h2>Curva de potencia (ciclismo)</h2>
          <div className="legend">
            <span><span style={{ color: '#C8F25A' }}>━</span> Últimas 6 semanas</span>
            <span><span style={{ color: '#6B7280' }}>━</span> Últimos 6 meses</span>
          </div>
        </div>
        {pc.recent?.watts.length || pc.season?.watts.length ? (
          <>
            <PowerCurveChart
              label="Mejores vatios por duración: últimas 6 semanas frente a los últimos 6 meses"
              curves={[
                ...(pc.season ? [{ ...pc.season, color: '#6B7280', width: 2 }] : []),
                ...(pc.recent ? [{ ...pc.recent, color: '#C8F25A', width: 3 }] : []),
              ]}
            />
            <div className="kpis" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))' }}>
              {DUR.map((d) => {
                const r = wattsAt(pc.recent, d.s);
                const se = wattsAt(pc.season, d.s);
                return (
                  <div key={d.s} className="card tile" style={{ padding: 12 }}>
                    <span className="small muted">{d.l}</span>
                    <span className="v" style={{ fontSize: 22 }}>{r ? `${Math.round(r)} W` : '—'}</span>
                    <span className="small muted">{se ? `mejor 6 m: ${Math.round(se)}` : ''}</span>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <span className="muted small">Aún no hay salidas con potencia en intervals.icu.</span>
        )}
      </section>

      <div className="two">
        <section className="card stack">
          <div className="row"><h2>FTP</h2><span className="small muted">{ftpNow ? `${ftpNow} W` : ''}{ftpNow && ftpFirst && ftpNow !== ftpFirst ? ` · ${ftpNow > ftpFirst ? '+' : ''}${ftpNow - ftpFirst} W en 4 meses` : ''}</span></div>
          {ftpPts.length > 1 ? (
            <LineChart
              label="Evolución del FTP en los últimos 4 meses"
              height={160}
              min={Math.min(...ftpPts.map((p) => p.v)) - 15}
              max={Math.max(...ftpPts.map((p) => p.v)) + 15}
              series={[{ values: ftpPts.map((p) => p.v), color: '#C8F25A' }]}
            />
          ) : (
            <span className="muted small">{ftpNow ? `Tu FTP actual es ${ftpNow} W.` : 'Configura tu FTP en intervals.icu para verlo aquí.'}</span>
          )}
        </section>
        <section className="card stack">
          <div className="row"><h2>Peso · 3 meses</h2><span className="small muted">{weightNow ? `${weightNow.toLocaleString('es-ES')} kg` : ''}{weightNow && ftpNow ? ` · ${(ftpNow / weightNow).toFixed(2).replace('.', ',')} W/kg` : ''}</span></div>
          {wVals.length > 1 ? (
            <LineChart label="Evolución del peso en los últimos 3 meses" height={160} min={Math.min(...wVals) - 1} max={Math.max(...wVals) + 1} series={[{ values: weights, color: '#60A5FA' }]} />
          ) : (
            <span className="muted small">Pésate con una báscula conectada a Garmin (o anota el peso en Garmin Connect) y aparecerá aquí.</span>
          )}
        </section>
      </div>

      <section className="card stack">
        <h2>Últimos entrenos</h2>
        <div className="tablebox">
          <table>
            <thead>
              <tr><th>Fecha</th><th>Entreno</th><th>Duración</th><th>TSS</th><th>NP</th><th>IF</th><th>FC media</th><th>Desacople</th></tr>
            </thead>
            <tbody>
              {data.activities.slice(0, 12).map((a) => {
                const ifv = a.icu_intensity ? (a.icu_intensity > 2 ? a.icu_intensity / 100 : a.icu_intensity) : null;
                const dec = a.decoupling;
                return (
                  <tr key={a.id}>
                    <td>{weekdayShort(a.start_date_local.slice(0, 10))}</td>
                    <td>{a.name || a.type}</td>
                    <td>{hm(a.moving_time)}</td>
                    <td>{a.icu_training_load ?? '—'}</td>
                    <td>{a.icu_weighted_avg_watts ? `${a.icu_weighted_avg_watts} W` : '—'}</td>
                    <td>{ifv ? ifv.toFixed(2).replace('.', ',') : '—'}</td>
                    <td>{a.average_heartrate ? Math.round(a.average_heartrate) : '—'}</td>
                    <td style={{ color: dec == null ? undefined : dec > 5 ? '#F5B83D' : '#4ADE80' }}>{dec != null ? `${dec.toFixed(1).replace('.', ',')} %` : '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {last && <span className="small muted">Datos de intervals.icu · se actualizan cada 5 minutos.</span>}
      </section>

      <TabBar active="/tendencias" />
    </main>
  );
}

function Kpi({ label, value, sub }: { label: string; value: string | number; sub: string }) {
  return (
    <div className="card tile">
      <span className="small muted">{label}</span>
      <span className="v">{value}</span>
      <span className="small muted">{sub}</span>
    </div>
  );
}
