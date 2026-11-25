'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type W = { date: string; type: string; name: string; description: string; duration_min: number | null; notes?: string };

const TYPES: [string, string][] = [
  ['VirtualRide', 'Rodillo'],
  ['Ride', 'Bici'],
  ['Run', 'Carrera'],
  ['Swim', 'Natación'],
  ['WeightTraining', 'Fuerza'],
  ['Walk', 'Caminar'],
  ['Other', 'Otro'],
];

// Las fotos del móvil se reducen antes de enviarlas para que no pasen del límite
async function shrinkImage(file: File): Promise<Blob> {
  if (!file.type.startsWith('image/') || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2200 / Math.max(bmp.width, bmp.height));
    const c = document.createElement('canvas');
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext('2d')?.drawImage(bmp, 0, 0, c.width, c.height);
    return await new Promise((ok) => c.toBlob((b) => ok(b || file), 'image/jpeg', 0.85));
  } catch {
    return file;
  }
}

const dayName = (d: string) => new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(d + 'T12:00:00Z'));

export default function PlanUpload() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'pick' | 'reading' | 'review' | 'saving' | 'done'>('pick');
  const [extra, setExtra] = useState('');
  const [items, setItems] = useState<W[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [count, setCount] = useState(0);
  const router = useRouter();

  async function onFile(f: File | undefined) {
    if (!f) return;
    setErr(null);
    setStep('reading');
    const blob = await shrinkImage(f);
    const fd = new FormData();
    fd.append('file', blob, f.name);
    fd.append('extra', extra);
    try {
      const res = await fetch('/api/plan/parse', { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error');
      if (!j.workouts?.length) throw new Error('No he encontrado entrenos en el archivo.');
      setItems(j.workouts);
      setStep('review');
    } catch (e) {
      setErr((e as Error).message);
      setStep('pick');
    }
  }

  async function confirm() {
    setStep('saving');
    setErr(null);
    try {
      const res = await fetch('/api/plan/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workouts: items }) });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error');
      setCount(j.count);
      setStep('done');
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
      setStep('review');
    }
  }

  const upd = (i: number, patch: Partial<W>) => setItems(items.map((w, k) => (k === i ? { ...w, ...patch } : w)));
  const field = { background: '#12151A', color: '#F2F3F5', border: '1px solid #333842', borderRadius: 10, padding: '10px 12px', fontSize: 15, fontFamily: 'inherit' } as const;

  if (!open) {
    return (
      <button type="button" className="primary" onClick={() => setOpen(true)}>
        Subir planificación (PDF o foto)
      </button>
    );
  }

  return (
    <section className="card stack">
      <div className="row">
        <h3>Subir planificación</h3>
        <button type="button" className="pill" style={{ height: 36, padding: '0 12px' }} onClick={() => { setOpen(false); setStep('pick'); setItems([]); setErr(null); }}>
          Cerrar
        </button>
      </div>

      {step === 'pick' && (
        <>
          <span style={{ fontSize: 14, color: '#C3C7CE' }}>Sube el PDF de tu entrenador o una foto de la planificación. La IA lo lee y te enseña los entrenos para que los revises antes de crearlos.</span>
          <label htmlFor="extra" className="small muted">Aclaración (opcional)</label>
          <input id="extra" value={extra} onChange={(e) => setExtra(e.target.value)} placeholder="Ej.: es para la semana que viene" style={field} />
          <label className="primary" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
            Elegir archivo
            <input type="file" accept="application/pdf,image/*" style={{ display: 'none' }} onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
        </>
      )}

      {step === 'reading' && <span className="muted">Leyendo la planificación… (puede tardar unos segundos)</span>}

      {(step === 'review' || step === 'saving') && (
        <>
          <span style={{ fontSize: 14, color: '#C3C7CE' }}>Revisa los {items.length} entrenos. Puedes cambiar el día, el nombre o los pasos, o quitar alguno.</span>
          {items.map((w, i) => (
            <div key={i} className="stack-sm" style={{ borderTop: '1px solid #262A31', paddingTop: 12 }}>
              <div className="row">
                <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{dayName(w.date)}</span>
                <button type="button" className="pill" style={{ height: 36, padding: '0 12px' }} onClick={() => setItems(items.filter((_, k) => k !== i))} aria-label={`Quitar ${w.name}`}>
                  Quitar
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <input type="date" aria-label="Día" value={w.date} onChange={(e) => upd(i, { date: e.target.value })} style={field} />
                <select aria-label="Tipo" value={w.type} onChange={(e) => upd(i, { type: e.target.value })} style={field}>
                  {TYPES.map(([v, l]) => (
                    <option key={v} value={v}>{l}</option>
                  ))}
                </select>
              </div>
              <input aria-label="Nombre" value={w.name} onChange={(e) => upd(i, { name: e.target.value })} style={field} />
              <textarea aria-label="Pasos del entreno" value={w.description} onChange={(e) => upd(i, { description: e.target.value })} rows={Math.min(12, Math.max(3, w.description.split('\n').length + 1))} style={{ ...field, fontFamily: 'ui-monospace, Menlo, monospace', fontSize: 13 }} />
              {w.notes && <div className="hint">{w.notes}</div>}
            </div>
          ))}
          <button type="button" className="primary" disabled={step === 'saving' || !items.length} onClick={confirm}>
            {step === 'saving' ? 'Creando…' : `Crear ${items.length} entrenos en intervals.icu`}
          </button>
        </>
      )}

      {step === 'done' && (
        <>
          <span style={{ fontSize: 15 }}>✓ Creados {count} entrenos. Ya salen en tu semana y se enviarán a tu Garmin en la próxima sincronización.</span>
          <button type="button" className="pill" onClick={() => { setStep('pick'); setItems([]); }}>Subir otra</button>
        </>
      )}

      {err && <span className="small bad">{err}</span>}
    </section>
  );
}
