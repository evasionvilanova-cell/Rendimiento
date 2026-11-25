'use client';

import { useEffect, useState } from 'react';

function Rich({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return <>{parts.map((p, i) => (p.startsWith('**') && p.endsWith('**') ? <strong key={i}>{p.slice(2, -2)}</strong> : <span key={i}>{p.replace(/^[-*] /gm, '• ')}</span>))}</>;
}

export default function Analyze({ id }: { id: string }) {
  const key = 'analisis-' + id;
  const [text, setText] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => {
    try {
      setText(localStorage.getItem(key));
    } catch {}
  }, [key]);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error');
      setText(j.text);
      try {
        localStorage.setItem(key, j.text);
      } catch {}
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card stack-sm">
      <div className="row">
        <h3>Análisis del entrenador IA</h3>
        {text && !busy && <button type="button" className="pill" style={{ height: 36, padding: '0 12px' }} onClick={run}>Repetir</button>}
      </div>
      {text ? <div style={{ whiteSpace: 'pre-wrap', fontSize: 15, lineHeight: 1.5 }}><Rich text={text} /></div> : !busy && <button type="button" className="primary" onClick={run}>Analizar este entreno</button>}
      {busy && <span className="muted">Analizando…</span>}
      {err && <span className="small bad">{err}</span>}
    </section>
  );
}
