import { daysBetween, projectLoad, raceAdvice } from '@/lib/plan';
import { longDate } from '@/lib/dates';
import { fmtSigned } from '@/lib/scores';
import type { AppData } from '@/lib/data';
import { LineChart } from './Charts';

export default function RaceCard({ data, race, chart = false }: { data: AppData; race: { name: string; date: string }; chart?: boolean }) {
  const left = daysBetween(data.today, race.date);
  const proj = projectLoad(data, race.date);
  const raceDay = proj[proj.length - 1];
  const tsb = raceDay ? Math.round(raceDay.tsb) : 0;
  const ctl = raceDay ? Math.round(raceDay.ctl) : 0;
  const tone = tsb >= 5 && tsb <= 25 ? '#4ADE80' : tsb < -10 ? '#F87171' : '#F5B83D';
  return (
    <section className="card stack-sm">
      <div className="row">
        <h3>Carrera objetivo</h3>
        <span className="small muted">{longDate(race.date)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap' }}>
        <span className="display" style={{ fontSize: 34, fontWeight: 700 }}>{left === 0 ? '¡Hoy!' : `${left} días`}</span>
        <span style={{ fontSize: 15 }}>{race.name}</span>
      </div>
      {left > 0 && (
        <span style={{ fontSize: 14, color: '#C3C7CE' }}>
          Forma prevista ese día: <b style={{ color: tone }}>{fmtSigned(tsb)}</b> · Fitness {ctl}
        </span>
      )}
      <div className="hint">{raceAdvice(tsb, left)}</div>
      {chart && proj.length > 2 && (
        <>
          <LineChart
            label="Forma prevista (TSB) hasta el día de la carrera"
            height={120}
            min={Math.min(-40, ...proj.map((p) => p.tsb)) - 2}
            max={Math.max(30, ...proj.map((p) => p.tsb)) + 2}
            band={[{ from: 5, to: 25, color: '#4ADE80', opacity: 0.1 }]}
            hlines={[0]}
            series={[{ values: proj.map((p) => p.tsb), color: '#F59E0B' }]}
          />
          <span className="small muted">Forma prevista si haces lo planificado en intervals.icu · franja verde = zona ideal para competir</span>
        </>
      )}
    </section>
  );
}
