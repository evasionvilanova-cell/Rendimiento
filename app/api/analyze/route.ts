import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { analyzeWorkout } from '@/lib/analyze';

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { id } = (await req.json()) as { id: string };
  if (!id || !/^[\w-]+$/.test(id)) return NextResponse.json({ error: 'Entreno no válido' }, { status: 400 });
  try {
    return NextResponse.json({ text: await analyzeWorkout(id) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
