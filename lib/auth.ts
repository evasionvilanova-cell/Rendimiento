import { createHash } from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export const COOKIE = 'rend_auth';

export function token() {
  const pw = process.env.APP_PASSWORD || '';
  return createHash('sha256').update('rendimiento:' + pw).digest('hex');
}

export async function isAuthed() {
  if (!process.env.APP_PASSWORD) return true; // sin contraseña configurada, acceso libre
  const c = await cookies();
  return c.get(COOKIE)?.value === token();
}

export async function requireAuth() {
  if (!(await isAuthed())) redirect('/login');
}
