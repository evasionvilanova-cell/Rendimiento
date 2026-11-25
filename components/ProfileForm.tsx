'use client';

import { useState } from 'react';

type F = { key: string; label: string; hint: string };

export default function ProfileForm({ fields, initial }: { fields: F[]; initial: Record<string, string> }) {
  const [v, setV] = useState<Record<string, string>>(initial);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  async function save() {
    setState('saving');
    const res = await fetch('/api/ficha', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
    setState(res.ok ? 'saved' : 'error');
  }
  return (
    <section className="card stack">
      {fields.map((f) => (
        <div key={f.key} className="stack-sm">
          <label htmlFor={f.key} style={{ fontWeight: 600 }}>{f.label}</label>
          <textarea id={f.key} rows={2} value={v[f.key] || ''} placeholder={f.hint} onChange={(e) => { setV({ ...v, [f.key]: e.target.value }); setState('idle'); }} style={{ background: '#12151A', color: '#F2F3F5', border: '1px solid #333842', borderRadius: 10, padding: '10px 12px', fontSize: 15, fontFamily: 'inherit', resize: 'vertical' }} />
        </div>
      ))}
      <button type="button" className="primary" onClick={save} disabled={state === 'saving'}>{state === 'saving' ? 'Guardando…' : state === 'saved' ? 'Guardada ✓' : 'Guardar ficha'}</button>
      {state === 'error' && <span className="small bad">No se ha podido guardar.</span>}
    </section>
  );
}
