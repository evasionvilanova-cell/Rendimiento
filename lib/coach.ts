import { loadData } from './data';
import { coachContext } from './summary';
import { COACH_KNOWLEDGE } from './coach-knowledge';
import { getProfile, profileText } from './profile';
import { getPautiaToday, pautiaText } from './pautia';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

const MODEL = process.env.COACH_MODEL || 'claude-sonnet-5-5';

export function hasCoach() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);
}

/** Gemini (Google AI Studio) tiene un nivel gratuito con límites de peticiones. */
async function askGemini(system: string, messages: ChatMsg[]) {
  // Si un modelo está saturado (503) se reintenta y se prueba con otro más ligero
  const models = [process.env.GEMINI_MODEL || 'gemini-flash-latest', 'gemini-flash-lite-latest', 'gemma-3-27b-it'];
  let limited = false;
  const contents = messages.slice(-12).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] }));
  // Gemma no admite instrucciones de sistema: se ponen al principio del primer mensaje
  const bodyFor = (model: string) =>
    JSON.stringify(
      model.startsWith('gemma')
        ? { contents: contents.map((c, i) => (i === 0 ? { ...c, parts: [{ text: system + '\n\n=== PREGUNTA ===\n' + c.parts[0].text }] } : c)), generationConfig: { maxOutputTokens: 3000 } }
        : { systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: 3000 } },
    );
  let last = '';
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'x-goog-api-key': process.env.GEMINI_API_KEY as string, 'content-type': 'application/json' },
        body: bodyFor(model),
        cache: 'no-store',
      });
      if (res.ok) {
        const json = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
        return (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim() || 'No he podido generar una respuesta.';
      }
      last = `${res.status}`;
      if (res.status === 429) {
        limited = true;
        break; // límite gratuito de este modelo: probar el siguiente
      }
      if (res.status !== 503 && res.status !== 500) throw new Error(`La IA respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  if (limited) throw new Error('Has llegado al límite de preguntas gratis de Google por ahora (se renueva cada minuto y cada día). Espera un poco y vuelve a preguntar.');
  throw new Error(`La IA de Google está saturada ahora mismo (${last}). Vuelve a preguntar en un minuto.`);
}

/** Pregunta al entrenador IA con tus datos de intervals.icu como contexto. */
export async function askCoach(messages: ChatMsg[], workoutId?: string): Promise<string> {
  if (!hasCoach()) return 'El entrenador IA aún no está activado: falta añadir GEMINI_API_KEY (gratis) o ANTHROPIC_API_KEY en Vercel.';
  const [data, profile, menu] = await Promise.all([loadData(), getProfile(), getPautiaToday()]);
  let workoutTxt = '';
  if (workoutId) {
    const { loadWorkout, describeWorkout } = await import('./analyze');
    const w = await loadWorkout(workoutId);
    workoutTxt = describeWorkout(w.act, w.plan);
  }
  const system = [
    `Eres el entrenador personal de ${process.env.ATHLETE_NAME || 'Xavi'}, ciclista y corredor que también entrena a otros atletas, así que puedes usar términos técnicos (TSS, CTL, ATL, TSB, FTP, HRV, zonas).`,
    'Respondes en español, de forma directa y práctica, en pocas frases o una lista corta. Basa tus consejos en sus datos reales, que tienes abajo, y di qué dato te lleva a cada conclusión.',
    'No inventes datos que no aparecen. Si falta información, dilo. Si describe dolor fuerte, síntomas de enfermedad o algo médico, recomiéndale consultar a un profesional sanitario.',
    'Sobre nutrición, da orientación general y recuérdale seguir la pauta de su nutricionista.',
    COACH_KNOWLEDGE,
    '',
    '=== CREAR ENTRENOS EN SU CALENDARIO ===',
    'Si te pide que le pongas, programes o crees un entreno (o un plan de varios días), descríbelo brevemente y añade AL FINAL un bloque por cada sesión, exactamente así (JSON en una línea):',
    '```entreno',
    '{"date":"YYYY-MM-DD","type":"VirtualRide|Ride|Run|Swim|WeightTraining|Other","name":"Título corto","description":"Calentamiento\\n- 15m 55-65%\\n\\nSerie 3x\\n- 12m 88-93%\\n- 5m 55%\\n\\nVuelta a la calma\\n- 10m 55%"}',
    '```',
    'La description usa el formato de intervals.icu (una línea por paso: duración e intensidad en % FTP, zonas Z2, "Z2 HR" o ritmo "4:30/km Pace"; repeticiones con una línea "Título Nx"). Él verá un botón para añadirlo; no digas que ya está creado. No añadas bloques si no te lo pide.',
    '',
    '=== SU FICHA DE ATLETA ===',
    profileText(profile),
    '',
    ...(workoutTxt
      ? ['=== ESTA CONVERSACIÓN ES SOBRE ESTE ENTRENO CONCRETO ===', 'Céntrate en esta sesión (cómo fue, series, pulso, vatios, ritmo, qué mejorar, cómo recuperar). Usa el resto de sus datos solo como contexto.', workoutTxt, '']
      : []),
    '=== MENÚ DE HOY (PAUTIA, según su nutricionista) ===',
    pautiaText(menu),
    '',
    '=== SUS DATOS ===',
    coachContext(data),
  ].join('\n');

  return aiGenerate(system, messages);
}

/** Llama a la IA configurada (Claude si hay ANTHROPIC_API_KEY, si no Gemini gratis). */
export async function aiGenerate(system: string, messages: ChatMsg[], maxTokens = 1000): Promise<string> {
  if (!hasCoach()) throw new Error('Falta GEMINI_API_KEY o ANTHROPIC_API_KEY en Vercel.');
  if (!process.env.ANTHROPIC_API_KEY) return askGemini(system, messages);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, system, messages: messages.slice(-12) }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`La IA respondió ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (json.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim() || 'No he podido generar una respuesta.';
}
