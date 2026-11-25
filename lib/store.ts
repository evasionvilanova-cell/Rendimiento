import { hasApiKey } from './intervals';

// Pequeño almacén dentro de tu propio intervals.icu: guarda JSON en el campo de comentarios
// del registro de bienestar de fechas antiguas que no se usan (años 2000 y 2001).
const BASE = 'https://intervals.icu/api/v1';
const auth = () => 'Basic ' + Buffer.from('API_KEY:' + process.env.INTERVALS_API_KEY).toString('base64');
const athlete = () => process.env.INTERVALS_ATHLETE_ID || '0';

export async function getJSON<T>(date: string): Promise<T | null> {
  if (!hasApiKey()) return null;
  try {
    const res = await fetch(`${BASE}/athlete/${athlete()}/wellness/${date}`, { headers: { Authorization: auth() }, cache: 'no-store' });
    if (!res.ok) return null;
    const w = (await res.json()) as { comments?: string };
    return w.comments ? (JSON.parse(w.comments) as T) : null;
  } catch {
    return null;
  }
}

export async function putJSON(date: string, value: unknown) {
  if (!hasApiKey()) return;
  const res = await fetch(`${BASE}/athlete/${athlete()}/wellness/${date}`, {
    method: 'PUT',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ comments: JSON.stringify(value) }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`intervals.icu respondió ${res.status} al guardar`);
}
