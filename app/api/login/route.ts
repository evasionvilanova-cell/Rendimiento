import { NextResponse } from 'next/server';
import { COOKIE, token } from '@/lib/auth';

export async function POST(req: Request) {
  const form = await req.formData();
  const pw = String(form.get('password') || '');
  const url = new URL(req.url);
  if (!process.env.APP_PASSWORD || pw !== process.env.APP_PASSWORD) {
    return NextResponse.redirect(new URL('/login?error=1', url), 303);
  }
  const res = NextResponse.redirect(new URL('/', url), 303);
  res.cookies.set(COOKIE, token(), { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 180 });
  return res;
}
