import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { askCoach, type ChatMsg } from '@/lib/coach';
import { loadChat, saveChat } from '@/lib/chats';
import { getActivity } from '@/lib/intervals';

async function workoutRef(id?: string) {
  if (!id || !/^[\w-]+$/.test(id)) return undefined;
  try {
    const a = await getActivity(id);
    return { id, date: a.start_date_local.slice(0, 10) };
  } catch {
    return undefined;
  }
}

// Devuelve la conversación guardada (general o de un entreno)
export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const w = await workoutRef(new URL(req.url).searchParams.get('workoutId') || undefined);
  return NextResponse.json({ messages: await loadChat(w) });
}

// Borra la conversación
export async function DELETE(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const w = await workoutRef(new URL(req.url).searchParams.get('workoutId') || undefined);
  await saveChat([], w).catch(() => {});
  return NextResponse.json({ ok: true });
}

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
    const reply = await askCoach(clean, wid);
    // Se guarda en tu intervals.icu para verla igual en el móvil y en el ordenador
    try {
      await saveChat([...clean, { role: 'assistant', content: reply }], await workoutRef(wid));
    } catch {}
    return NextResponse.json({ reply });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
