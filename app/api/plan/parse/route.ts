import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { parsePlan } from '@/lib/plan-ai';
import { loadData } from '@/lib/data';

export const maxDuration = 60;

const OK = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];

export async function POST(req: Request) {
  if (!(await isAuthed())) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  const form = await req.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return NextResponse.json({ error: 'Falta el archivo' }, { status: 400 });
  if (!OK.includes(file.type)) return NextResponse.json({ error: 'Sube un PDF o una foto (JPG o PNG).' }, { status: 400 });
  if (file.size > 4 * 1024 * 1024) return NextResponse.json({ error: 'El archivo es demasiado grande (máximo 4 MB).' }, { status: 400 });
  try {
    const data = await loadData();
    const ftp = data.activities.find((a) => a.icu_ftp)?.icu_ftp ?? null;
    const base64 = Buffer.from(await file.arrayBuffer()).toString('base64');
    const workouts = await parsePlan({ mime: file.type, base64 }, data.today, ftp, String(form.get('extra') || '').slice(0, 500));
    return NextResponse.json({ workouts });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }
}
