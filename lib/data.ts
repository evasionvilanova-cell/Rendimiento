import { getActivities, getEvents, getWellness, hasApiKey, type Activity, type PlannedEvent, type Wellness } from './intervals';
import { addDays, todayISO } from './dates';
import { demoData } from './demo';

export type AppData = {
  today: string;
  demo: boolean;
  wellness: Wellness[]; // ascendente, último = hoy
  activities: Activity[]; // descendente (más reciente primero)
  planned: PlannedEvent[]; // entrenos previstos para hoy
  error?: string;
};

export async function loadData(): Promise<AppData> {
  const today = todayISO();
  if (!hasApiKey()) return { today, demo: true, ...demoData(today) };

  try {
    const [w, a, e] = await Promise.all([
      getWellness(addDays(today, -100), today),
      getActivities(addDays(today, -45), today),
      getEvents(today, today),
    ]);
    const wellness = [...w].sort((x, y) => x.id.localeCompare(y.id));
    if (!wellness.length || wellness[wellness.length - 1].id !== today) wellness.push({ id: today });
    const activities = [...a].sort((x, y) => y.start_date_local.localeCompare(x.start_date_local));
    const planned = e.filter((ev) => (ev.category || 'WORKOUT') === 'WORKOUT');
    return { today, demo: false, wellness, activities, planned };
  } catch (err) {
    return { today, demo: true, ...demoData(today), error: (err as Error).message };
  }
}
