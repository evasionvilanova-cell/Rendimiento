import { getActivities, getEvents, getPowerCurves, getWellness, hasApiKey, type Activity, type PlannedEvent, type PowerCurve, type Wellness } from './intervals';
import { addDays, todayISO } from './dates';
import { demoData, demoPowerCurves } from './demo';

export type AppData = {
  today: string;
  demo: boolean;
  wellness: Wellness[]; // ascendente, último = hoy
  activities: Activity[]; // descendente (más reciente primero)
  planned: PlannedEvent[]; // entrenos previstos para hoy
  upcoming: PlannedEvent[]; // todo lo planificado desde hoy hasta dentro de 6 meses
  past: PlannedEvent[]; // lo planificado en las últimas 2 semanas (para comparar con lo hecho)
  error?: string;
};

export async function loadData(): Promise<AppData> {
  const today = todayISO();
  if (!hasApiKey()) return { today, demo: true, ...demoData(today) };

  try {
    const [w, a, e] = await Promise.all([
      getWellness(addDays(today, -120), today),
      getActivities(addDays(today, -120), today),
      getEvents(addDays(today, -14), addDays(today, 180)),
    ]);
    const wellness = [...w].sort((x, y) => x.id.localeCompare(y.id));
    if (!wellness.length || wellness[wellness.length - 1].id !== today) wellness.push({ id: today });
    const activities = [...a].sort((x, y) => y.start_date_local.localeCompare(x.start_date_local));
    const all = [...e].sort((x, y) => x.start_date_local.localeCompare(y.start_date_local));
    const upcoming = all.filter((ev) => ev.start_date_local.slice(0, 10) >= today);
    const past = all.filter((ev) => ev.start_date_local.slice(0, 10) < today);
    const planned = upcoming.filter((ev) => ev.start_date_local.slice(0, 10) === today && (ev.category || 'WORKOUT') === 'WORKOUT');
    return { today, demo: false, wellness, activities, planned, upcoming, past };
  } catch (err) {
    return { today, demo: true, ...demoData(today), error: (err as Error).message };
  }
}

/** Curvas de potencia: últimas 6 semanas y últimos 6 meses. */
export async function loadPowerCurves(): Promise<{ recent: PowerCurve | null; season: PowerCurve | null; demo: boolean }> {
  if (!hasApiKey()) return { ...demoPowerCurves(), demo: true };
  try {
    const [recent, season] = await getPowerCurves(['42d', '180d']);
    return { recent: recent || null, season: season || null, demo: false };
  } catch {
    return { recent: null, season: null, demo: false };
  }
}

/** Carrera objetivo: la próxima carrera del calendario de intervals.icu, o la de las variables RACE_NAME / RACE_DATE. */
export function nextRace(data: AppData): { name: string; date: string } | null {
  const ev = data.upcoming.find((e) => (e.category || '').startsWith('RACE'));
  if (ev) return { name: ev.name || 'Carrera', date: ev.start_date_local.slice(0, 10) };
  const d = process.env.RACE_DATE;
  if (d && d >= data.today) return { name: process.env.RACE_NAME || 'Carrera objetivo', date: d };
  return null;
}
