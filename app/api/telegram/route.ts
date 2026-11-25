import { NextResponse } from 'next/server';
import { sendMessage, tg, webhookSecret } from '@/lib/telegram';
import { loadData } from '@/lib/data';
import { morningMessage, weeklyMessage } from '@/lib/summary';
import { askCoach } from '@/lib/coach';

export const maxDuration = 60;

// Webhook del bot de Telegram: /hoy, /informe, o cualquier pregunta para el entrenador IA.
export async function POST(req: Request) {
  if (req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret()) return NextResponse.json({ ok: false }, { status: 401 });
  const update = (await req.json()) as { message?: { chat: { id: number }; text?: string } };
  const msg = update.message;
  if (!msg?.text) return NextResponse.json({ ok: true });
  const chatId = msg.chat.id;
  const allowed = process.env.TELEGRAM_CHAT_ID;

  // Solo responde a tu chat. Si aún no está configurado, te dice cuál es tu número de chat.
  if (!allowed || String(chatId) !== String(allowed)) {
    if (!allowed) await sendMessage(chatId, `Tu número de chat es: ${chatId}\nAñádelo en Vercel como TELEGRAM_CHAT_ID.`, false);
    return NextResponse.json({ ok: true });
  }

  const text = msg.text.trim();
  try {
    if (/^\/(start|hoy)\b/i.test(text)) {
      await sendMessage(chatId, morningMessage(await loadData()));
    } else if (/^\/informe\b/i.test(text)) {
      await sendMessage(chatId, weeklyMessage(await loadData()));
    } else {
      await tg('sendChatAction', { chat_id: chatId, action: 'typing' });
      const reply = await askCoach([{ role: 'user', content: text }]);
      const hasPlan = /```entreno/.test(reply);
      await sendMessage(chatId, reply.replace(/```entreno[\s\S]*?```/g, '').trim() + (hasPlan ? '\n\n👉 Abre la pestaña Coach IA de la app para añadir el entreno a tu calendario.' : ''), false);
    }
  } catch (e) {
    await sendMessage(chatId, 'Ha habido un error: ' + (e as Error).message, false);
  }
  return NextResponse.json({ ok: true });
}
