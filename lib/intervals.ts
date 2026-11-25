// Cliente mínimo de la API de intervals.icu (https://intervals.icu/api/v1)
// Autenticación: Basic con usuario "API_KEY" y tu clave como contraseña.

export type Wellness = {
  id: string; // fecha YYYY-MM-DD
  ctl?: number | null;
  atl?: number | null;
  hrv?: number | null; // rMSSD nocturno (ms)
  restingHR?: number | null;
  sleepSecs?: number | null;
  sleepScore?: number | null;
  weight?: number | null;
  // Sensaciones: escala 1-4, en intervals.icu 1 = bien, 4 = mal
  soreness?: number | null;
  fatigue?: number | null;
  stress?: number | null;
  mood?: number | null;
  motivation?: number | null;
};

export type Activity = {
  id: string;
  name?: string;
  type?: string;
  start_date_local: string;
  moving_time?: number;
  icu_training_load?: number | null;
  icu_weighted_avg_watts?: number | null;
  icu_intensity?: number | null;
  average_heartrate?: number | null;
  decoupling?: number | null;
  icu_ftp?: number | null;
  distance?: number | null;
  paired_event_id?: number | null;
  description?: string | null;
  max_heartrate?: number | null;
  icu_average_watts?: number | null;
  average_speed?: number | null;
  total_elevation_gain?: number | null;
  icu_rpe?: number | null;
  feel?: number | null;
};

export type PlannedEvent = {
  id: number | string;
  category?: string;
  name?: string;
  description?: string;
  start_date_local: string;
  moving_time?: number | null;
  icu_training_load?: number | null;
};

const BASE = 'https://intervals.icu/api/v1';

function auth() {
  const key = process.env.INTERVALS_API_KEY;
  if (!key) throw new Error('Falta INTERVALS_API_KEY');
  return 'Basic ' + Buffer.from('API_KEY:' + key).toString('base64');
}

function athlete() {
  return process.env.INTERVALS_ATHLETE_ID || '0';
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}/athlete/${athlete()}${path}`, {
    headers: { Authorization: auth() },
    next: { revalidate: 300 },
  });
  if (!res.ok) throw new Error(`intervals.icu respondió ${res.status} en ${path}`);
  return res.json() as Promise<T>;
}

export function hasApiKey() {
  return Boolean(process.env.INTERVALS_API_KEY);
}

export function getWellness(oldest: string, newest: string) {
  return get<Wellness[]>(`/wellness?oldest=${oldest}&newest=${newest}`);
}

export function getActivities(oldest: string, newest: string) {
  return get<Activity[]>(`/activities?oldest=${oldest}&newest=${newest}`);
}

export function getEvents(oldest: string, newest: string) {
  return get<PlannedEvent[]>(`/events?oldest=${oldest}&newest=${newest}`);
}

export async function putWellness(date: string, body: Partial<Wellness>) {
  const res = await fetch(`${BASE}/athlete/${athlete()}/wellness/${date}`, {
    method: 'PUT',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`intervals.icu respondió ${res.status} al guardar`);
  return res.json();
}

// Curva de potencia (mejores vatios por duración). Respuesta: { list: [{ secs: number[], watts|values: number[] }] }
export type PowerCurve = { secs: number[]; watts: number[] };
export async function getPowerCurves(curves: string[], type = 'Ride'): Promise<PowerCurve[]> {
  const raw = await get<unknown>(`/power-curves?curves=${curves.join(',')}&type=${type}`);
  const list = (Array.isArray(raw) ? raw : (raw as { list?: unknown[] })?.list) || [];
  return (list as Record<string, unknown>[]).map((c) => ({
    secs: (c.secs as number[]) || [],
    watts: ((c.watts || c.values) as number[]) || [],
  }));
}

export type NewEvent = { start_date_local: string; category: 'WORKOUT'; type: string; name: string; description?: string; moving_time?: number; external_id?: string };

/** Crea entrenos en el calendario (intervals.icu los manda a Garmin). */
export async function createEvents(events: NewEvent[]) {
  const res = await fetch(`${BASE}/athlete/${athlete()}/events/bulk`, {
    method: 'POST',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify(events),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`intervals.icu respondió ${res.status} al crear los entrenos: ${(await res.text()).slice(0, 200)}`);
  return res.json() as Promise<PlannedEvent[]>;
}

export type Interval = {
  type?: string; label?: string | null; moving_time?: number; elapsed_time?: number; distance?: number;
  average_watts?: number | null; weighted_average_watts?: number | null; average_heartrate?: number | null; max_heartrate?: number | null;
  intensity?: number | null; average_speed?: number | null; average_cadence?: number | null; decoupling?: number | null;
};
export type ActivityDetail = Activity & { icu_intervals?: Interval[] };

export async function getActivity(id: string): Promise<ActivityDetail> {
  const res = await fetch(`${BASE}/activity/${encodeURIComponent(id)}?intervals=true`, { headers: { Authorization: auth() }, next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`intervals.icu respondió ${res.status} al leer el entreno`);
  return res.json() as Promise<ActivityDetail>;
}

export async function getEvent(id: number | string): Promise<PlannedEvent> {
  return get<PlannedEvent>(`/events/${id}`);
}
