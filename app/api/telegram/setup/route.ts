import { NextResponse } from 'next/server';
import { isAuthed } from '@/lib/auth';
import { hasTelegram, tg, webhookSecret } from '@/lib/telegram';

// Abre /api/telegram/setup (con sesión iniciada) para conectar el bot con la app.
export async function GET(req: Request) {
  if (!(await isAuthed())) return NextResponse.redirect(new URL('/login', req.url));
  if (!hasTelegram()) return NextResponse.json({ ok: false, error: 'Falta TELEGRAM_BOT_TOKEN en Vercel' });
  const url = new URL('/api/telegram', req.url).toString();
  const r = await tg('setWebhook', { url, secret_token: webhookSecret(), allowed_updates: ['message'] });
  await tg('setMyCommands', { commands: [{ command: 'hoy', description: 'Cómo estoy hoy' }, { command: 'informe', description: 'Informe semanal' }] });
  return NextResponse.json({ ok: r.ok, mensaje: r.ok ? 'Bot conectado. Escríbele /hoy en Telegram.' : r.description });
}
