import { requireAuth } from '@/lib/auth';
import { loadData, nextRace } from '@/lib/data';
import { computeToday, fmtSigned } from '@/lib/scores';
import { addDays, hm, weekdayShort } from '@/lib/dates';
import { plannedTssByDay, projectLoad } from '@/lib/plan';
import TabBar from '@/components/TabBar';
import RaceCard from '@/components/RaceCard';

export const dynamic = 'force-dynamic';

export default async function Semana() {
  await requireAuth();
  const data = await loadData();
  const t = computeToday(data.wellness, data.activities, data.today);
  const race = nextRace(data);

  // Semana de lunes a domingo
  const dow = (new Date(data.today + 'T12:00:00Z').getUTCDay() + 6) % 7;
  const monday = addDays(data.today, -dow);
  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i));
  const sunday = days[6];
  const plan = plannedTssByDay(data);
  const proj = projectLoad(data, sunday);
  const tsbOf = new Map(proj.map((p) => [p.date, p.tsb]));

  let doneTss = 0;
  let doneSecs = 0;
  let planTss = 0;
  const rows = days.map((d) => {
    const done = data.activities.filter((a) => a.start_date_local.slice(0, 10) === d);
    const planned = data.upcoming.filter((e) => e.start_date_local.slice(0, 10) === d && (e.category || 'WORKOUT') === 'WORKOUT');
    const dTss = done.reduce((s, a) => s + (a.icu_training_load || 0), 0);
    doneTss += d <= data.today ? dTss : 0;
    doneSecs += done.reduce((s, a) => s + (a.moving_time || 0), 0);
    if (d >= data.today) planTss += plan.get(d) || 0;
    const tsb = tsbOf.get(d);
    let note: string | null = null;
    if (d === data.today) {
      note = t.status === 'rojo' ? 'Hoy toca aflojar: cambia la sesión por algo suave o descansa.' : t.status === 'amarillo' ? 'Hazla sin forzar.' : t.status === 'verde' ? 'Buen día para apretar.' : null;
    } else if (d > data.today && tsb != null && (plan.get(d) || 0) >= 90 && tsb < -25) {
      note = `Llegarás a esta sesión con mucha fatiga (forma ${fmtSigned(Math.round(tsb))}). Valora pasarla a otro día o recortarla.`;
    }
    return { d, done, planned, dTss, note, past: d < data.today, isToday: d === data.today };
  });

  return (
    <main className="phone">
      <div className="header">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 13 }}>Semana del {weekdayShort(monday).toLowerCase()} al {weekdayShort(sunday).toLowerCase()}</span>
          <h1>Tu semana</h1>
        </div>
      </div>
      {data.demo && <div className="banner">Estás viendo datos de ejemplo.</div>}

      <div className="tiles">
        <div className="card tile"><span className="small muted">TSS hecho</span><span className="v">{Math.round(doneTss)}</span><span className="small muted">{hm(doneSecs)} entrenando</span></div>
        <div className="card tile"><span className="small muted">TSS que queda</span><span className="v">{Math.round(planTss)}</span><span className="small muted">según lo planificado</span></div>
      </div>

      <section className="card" style={{ padding: 0 }}>
        {rows.map((r, i) => (
          <div key={r.d} style={{ padding: '14px 16px', borderTop: i ? '1px solid #262A31' : undefined, background: r.isToday ? '#1F232A' : undefined, opacity: r.past ? 0.75 : 1 }} className="stack-sm">
            <div className="row">
              <span style={{ fontWeight: 600, color: r.isToday ? '#C8F25A' : undefined }}>{r.isToday ? 'Hoy' : weekdayShort(r.d)}</span>
              <span className="small muted">
                {r.dTss ? `hecho ${Math.round(r.dTss)} TSS` : ''}
                {r.dTss && plan.get(r.d) ? ' · ' : ''}
                {plan.get(r.d) ? `previsto ${Math.round(plan.get(r.d) || 0)} TSS` : ''}
              </span>
            </div>
            {r.done.map((a) => (
              <span key={a.id} style={{ fontSize: 14 }}>✓ {a.name || a.type} · {hm(a.moving_time)}</span>
            ))}
            {r.planned.map((e) => (
              <span key={e.id} style={{ fontSize: 14, color: '#C3C7CE' }}>
                {r.done.length ? '◦ Previsto: ' : '◦ '}
                {e.name}
                {e.moving_time ? ` · ${hm(e.moving_time)}` : ''}
              </span>
            ))}
            {!r.done.length && !r.planned.length && <span className="small muted">{r.past ? 'Sin entreno' : 'Descanso'}</span>}
            {r.note && <div className="hint">{r.note}</div>}
          </div>
        ))}
      </section>
      <span className="small muted">Los entrenos que planificas en intervals.icu se envían solos a tu Garmin.</span>

      {race ? (
        <RaceCard data={data} race={race} chart />
      ) : (
        <section className="card stack-sm">
          <h3>Carrera objetivo</h3>
          <span style={{ fontSize: 14, color: '#C3C7CE' }}>
            Añade tu próxima carrera en el calendario de intervals.icu como evento de tipo <b>Race</b> (A, B o C) y aquí verás la cuenta atrás y la forma con la que llegarás.
          </span>
        </section>
      )}

      <TabBar active="/semana" />
    </main>
  );
}
