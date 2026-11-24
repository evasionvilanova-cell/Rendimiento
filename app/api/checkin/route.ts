import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { hasApiKey, putWellness } from '@/lib/intervals';
import { todayISO } from '@/lib/dates';

const FIELDS = ['soreness', 'fatigue', 'stress', 'motivation'] as const;

// Guarda tus sensaciones de la mañana en el registro de bienestar de intervals.icu.
// En la app 4 = muy bien; intervals.icu usa 1 = muy bien, así que se invierte.
export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const body = (await req.json()) as Record<string, number>;
  const out: Record<string, number> = {};
  for (const f of FIELDS) {
    const v = Number(body[f]);
    if (v >= 1 && v <= 4) out[f] = 5 - v;
  }
  if (!hasApiKey()) return NextResponse.json({ ok: true, demo: true });
  try {
    await putWellness(todayISO(), out);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
