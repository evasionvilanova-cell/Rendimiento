import { NextResponse } from 'next/server';
import { loadData } from '@/lib/data';
import { morningMessage, weeklyMessage } from '@/lib/summary';
import { hasTelegram, sendMessage } from '@/lib/telegram';

export const dynamic = 'force-dynamic';

// Vercel lo ejecuta cada mañana (vercel.json). Los domingos añade el informe semanal.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!hasTelegram() || !chat) return NextResponse.json({ ok: false, error: 'Telegram sin configurar' });
  const data = await loadData();
  await sendMessage(chat, morningMessage(data));
  const dow = new Date(data.today + 'T12:00:00Z').getUTCDay();
  if (dow === 0) await sendMessage(chat, weeklyMessage(data));
  return NextResponse.json({ ok: true });
}
