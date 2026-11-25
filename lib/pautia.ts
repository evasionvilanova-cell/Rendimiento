import { getProfile } from './profile';

export type PautiaDay = {
  fecha: string;
  menu: string;
  tipo: { id: string; nombre: string } | null;
  entreno: string;
  comidas: Record<string, { nombre: string; ingredientes: string[]; macros: { p?: number; h?: number; g?: number; kcal?: number } | null }>;
  generado: boolean;
  enlace: string;
};

export const MEALS: [string, string][] = [
  ['desayuno', 'Desayuno'],
  ['media', 'Media mañana'],
  ['comida', 'Comida'],
  ['merienda', 'Merienda'],
  ['cena', 'Cena'],
];

/** Lee el menú de hoy de Pautia con el enlace privado guardado en tu ficha. */
export async function getPautiaToday(): Promise<PautiaDay | null> {
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
  return `Tipo de día según la pauta del nutricionista: ${d.tipo?.nombre || 'sin asignar'}${d.entreno ? ` (entreno anotado: ${d.entreno})` : ''}.\n${meals.join('\n') || 'Sin comidas para hoy.'}`;
}
