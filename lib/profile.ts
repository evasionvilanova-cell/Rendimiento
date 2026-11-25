import { getJSON, putJSON } from './store';

// La ficha se guarda en tu propio intervals.icu, en el registro de bienestar de una fecha fija
// (01/01/2001) que no se usa para nada más. Así no hace falta ninguna base de datos.
const DATE = '2001-01-01';

export type Profile = { objetivos?: string; carreras?: string; disponibilidad?: string; lesiones?: string; preferencias?: string; otros?: string };
export const FIELDS: { key: keyof Profile; label: string; hint: string }[] = [
  { key: 'objetivos', label: 'Objetivos', hint: 'Ej.: bajar de 1h25 en la media, subir FTP a 280 W' },
  { key: 'carreras', label: 'Carreras de la temporada', hint: 'Ej.: Mitja de Vilanova (febrero, objetivo A), cicloturista en mayo (B)' },
  { key: 'disponibilidad', label: 'Tiempo para entrenar', hint: 'Ej.: 8–10 h/semana; entre semana máx. 1h15; sábado salida larga' },
  { key: 'lesiones', label: 'Lesiones y molestias habituales', hint: 'Ej.: tendinitis rotuliana en 2025, sobrecarga de gemelos' },
  { key: 'preferencias', label: 'Preferencias', hint: 'Ej.: prefiero rodillo entre semana; fuerza martes y jueves' },
  { key: 'otros', label: 'Otros datos', hint: 'Ej.: edad, trabajo con turnos, entreno con mi grupo los domingos' },
];

export async function getProfile(): Promise<Profile> {
  return (await getJSON<Profile>(DATE)) || {};
}

export async function saveProfile(p: Profile) {
  const clean: Profile = {};
  FIELDS.forEach((f) => {
    const v = (p[f.key] || '').toString().trim().slice(0, 800);
    if (v) clean[f.key] = v;
  });
  await putJSON(DATE, clean);
}

export function profileText(p: Profile) {
  const lines = FIELDS.filter((f) => p[f.key]).map((f) => `${f.label}: ${p[f.key]}`);
  return lines.length ? lines.join('\n') : '(El atleta aún no ha rellenado su ficha.)';
}
