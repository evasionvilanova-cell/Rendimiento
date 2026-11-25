'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const QUESTIONS = [
  { id: 'soreness', label: 'Piernas' },
  { id: 'fatigue', label: 'Energía' },
  { id: 'stress', label: 'Estrés (4 = nada de estrés)' },
  { id: 'motivation', label: 'Ganas de entrenar' },
] as const;

type Answers = Partial<Record<(typeof QUESTIONS)[number]['id'], number>>;

const CHIPS = ['Sin molestias', 'Piernas cargadas', 'Rodilla', 'Gemelo', 'Espalda', 'Resfriado', 'Mal dormido'];

export default function CheckIn({ initial, initialNotes = '' }: { initial: Answers; initialNotes?: string }) {
  const [ans, setAns] = useState<Answers>(initial);
  const [notes, setNotes] = useState(initialNotes);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const router = useRouter();
  const complete = QUESTIONS.every((q) => ans[q.id]);

  async function save() {
    setState('saving');
    const res = await fetch('/api/checkin', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...ans, comments: notes }) });
    if (res.ok) {
      setState('saved');
      router.refresh();
    } else setState('error');
  }

  return (
    <section className="card stack">
      <div>
        <h3>¿Cómo te notas hoy?</h3>
        <span className="muted small">1 = muy mal · 4 = muy bien · 15 segundos</span>
      </div>
      {QUESTIONS.map((q) => (
        <div key={q.id} className="stack-sm">
          <span>{q.label}</span>
          <div className="grid4">
            {[1, 2, 3, 4].map((n) => (
              <button
                key={n}
                type="button"
                className={'pill' + (ans[q.id] === n ? ' on' : '')}
                aria-pressed={ans[q.id] === n}
                onClick={() => {
                  setAns({ ...ans, [q.id]: n });
                  setState('idle');
                }}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
      <div className="stack-sm">
        <label htmlFor="notas">Molestias o notas (opcional)</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              className="pill"
              style={{ height: 36, padding: '0 12px', fontSize: 13 }}
              onClick={() => {
                setNotes(c === 'Sin molestias' ? '' : notes.includes(c) ? notes : (notes ? notes + ', ' : 'Molestias: ') + c.toLowerCase());
                setState('idle');
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <input id="notas" value={notes} onChange={(e) => { setNotes(e.target.value); setState('idle'); }} placeholder="Ej.: molestia rodilla derecha al subir escaleras" style={{ height: 44, borderRadius: 12, border: '1px solid #333842', background: '#12151A', color: '#F2F3F5', padding: '0 12px', fontSize: 15 }} />
      </div>
      <button type="button" className="primary" disabled={!complete || state === 'saving'} onClick={save}>
        {state === 'saving' ? 'Guardando…' : state === 'saved' ? 'Guardado ✓' : 'Guardar sensaciones'}
      </button>
      {state === 'error' && <span className="small bad">No se ha podido guardar. Inténtalo de nuevo.</span>}
    </section>
  );
}
