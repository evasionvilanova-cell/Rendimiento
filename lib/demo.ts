import type { Activity, PlannedEvent, Wellness } from './intervals';
import { addDays } from './dates';

// Datos inventados para ver la app funcionando antes de conectar intervals.icu.
export function demoData(today: string): { wellness: Wellness[]; activities: Activity[]; planned: PlannedEvent[] } {
  const days = 100;
  const pat = [70, 0, 90, 60, 100, 40, 170];
  const names = ['Rodaje Z2', 'Descanso', 'Umbral 2 × 20 min', 'Recuperación', 'VO2 5 × 4 min', 'Rodaje suave', 'Salida larga'];
  let ctl = 55;
  let atl = 55;
  const wellness: Wellness[] = [];
  const activities: Activity[] = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(today, i - days + 1);
    const late = i >= days - 14;
    const tss = Math.round(pat[i % 7] * (late ? 1.12 : 1));
    const drop = i >= days - 5 ? (i - (days - 6)) * 2.4 : 0;
    const hrv = 62 + Math.sin(i * 1.7) * 4 + Math.cos(i * 0.9) * 2 - drop;
    wellness.push({
      id: date,
      ctl: Math.round(ctl * 10) / 10,
      atl: Math.round(atl * 10) / 10,
      hrv: i === days - 1 ? 52 : Math.round(hrv),
      restingHR: Math.round(46 + Math.sin(i * 1.3) * 1.2 + (drop ? 1 : 0)),
      sleepSecs: Math.round((7.4 + Math.sin(i * 2.3) * 0.5 - (i >= days - 3 ? 0.9 : 0)) * 3600),
      sleepScore: Math.round(78 + Math.sin(i * 2.3) * 8 - (i >= days - 3 ? 12 : 0)),
    });
    if (tss > 0 && i < days - 1) {
      const dur = Math.round(tss * 55);
      activities.push({
        id: 'demo' + i,
        name: names[i % 7],
        type: i % 7 === 5 ? 'Run' : 'Ride',
        start_date_local: date + 'T09:00:00',
        moving_time: dur,
        icu_training_load: tss,
        icu_weighted_avg_watts: i % 7 === 5 ? null : Math.round(150 + tss * 0.9),
        icu_intensity: i % 7 === 5 ? null : Math.round((0.6 + tss / 600) * 100),
        average_heartrate: Math.round(120 + tss / 6),
        decoupling: Math.round((1 + (tss / 60) + Math.sin(i)) * 10) / 10,
      });
    }
    ctl += (tss - ctl) / 42;
    atl += (tss - atl) / 7;
  }
  activities.reverse();
  const planned: PlannedEvent[] = [
    { id: 1, category: 'WORKOUT', name: 'Rodillo · 3 × 12 min sweet spot', description: '3 × 12 min al 88–93 % FTP, 5 min suaves entre bloques', start_date_local: today + 'T00:00:00', moving_time: 5400, icu_training_load: 95 },
  ];
  return { wellness, activities, planned };
}
