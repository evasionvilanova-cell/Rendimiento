import type { AppData } from './data';
import { addDays } from './dates';

/** TSS previsto por día a partir de los entrenos planificados. */
export function plannedTssByDay(data: AppData): Map<string, number> {
  const m = new Map<string, number>();
  data.upcoming.forEach((e) => {
    if ((e.category || 'WORKOUT') !== 'WORKOUT') return;
    const d = e.start_date_local.slice(0, 10);
    m.set(d, (m.get(d) || 0) + (e.icu_training_load || 0));
  });
  return m;
}

function lastLoad(data: AppData) {
  for (let i = data.wellness.length - 1; i >= 0; i--) {
    const w = data.wellness[i];
    if (w.ctl != null && w.atl != null) return { ctl: w.ctl, atl: w.atl };
  }
  return { ctl: 0, atl: 0 };
}

/**
 * Proyección de fitness, fatiga y forma (TSB) hasta una fecha, suponiendo que
 * haces exactamente lo planificado (los días sin entreno cuentan como descanso).
 */
export function projectLoad(data: AppData, until: string) {
  const plan = plannedTssByDay(data);
  let { ctl, atl } = lastLoad(data);
  const days: { date: string; ctl: number; atl: number; tsb: number; tss: number }[] = [];
  // El CTL/ATL de hoy ya incluye lo hecho hoy, empezamos desde mañana
  for (let d = addDays(data.today, 1); d <= until; d = addDays(d, 1)) {
    const tsb = ctl - atl; // forma con la que empiezas el día
    const tss = plan.get(d) || 0;
    days.push({ date: d, ctl, atl, tsb, tss });
    ctl += (tss - ctl) / 42;
    atl += (tss - atl) / 7;
  }
  return days;
}

export function daysBetween(a: string, b: string) {
  return Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 86400000);
}

/** Consejo de puesta a punto según la forma prevista el día de la carrera. */
export function raceAdvice(tsb: number, daysLeft: number) {
  if (daysLeft <= 0) return '¡Hoy es el día! Calienta bien y disfruta.';
  if (tsb >= 5 && tsb <= 25) return 'Con lo planificado llegarás fresco y en forma. Mantén el plan.';
  if (tsb > 25) return 'Llegarás muy descansado: quizá podrías meter algo más de carga y bajar más tarde.';
  if (daysLeft > 14) return 'Ahora toca cargar. Empieza a bajar la carga unos 10–14 días antes de la carrera.';
  return 'Llegarías cansado: baja el volumen estos días (mantén algo de intensidad corta) para llegar con la forma en positivo.';
}
