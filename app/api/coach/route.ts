import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { askCoach, type ChatMsg } from '@/lib/coach';

export const maxDuration = 60;

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const { messages, workoutId } = (await req.json()) as { messages: ChatMsg[]; workoutId?: string };
  const clean = (messages || [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
  if (!clean.length || clean[clean.length - 1].role !== 'user') return NextResponse.json({ error: 'Falta la pregunta' }, { status: 400 });
  try {
    const wid = workoutId && /^[\w-]+$/.test(workoutId) ? workoutId : undefined;
    return NextResponse.json({ reply: await askCoach(clean, wid) });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
