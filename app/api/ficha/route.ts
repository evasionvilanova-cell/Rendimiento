import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { saveProfile, type Profile } from '@/lib/profile';

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  try {
    await saveProfile((await req.json()) as Profile);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
