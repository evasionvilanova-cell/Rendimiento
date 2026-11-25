import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { getProfile, saveProfile } from '@/lib/profile';

// Pautia redirige aquí con ?link=https://…/api/hoy?id=…&k=… al pulsar «Conectar»
export async function GET(req: Request) {
  const url = new URL(req.url);
  if (!(await isAuthed())) return NextResponse.redirect(new URL('/login', url));
  const link = url.searchParams.get('link') || '';
  if (!/^https:\/\/[^\s/]+\/api\/hoy\?id=[A-Za-z0-9]+&k=[A-Za-z0-9]+$/.test(link)) return NextResponse.redirect(new URL('/ficha?pautia=error', url));
  const p = await getProfile();
  await saveProfile({ ...p, pautia: link });
  return NextResponse.redirect(new URL('/?pautia=ok', url));
}
