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
