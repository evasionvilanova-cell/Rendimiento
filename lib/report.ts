import type { AppData } from './data';
import { addDays } from './dates';
import { scoreDay } from './scores';

type Period = { tss: number; secs: number; sessions: number; sleepH: number | null; hrv: number | null; rhr: number | null; readiness: number | null; ctlStart: number | null; ctlEnd: number | null };

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function period(data: AppData, from: string, to: string): Period {
  const acts = data.activities.filter((a) => {
    const d = a.start_date_local.slice(0, 10);
    return d >= from && d <= to;
  });
  const idx = data.wellness.map((w, i) => ({ w, i })).filter(({ w }) => w.id >= from && w.id <= to);
  const ws = idx.map(({ w }) => w);
  const ctls = ws.map((w) => w.ctl).filter((v): v is number => v != null);
  return {
    tss: Math.round(acts.reduce((s, a) => s + (a.icu_training_load || 0), 0)),
    secs: acts.reduce((s, a) => s + (a.moving_time || 0), 0),
    sessions: acts.length,
    sleepH: avg(ws.map((w) => w.sleepSecs).filter((v): v is number => !!v).map((v) => v / 3600)),
    hrv: avg(ws.map((w) => w.hrv).filter((v): v is number => !!v)),
    rhr: avg(ws.map((w) => w.restingHR).filter((v): v is number => !!v)),
    readiness: avg(idx.map(({ i }) => scoreDay(data.wellness, i).readiness).filter((v): v is number => v != null)),
    ctlStart: ctls.length ? ctls[0] : null,
    ctlEnd: ctls.length ? ctls[ctls.length - 1] : null,
  };
}

/** Informe de los últimos 7 días comparado con los 7 anteriores. */
export function weeklyReport(data: AppData) {
  const end = data.today;
  const start = addDays(end, -6);
  const cur = period(data, start, end);
  const prev = period(data, addDays(start, -7), addDays(start, -1));
  const lines: string[] = [];

  if (cur.tss || prev.tss) {
    const ch = prev.tss ? Math.round(((cur.tss - prev.tss) / prev.tss) * 100) : null;
    lines.push(`Carga: ${cur.tss} TSS en ${cur.sessions} sesiones${ch != null ? ` (${ch >= 0 ? '+' : ''}${ch} % frente a la semana anterior)` : ''}.`);
    if (ch != null && ch > 30) lines.push('Has subido la carga más de un 30 %: vigila el sueño y el HRV los próximos días.');
  }
  if (cur.ctlStart != null && cur.ctlEnd != null) {
    const d = Math.round(cur.ctlEnd - cur.ctlStart);
    lines.push(d > 0 ? `Tu fitness ha subido ${d} puntos.` : d < 0 ? `Tu fitness ha bajado ${-d} puntos (normal en semana de descarga).` : 'Tu fitness se ha mantenido.');
  }
  if (cur.sleepH != null) {
    const need = Number(process.env.SLEEP_NEED_HOURS || 7.5);
    lines.push(cur.sleepH < need - 0.5 ? `Has dormido de media ${fmt(cur.sleepH)} h: por debajo de lo que necesitas.` : `Has dormido de media ${fmt(cur.sleepH)} h: bien.`);
  }
  if (cur.hrv != null && prev.hrv != null) {
    const d = ((cur.hrv - prev.hrv) / prev.hrv) * 100;
    lines.push(d < -5 ? `Tu HRV medio ha bajado un ${fmt(-d)} %: estás acumulando fatiga.` : d > 5 ? `Tu HRV medio ha subido un ${fmt(d)} %: te estás recuperando bien.` : 'Tu HRV se ha mantenido estable.');
  }
  return { start, end, cur, prev, lines };
}

function fmt(n: number) {
  return (Math.round(n * 10) / 10).toLocaleString('es-ES');
}
