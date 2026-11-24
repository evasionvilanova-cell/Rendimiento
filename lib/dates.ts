const TZ = process.env.TZ_APP || 'Europe/Madrid';

export function todayISO(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function longDate(iso: string): string {
  const s = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function shortDate(iso: string): string {
  return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));
}

export function weekdayShort(iso: string): string {
  const s = new Intl.DateTimeFormat('es-ES', { weekday: 'short', day: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function hm(secs: number | null | undefined): string {
  if (!secs) return '—';
  const t = Math.round(secs / 60);
  const h = Math.floor(t / 60);
  const m = t % 60;
  return h ? `${h} h ${String(m).padStart(2, '0')} min` : `${m} min`;
}
