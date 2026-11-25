import { requireAuth } from '@/lib/auth';
import { loadData } from '@/lib/data';
import { weeklyReport } from '@/lib/report';
import { hm, shortDate } from '@/lib/dates';
import TabBar from '@/components/TabBar';

export const dynamic = 'force-dynamic';

function Row({ label, cur, prev, unit = '', digits = 0, higherIsBetter = true }: { label: string; cur: number | null; prev: number | null; unit?: string; digits?: number; higherIsBetter?: boolean }) {
  const f = (v: number | null) => (v == null ? '—' : v.toLocaleString('es-ES', { maximumFractionDigits: digits, minimumFractionDigits: digits }) + unit);
  let color: string | undefined;
  if (cur != null && prev != null && Math.abs(cur - prev) > 0.0001) color = (cur > prev) === higherIsBetter ? '#4ADE80' : '#F5B83D';
  return (
    <tr>
      <td>{label}</td>
      <td style={{ color, fontWeight: 600 }}>{f(cur)}</td>
      <td className="muted">{f(prev)}</td>
    </tr>
  );
}

export default async function Informe() {
  await requireAuth();
  const data = await loadData();
  const r = weeklyReport(data);
  return (
    <main className="phone">
      <div className="header">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 13 }}>Del {shortDate(r.start)} al {shortDate(r.end)}</span>
          <h1>Informe semanal</h1>
        </div>
      </div>
      {data.demo && <div className="banner">Estás viendo datos de ejemplo.</div>}

      <section className="card stack-sm">
        <h3>Resumen</h3>
        {r.lines.length ? r.lines.map((l, i) => <p key={i} style={{ margin: 0, fontSize: 15, lineHeight: 1.5 }}>{l}</p>) : <span className="muted">Aún no hay datos suficientes.</span>}
      </section>

      {r.comp.planned > 0 && (
        <section className="card stack-sm">
          <div className="row"><h3>Planificado vs. hecho</h3><span className="small muted">últimos 7 días</span></div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
            <span className="display" style={{ fontSize: 34, fontWeight: 700, color: r.comp.pct >= 85 ? '#4ADE80' : r.comp.pct >= 60 ? '#F5B83D' : '#F87171' }}>{r.comp.pct} %</span>
            <span style={{ fontSize: 14, color: '#C3C7CE' }}>{r.comp.done} de {r.comp.planned} sesiones</span>
          </div>
          <div style={{ height: 10, borderRadius: 5, background: '#262A31' }} aria-hidden="true">
            <div style={{ width: `${Math.min(100, r.comp.pct)}%`, height: 10, borderRadius: 5, background: r.comp.pct >= 85 ? '#4ADE80' : r.comp.pct >= 60 ? '#F5B83D' : '#F87171' }} />
          </div>
          {r.comp.plannedTss > 0 && <span className="small muted">{r.comp.doneTss} de {r.comp.plannedTss} TSS previstos</span>}
        </section>
      )}

      <section className="card" style={{ padding: '8px 4px' }}>
        <div className="tablebox">
          <table>
            <thead>
              <tr><th></th><th>Últimos 7 días</th><th>7 anteriores</th></tr>
            </thead>
            <tbody>
              <Row label="TSS" cur={r.cur.tss} prev={r.prev.tss} />
              <Row label="Sesiones" cur={r.cur.sessions} prev={r.prev.sessions} />
              <tr><td>Horas</td><td style={{ fontWeight: 600 }}>{hm(r.cur.secs)}</td><td className="muted">{hm(r.prev.secs)}</td></tr>
              <Row label="Sueño medio" cur={r.cur.sleepH} prev={r.prev.sleepH} unit=" h" digits={1} />
              <Row label="HRV medio" cur={r.cur.hrv} prev={r.prev.hrv} unit=" ms" />
              <Row label="Pulso reposo" cur={r.cur.rhr} prev={r.prev.rhr} unit=" ppm" higherIsBetter={false} />
              <Row label="Listo para entrenar" cur={r.cur.readiness} prev={r.prev.readiness} unit=" %" />
            </tbody>
          </table>
        </div>
      </section>

      <TabBar active="/informe" />
    </main>
  );
}
