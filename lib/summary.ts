import type { AppData } from './data';
import { nextRace } from './data';
import { computeToday, fmtH, fmtSigned } from './scores';
import { addDays, hm, longDate, weekdayShort } from './dates';
import { daysBetween, projectLoad } from './plan';
import { weeklyReport } from './report';

const ICON = { verde: '🟢', amarillo: '🟡', rojo: '🔴' } as const;
const TAG = { verde: 'APRIETA', amarillo: 'MANTÉN', rojo: 'AFLOJA' } as const;

/** Mensaje corto de la mañana (Telegram). */
export function morningMessage(data: AppData) {
  const t = computeToday(data.wellness, data.activities, data.today);
  const plan = data.planned[0];
  const lines = [
    `<b>${longDate(data.today)}</b>`,
    t.status ? `${ICON[t.status]} <b>HOY: ${TAG[t.status]}</b> · ${t.headline}` : 'Aún no han llegado los datos de esta noche.',
    '',
    `Recuperación ${t.recovery ?? '—'}% · Sueño ${t.sleep ?? '—'}% · Listo ${t.readiness ?? '—'}%`,
    ...t.reasons.map((r) => `${r.tone === 'bien' ? '✅' : r.tone === 'regular' ? '⚠️' : '❗'} ${r.text}`),
  ];
  if (plan) lines.push('', `🏋️ ${plan.name}${plan.moving_time ? ` · ${hm(plan.moving_time)}` : ''}${plan.icu_training_load ? ` · ${plan.icu_training_load} TSS` : ''}`);
  const race = nextRace(data);
  if (race) lines.push(`🏁 ${race.name}: faltan ${daysBetween(data.today, race.date)} días`);
  return lines.join('\n');
}

export function weeklyMessage(data: AppData) {
  const r = weeklyReport(data);
  return ['<b>📊 Informe semanal</b>', ...r.lines].join('\n');
}

/** Contexto con tus datos para el entrenador IA. */
export function coachContext(data: AppData) {
  const t = computeToday(data.wellness, data.activities, data.today);
  const race = nextRace(data);
  const w14 = data.wellness.slice(-14).map(
    (w) =>
      `${w.id}: HRV ${w.hrv ?? '-'} · FC reposo ${w.restingHR ?? '-'} · sueño ${w.sleepSecs ? fmtH(w.sleepSecs) : '-'}${w.sleepScore ? ` (nota ${w.sleepScore})` : ''} · CTL ${w.ctl != null ? Math.round(w.ctl) : '-'} · ATL ${w.atl != null ? Math.round(w.atl) : '-'}${w.weight ? ` · peso ${w.weight}` : ''}`,
  );
  const acts = data.activities.slice(0, 14).map((a) => {
    const ifv = a.icu_intensity ? (a.icu_intensity > 2 ? a.icu_intensity / 100 : a.icu_intensity) : null;
    return `${a.start_date_local.slice(0, 10)}: ${a.name || a.type} (${a.type}) · ${hm(a.moving_time)} · TSS ${a.icu_training_load ?? '-'}${a.icu_weighted_avg_watts ? ` · NP ${a.icu_weighted_avg_watts} W` : ''}${ifv ? ` · IF ${ifv.toFixed(2)}` : ''}${a.average_heartrate ? ` · FC ${Math.round(a.average_heartrate)}` : ''}${a.decoupling != null ? ` · desacople ${a.decoupling}%` : ''}`;
  });
  const end = addDays(data.today, 13);
  const plan = data.upcoming
    .filter((e) => e.start_date_local.slice(0, 10) <= end)
    .map((e) => `${weekdayShort(e.start_date_local.slice(0, 10))} ${e.start_date_local.slice(0, 10)}: [${e.category}] ${e.name || ''}${e.icu_training_load ? ` · ${e.icu_training_load} TSS` : ''}${e.description ? ` — ${e.description.slice(0, 160).replace(/\n/g, ' ')}` : ''}`);
  let raceTxt = 'Sin carrera objetivo en el calendario.';
  if (race) {
    const p = projectLoad(data, race.date);
    const last = p[p.length - 1];
    raceTxt = `${race.name} el ${race.date} (faltan ${daysBetween(data.today, race.date)} días). Forma prevista ese día con lo planificado: ${last ? fmtSigned(Math.round(last.tsb)) : '-'}.`;
  }
  const ftp = data.activities.find((a) => a.icu_ftp)?.icu_ftp;
  return [
    `Hoy es ${longDate(data.today)} (${data.today}).`,
    `Porcentajes de hoy: recuperación ${t.recovery ?? '-'}%, sueño ${t.sleep ?? '-'}%, listo para entrenar ${t.readiness ?? '-'}%, semáforo ${t.status ?? 'sin datos'}.`,
    `Rango normal de HRV: ${t.hrvRange ? t.hrvRange.join('–') + ' ms' : 'aún sin calcular'}. Forma (TSB) hoy: ${t.tsb ?? '-'}. FTP: ${ftp ? ftp + ' W' : 'desconocido'}.`,
    `Motivos: ${t.reasons.map((r) => r.text).join('; ')}.`,
    '',
    'Bienestar últimos 14 días:',
    ...w14,
    '',
    'Últimos entrenos:',
    ...(acts.length ? acts : ['(ninguno)']),
    '',
    'Planificado próximas 2 semanas:',
    ...(plan.length ? plan : ['(nada planificado)']),
    '',
    `Carrera: ${raceTxt}`,
  ].join('\n');
}
