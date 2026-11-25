import { getJSON, putJSON } from './store';
import type { ChatMsg } from './coach';

// Chat general en 2001-01-02. Chats de cada entreno en 2000-MM-DD (mes y día del entreno), por id.
const GENERAL = '2001-01-02';
const dayKey = (activityDate: string) => `2000-${activityDate.slice(5, 10)}`;
const trim = (m: ChatMsg[]) => m.slice(-24).map((x) => ({ role: x.role, content: x.content.slice(0, 3000) }));

export async function loadChat(workout?: { id: string; date: string }): Promise<ChatMsg[]> {
  if (!workout) return (await getJSON<ChatMsg[]>(GENERAL)) || [];
  const map = (await getJSON<Record<string, ChatMsg[]>>(dayKey(workout.date))) || {};
  return map[workout.id] || [];
}

export async function saveChat(msgs: ChatMsg[], workout?: { id: string; date: string }) {
  if (!workout) return putJSON(GENERAL, trim(msgs));
  const key = dayKey(workout.date);
  const map = (await getJSON<Record<string, ChatMsg[]>>(key)) || {};
  map[workout.id] = trim(msgs);
  return putJSON(key, map);
}
