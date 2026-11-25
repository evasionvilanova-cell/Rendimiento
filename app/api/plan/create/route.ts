import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { createEvents, hasApiKey } from '@/lib/intervals';
import type { ParsedWorkout } from '@/lib/plan-ai';

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  if (!hasApiKey()) return NextResponse.json({ error: 'Falta la clave de intervals.icu' }, { status: 400 });
  const { workouts } = (await req.json()) as { workouts: ParsedWorkout[] };
  const valid = (workouts || []).filter((w) => /^\d{4}-\d{2}-\d{2}$/.test(w.date) && w.name).slice(0, 40);
  if (!valid.length) return NextResponse.json({ error: 'No hay entrenos para crear' }, { status: 400 });
  try {
    const created = await createEvents(
      valid.map((w) => ({
        start_date_local: `${w.date}T00:00:00`,
        category: 'WORKOUT',
        type: w.type,
        name: w.name,
        description: w.description,
        ...(w.duration_min && !/^\s*-\s/m.test(w.description) ? { moving_time: w.duration_min * 60 } : {}),
      })),
    );
    return NextResponse.json({ ok: true, count: Array.isArray(created) ? created.length : valid.length });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
