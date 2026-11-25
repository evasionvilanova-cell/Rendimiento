import { addDays } from './dates';

export type ParsedWorkout = {
  date: string; // YYYY-MM-DD
  type: 'Ride' | 'VirtualRide' | 'Run' | 'Swim' | 'WeightTraining' | 'Walk' | 'Other';
  name: string;
  description: string; // formato de entreno de intervals.icu
  duration_min: number | null;
  notes?: string;
};

const PROMPT = (today: string, ftp: number | null) => `
Eres un asistente que pasa planificaciones de entrenamiento (PDF, Excel exportado o foto) al calendario de intervals.icu.
Hoy es ${today}. El lunes de esta semana es ${mondayOf(today)} y el de la semana que viene es ${addDays(mondayOf(today), 7)}.
${ftp ? `FTP del atleta: ${ftp} W.` : ''}

Lee el documento y devuelve SOLO un JSON con esta forma:
{"workouts":[{"date":"YYYY-MM-DD","type":"Ride|VirtualRide|Run|Swim|WeightTraining|Walk|Other","name":"título corto","duration_min":90,"description":"...","notes":"dudas o aclaraciones, o vacío"}]}

Reglas:
- Una entrada por sesión. Si un día tiene dos sesiones, dos entradas. Los días de descanso no se incluyen.
- Fechas: si el documento pone fechas, úsalas. Si solo pone días de la semana (lunes, martes…), asume la semana que empieza el lunes ${mondayOf(today)} salvo que por el contexto sea claramente la siguiente (${addDays(mondayOf(today), 7)}); si dudas, usa la semana que viene y explícalo en "notes".
- "type": rodillo/indoor = VirtualRide, bici en carretera/MTB = Ride, correr = Run, natación = Swim, gimnasio/fuerza = WeightTraining.
- "description" en el formato de entrenos estructurados de intervals.icu, en español, una línea por paso:
  Calentamiento
  - 15m 55-65%

  Serie principal 3x
  - 12m 88-93%
  - 5m 55%

  Vuelta a la calma
  - 10m 55%
  · Duraciones: 30s, 5m, 1h20m; distancias para correr: 1km, 400mtr.
  · Intensidad de bici: % de FTP (ej. 90-95%) o zonas de potencia (Z2). Si el documento da vatios, pásalos a % de FTP${ftp ? '' : ' solo si conoces el FTP; si no, escribe los vatios tal cual (ej. 250w)'}.
  · Correr: zonas de pulso (Z2 HR), % de pulso umbral (80-85% LTHR) o ritmo (4:30/km Pace) según lo que ponga el documento.
  · Fuerza u otras sesiones sin pasos: describe la sesión en texto normal, sin guiones.
  · Repeticiones: una línea de título que termine en "Nx" (ej. "Series 5x") seguida de los pasos que se repiten.
- Respeta exactamente lo que pone el entrenador. No inventes sesiones ni cambies intensidades. Si algo no se entiende, ponlo en "notes".
`;

function mondayOf(iso: string) {
  const dow = (new Date(iso + 'T12:00:00Z').getUTCDay() + 6) % 7;
  return addDays(iso, -dow);
}

export async function parsePlan(file: { mime: string; base64: string }, today: string, ftp: number | null, extra?: string): Promise<ParsedWorkout[]> {
  if (!process.env.GEMINI_API_KEY) throw new Error('Falta GEMINI_API_KEY en Vercel.');
  const models = [process.env.GEMINI_MODEL || 'gemini-flash-latest', 'gemini-flash-lite-latest'];
  const body = JSON.stringify({
    contents: [
      {
        role: 'user',
        parts: [{ inlineData: { mimeType: file.mime, data: file.base64 } }, { text: PROMPT(today, ftp) + (extra ? `\nIndicaciones del atleta: ${extra}` : '') }],
      },
    ],
    generationConfig: { responseMimeType: 'application/json', maxOutputTokens: 8000, temperature: 0.1 },
  });
  let last = '';
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY as string, 'content-type': 'application/json' },
        body,
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        const text = (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
        return clean(text);
      }
      last = String(res.status);
      if (res.status === 429) break;
      if (res.status !== 503 && res.status !== 500) throw new Error(`La IA respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new Error(last === '429' ? 'Has llegado al límite gratis de la IA de Google. Prueba en un rato.' : 'La IA de Google está saturada. Prueba en un minuto.');
}

const TYPES = ['Ride', 'VirtualRide', 'Run', 'Swim', 'WeightTraining', 'Walk', 'Other'];

function clean(text: string): ParsedWorkout[] {
  let parsed: { workouts?: Partial<ParsedWorkout>[] };
  try {
    parsed = JSON.parse(text.replace(/^```json\s*|```\s*$/g, ''));
  } catch {
    throw new Error('La IA no ha devuelto una planificación válida. Prueba con otra foto o PDF más claro.');
  }
  return (parsed.workouts || [])
    .filter((w) => w.date && /^\d{4}-\d{2}-\d{2}$/.test(w.date) && w.name)
    .map((w) => ({
      date: w.date as string,
      type: (TYPES.includes(w.type as string) ? w.type : 'Other') as ParsedWorkout['type'],
      name: String(w.name).slice(0, 120),
      description: String(w.description || '').slice(0, 4000),
      duration_min: typeof w.duration_min === 'number' ? Math.round(w.duration_min) : null,
      notes: w.notes ? String(w.notes).slice(0, 500) : undefined,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
