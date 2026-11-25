import { getProfile } from './profile';
import { getJSON, putJSON } from './store';
import { aiGenerate, hasCoach } from './coach';
import type { AppData } from './data';
import { hm } from './dates';

export type PautiaDay = {
  fecha: string;
  menu: string;
  tipo: { id: string; nombre: string } | null;
  entreno: string;
  comidas: Record<string, { nombre: string; ingredientes: string[]; macros: { p?: number; h?: number; g?: number; kcal?: number } | null }>;
  generado: boolean;
  enlace: string;
  tipos?: { id: string; nombre: string; descripcion?: string; comidas: PautiaDay['comidas'] }[];
  elegido?: string; // por qué se ha elegido este tipo de día (cuando lo elige Rendimiento)
};

export const MEALS: [string, string][] = [
  ['desayuno', 'Desayuno'],
  ['media', 'Media mañana'],
  ['comida', 'Comida'],
  ['merienda', 'Merienda'],
  ['cena', 'Cena'],
];

/** Lee el menú de hoy de Pautia con el enlace privado guardado en tu ficha. */
export async function getPautiaToday(data?: AppData): Promise<PautiaDay | null> {
  const d = await fetchPautia();
  if (!d || !data || (d.tipo && Object.keys(d.comidas).length) || !d.tipos?.length) return d;
  // La semana no está hecha en Pautia: se elige el tipo de día según el entreno de hoy
  const pick = await chooseTipo(d, data);
  const t = d.tipos.find((x) => x.id === pick.id) || d.tipos[0];
  return { ...d, tipo: { id: t.id, nombre: t.nombre }, comidas: t.comidas, elegido: pick.why };
}

const CACHE = '2001-01-04';

async function chooseTipo(d: PautiaDay, data: AppData): Promise<{ id: string; why: string }> {
  const today = data.today;
  const sessions = [
    ...data.planned.map((e) => `Planificado: ${e.name} (${e.type || ''}) ${e.moving_time ? hm(e.moving_time) : ''} ${e.icu_training_load ? e.icu_training_load + ' TSS' : ''} ${(e.description || '').slice(0, 120).replace(/\n/g, ' ')}`),
    ...data.activities.filter((a) => a.start_date_local.slice(0, 10) === today).map((a) => `Hecho: ${a.name} (${a.type}) ${hm(a.moving_time)} ${a.icu_training_load ?? ''} TSS`),
  ];
  const sig = sessions.join('|');
  const cache = (await getJSON<Record<string, { id: string; why: string; sig: string }>>(CACHE)) || {};
  if (cache[today] && cache[today].sig === sig) return cache[today];
  const tipos = d.tipos || [];
  let pick = { id: tipos[0].id, why: 'Tipo de día por defecto.' };
  if (hasCoach()) {
    try {
      const txt = await aiGenerate(
        'Eliges el tipo de día de una pauta nutricional según el entreno del día. Responde SOLO con JSON {"id":"…","why":"frase corta en español"}.',
        [{ role: 'user', content: `Tipos de día de la pauta:\n${tipos.map((t) => `- id ${t.id}: ${t.nombre}${t.descripcion ? ' — ' + t.descripcion : ''}`).join('\n')}\n\nEntreno de hoy:\n${sessions.join('\n') || 'Ninguno (descanso)'}\n\nSi no hay entreno, elige el más suave/recovery.` }],
        200,
      );
      const j = JSON.parse(txt.replace(/^[^{]*/, '').replace(/[^}]*$/, ''));
      if (tipos.some((t) => t.id === j.id)) pick = { id: j.id, why: String(j.why || '').slice(0, 200) };
    } catch {}
  }
  const keep = Object.fromEntries(Object.entries(cache).filter(([k]) => k >= today.slice(0, 8) + '01'));
  keep[today] = { ...pick, sig };
  await putJSON(CACHE, keep).catch(() => {});
  return pick;
}

async function fetchPautia(): Promise<PautiaDay | null> {
  const p = await getProfile();
  const link = p.pautia?.trim();
  if (!link || !/^https:\/\/[^\s]+\/api\/hoy\?id=[A-Za-z0-9]+&k=[A-Za-z0-9]+$/.test(link)) return null;
  try {
    const res = await fetch(link, { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as PautiaDay;
  } catch {
    return null;
  }
}

export function pautiaText(d: PautiaDay | null) {
  if (!d) return 'Sin menú de Pautia conectado.';
  const meals = MEALS.filter(([k]) => d.comidas[k]).map(([k, l]) => {
    const c = d.comidas[k];
    const m = c.macros ? ` (P ${c.macros.p ?? '-'} · HC ${c.macros.h ?? '-'} · G ${c.macros.g ?? '-'} g)` : '';
    return `${l}: ${c.nombre}${m}`;
  });
  return `Tipo de día según la pauta del nutricionista: ${d.tipo?.nombre || 'sin asignar'}${d.elegido ? ` (elegido por la app según el entreno: ${d.elegido})` : ''}${d.entreno ? ` (entreno anotado: ${d.entreno})` : ''}.\n${meals.join('\n') || 'Sin comidas para hoy.'}`;
}
