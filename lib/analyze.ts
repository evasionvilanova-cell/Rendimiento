import { getActivity, getEvent, hasApiKey, type ActivityDetail, type PlannedEvent } from './intervals';
import { aiGenerate } from './coach';
import { COACH_KNOWLEDGE } from './coach-knowledge';
import { hm } from './dates';

export async function loadWorkout(id: string): Promise<{ act: ActivityDetail; plan: PlannedEvent | null }> {
  if (!hasApiKey()) throw new Error('Sin datos de intervals.icu');
  const act = await getActivity(id);
  let plan: PlannedEvent | null = null;
  if (act.paired_event_id) {
    try {
      plan = await getEvent(act.paired_event_id);
    } catch {}
  }
  return { act, plan };
}

const ifOf = (v?: number | null) => (v ? (v > 2 ? v / 100 : v) : null);

export function describeWorkout(act: ActivityDetail, plan: PlannedEvent | null) {
  const pace = (mps?: number | null) => {
    if (!mps) return '';
    const s = 1000 / mps;
    return `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}/km`;
  };
  const run = /run/i.test(act.type || '');
  const lines = [
    `Entreno: ${act.name} (${act.type}) el ${act.start_date_local.slice(0, 10)}. Duración ${hm(act.moving_time)}${act.distance ? `, ${(act.distance / 1000).toFixed(1)} km` : ''}${act.total_elevation_gain ? `, +${Math.round(act.total_elevation_gain)} m` : ''}.`,
    `TSS ${act.icu_training_load ?? '-'} · NP ${act.icu_weighted_avg_watts ?? '-'} W · media ${act.icu_average_watts ?? '-'} W · IF ${ifOf(act.icu_intensity)?.toFixed(2) ?? '-'} · FTP ${act.icu_ftp ?? '-'} · FC media ${act.average_heartrate ? Math.round(act.average_heartrate) : '-'} · FC máx ${act.max_heartrate ?? '-'} · desacople ${act.decoupling ?? '-'}%${run && act.average_speed ? ` · ritmo medio ${pace(act.average_speed)}` : ''}${act.icu_rpe ? ` · RPE ${act.icu_rpe}` : ''}.`,
  ];
  if (act.description) lines.push(`Notas del atleta: ${act.description.slice(0, 500)}`);
  const ints = (act.icu_intervals || []).filter((i) => (i.moving_time || 0) >= 20);
  if (ints.length) {
    lines.push('Intervalos detectados:');
    ints.slice(0, 40).forEach((i, k) =>
      lines.push(
        `${k + 1}. ${i.type || ''}${i.label ? ` "${i.label}"` : ''} ${hm(i.moving_time)}${i.average_watts ? ` · ${Math.round(i.average_watts)} W` : ''}${ifOf(i.intensity) ? ` (${Math.round((ifOf(i.intensity) as number) * 100)}% FTP)` : ''}${i.average_heartrate ? ` · FC ${Math.round(i.average_heartrate)}` : ''}${i.max_heartrate ? `/${Math.round(i.max_heartrate)}` : ''}${run && i.average_speed ? ` · ${pace(i.average_speed)}` : ''}${i.average_cadence ? ` · cad ${Math.round(i.average_cadence)}` : ''}`,
      ),
    );
  }
  if (plan) lines.push('', `Entreno PLANIFICADO por su entrenador: ${plan.name}${plan.icu_training_load ? ` (TSS previsto ${plan.icu_training_load})` : ''}`, plan.description || '(sin descripción)');
  else lines.push('', 'No había entreno planificado enlazado a esta sesión.');
  return lines.join('\n');
}

export async function analyzeWorkout(id: string) {
  const { act, plan } = await loadWorkout(id);
  const system = [
    `Eres el entrenador de ${process.env.ATHLETE_NAME || 'Xavi'}. Analizas una sesión ya hecha. Respondes en español, breve y concreto:`,
    '1) Veredicto en una frase. 2) Cumplimiento: si hay plan, compara serie a serie (duración, vatios/ritmo, pulso) y di qué se clavó y qué no. 3) Señales fisiológicas: deriva de pulso, desacople, fatiga en las últimas series, ritmo/cadencia. 4) Qué ajustar la próxima vez (1–2 puntos).',
    'Usa solo los datos que tienes. Si faltan (p. ej. sin potencia), dilo y analiza con pulso o ritmo.',
    COACH_KNOWLEDGE,
  ].join('\n');
  return aiGenerate(system, [{ role: 'user', content: describeWorkout(act, plan) }], 1200);
}
