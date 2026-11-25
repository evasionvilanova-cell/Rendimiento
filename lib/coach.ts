import { loadData } from './data';
import { coachContext } from './summary';
import { COACH_KNOWLEDGE } from './coach-knowledge';

export type ChatMsg = { role: 'user' | 'assistant'; content: string };

const MODEL = process.env.COACH_MODEL || 'claude-sonnet-5-5';

export function hasCoach() {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.GEMINI_API_KEY);
}

/** Gemini (Google AI Studio) tiene un nivel gratuito con límites de peticiones. */
async function askGemini(system: string, messages: ChatMsg[]) {
  // Si un modelo está saturado (503) se reintenta y se prueba con otro más ligero
  const models = [process.env.GEMINI_MODEL || 'gemini-flash-latest', 'gemini-flash-lite-latest'];
  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: messages.slice(-12).map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: m.content }] })),
    generationConfig: { maxOutputTokens: 1500 },
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
        return (json.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim() || 'No he podido generar una respuesta.';
      }
      last = `${res.status}`;
      if (res.status === 429) throw new Error('Has llegado al límite gratuito de la IA de Google por ahora. Prueba otra vez en un rato.');
      if (res.status !== 503 && res.status !== 500) throw new Error(`La IA respondió ${res.status}: ${(await res.text()).slice(0, 200)}`);
      await new Promise((r) => setTimeout(r, 1500));
    }
  }
  throw new Error(`La IA de Google está saturada ahora mismo (${last}). Vuelve a preguntar en un minuto.`);
}

/** Pregunta al entrenador IA con tus datos de intervals.icu como contexto. */
export async function askCoach(messages: ChatMsg[]): Promise<string> {
  if (!hasCoach()) return 'El entrenador IA aún no está activado: falta añadir GEMINI_API_KEY (gratis) o ANTHROPIC_API_KEY en Vercel.';
  const data = await loadData();
  const system = [
    `Eres el entrenador personal de ${process.env.ATHLETE_NAME || 'Xavi'}, ciclista y corredor que también entrena a otros atletas, así que puedes usar términos técnicos (TSS, CTL, ATL, TSB, FTP, HRV, zonas).`,
    'Respondes en español, de forma directa y práctica, en pocas frases o una lista corta. Basa tus consejos en sus datos reales, que tienes abajo, y di qué dato te lleva a cada conclusión.',
    'No inventes datos que no aparecen. Si falta información, dilo. Si describe dolor fuerte, síntomas de enfermedad o algo médico, recomiéndale consultar a un profesional sanitario.',
    'Sobre nutrición, da orientación general y recuérdale seguir la pauta de su nutricionista.',
    COACH_KNOWLEDGE,
    '',
    '=== SUS DATOS ===',
    coachContext(data),
  ].join('\n');

  if (!process.env.ANTHROPIC_API_KEY) return askGemini(system, messages);

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY as string,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, max_tokens: 1000, system, messages: messages.slice(-12) }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`La IA respondió ${res.status}: ${txt.slice(0, 200)}`);
  }
  const json = (await res.json()) as { content?: { type: string; text?: string }[] };
  return (json.content || []).filter((c) => c.type === 'text').map((c) => c.text).join('\n').trim() || 'No he podido generar una respuesta.';
}
