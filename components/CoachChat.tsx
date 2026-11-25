'use client';

import { useEffect, useRef, useState } from 'react';

type Msg = { role: 'user' | 'assistant'; content: string };

// Muestra negritas (**así**) y cursivas (*así*) de las respuestas
function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*\n]+\*)/g);
  return (
    <>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : p.startsWith('*') && p.endsWith('*') && p.length > 2 ? <em key={i}>{p.slice(1, -1)}</em> : <span key={i}>{p.replace(/^- /gm, '• ')}</span>,
      )}
    </>
  );
}

const SUGGESTIONS = ['¿Hago las series hoy o mejor mañana?', '¿Por qué me ha bajado el HRV?', '¿Cómo voy para la carrera?', '¿Qué tal ha ido la semana?'];

export default function CoachChat({ enabled }: { enabled: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('coach-chat');
      if (saved) setMsgs(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('coach-chat', JSON.stringify(msgs.slice(-30)));
    } catch {}
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [msgs]);

  async function send(q: string) {
    if (!q.trim() || busy) return;
    const next: Msg[] = [...msgs, { role: 'user', content: q.trim() }];
    setMsgs(next);
    setText('');
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/coach', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: next }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error');
      setMsgs([...next, { role: 'assistant', content: j.reply }]);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!enabled) {
    return (
      <section className="card stack-sm">
        <h3>Entrenador IA desactivado</h3>
        <span style={{ fontSize: 14, color: '#C3C7CE' }}>Falta añadir la clave GEMINI_API_KEY (gratis, de Google AI Studio) en Vercel. Pídele a Claude que te guíe.</span>
      </section>
    );
  }

  return (
    <div className="stack">
      {!msgs.length && (
        <div className="stack-sm">
          <span className="small muted">Pregúntale lo que quieras. Ve tus datos de sueño, HRV, carga y entrenos.</span>
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" className="pill" style={{ textAlign: 'left', padding: '0 14px' }} onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}
      {msgs.map((m, i) => (
        <div key={i} className="card" style={{ background: m.role === 'user' ? '#262A31' : '#181B20', alignSelf: m.role === 'user' ? 'flex-end' : 'stretch', maxWidth: m.role === 'user' ? '85%' : undefined, whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.5 }}>
          {m.role === 'assistant' ? <Rich text={m.content} /> : m.content}
        </div>
      ))}
      {busy && <span className="small muted">Pensando…</span>}
      {err && <span className="small bad">{err}</span>}
      <div ref={end} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(text);
        }}
        style={{ display: 'flex', gap: 8 }}
      >
        <label htmlFor="q" className="small muted" style={{ position: 'absolute', left: -9999 }}>Pregunta</label>
        <input id="q" value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe tu pregunta…" style={{ flex: 1, height: 48, borderRadius: 12, border: '1px solid #333842', background: '#12151A', color: '#F2F3F5', padding: '0 14px', fontSize: 16 }} />
        <button type="submit" className="primary" style={{ padding: '0 18px' }} disabled={busy || !text.trim()}>Enviar</button>
      </form>
      {msgs.length > 0 && (
        <button type="button" className="pill" onClick={() => setMsgs([])}>Nueva conversación</button>
      )}
    </div>
  );
}
