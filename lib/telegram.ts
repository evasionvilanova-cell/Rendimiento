import { createHash } from 'crypto';

export function hasTelegram() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN);
}

/** Secreto que Telegram envía en cada aviso al webhook (derivado del token, así no hay que configurar nada más). */
export function webhookSecret() {
  return createHash('sha256').update('tg:' + (process.env.TELEGRAM_BOT_TOKEN || '')).digest('hex').slice(0, 48);
}

export async function tg(method: string, body: Record<string, unknown>) {
  const res = await fetch(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    cache: 'no-store',
  });
  return res.json() as Promise<{ ok: boolean; description?: string; result?: unknown }>;
}

export function sendMessage(chatId: string | number, text: string, html = true) {
  return tg('sendMessage', { chat_id: chatId, text: text.slice(0, 4000), ...(html ? { parse_mode: 'HTML' } : {}), disable_web_page_preview: true });
}
