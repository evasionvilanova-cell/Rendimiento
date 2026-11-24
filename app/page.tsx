import Link from 'next/link';
import { requireAuth } from '@/lib/auth';
import { loadData } from '@/lib/data';
import { computeToday, fmtH, fmtSigned } from '@/lib/scores';
import { hm, longDate, shortDate } from '@/lib/dates';
import Ring from '@/components/Ring';
import CheckIn from '@/components/CheckIn';
import { LineChart } from '@/components/Charts';

export const dynamic = 'force-dynamic';

const TAG = { verde: 'HOY: APRIETA', amarillo: 'HOY: MANTÉN', rojo: 'HOY: AFLOJA' } as const;
const TAGCOLOR = { verde: '#4ADE80', amarillo: '#F5B83D', rojo: '#F87171' } as const;

export default async function Hoy() {
  await requireAuth();
  const data = await loadData();
  const t = computeToday(data.wellness, data.activities, data.today);
  const w = data.wellness[data.wellness.length - 1];
  const name = process.env.ATHLETE_NAME || 'Xavi';

  const hrv14 = data.wellness.slice(-14).map((x) => (x.hrv ? x.hrv : null));
  const hrvVals = hrv14.filter((v): v is number => v != null);
  const lo = Math.min(...hrvVals, t.hrvRange?.[0] ?? 999) - 5;
  const hi = Math.max(...hrvVals, t.hrvRange?.[1] ?? 0) + 5;

  const plan = data.planned[0];
  const planTss = data.planned.reduce((s, p) => s + (p.icu_training_load || 0), 0);
  const suggestion =
    t.status === 'rojo'
      ? 'Sugerencia: cámbialo por un rodaje suave de 45–60 min en Z1–Z2, o descansa.'
      : t.status === 'amarillo'
        ? 'Sugerencia: hazlo, pero si el pulso sube más de lo normal para esos vatios, recorta el último bloque.'
        : t.status === 'verde'
          ? 'Sugerencia: adelante, hoy puedes apretar en los bloques de calidad.'
          : null;
  const dayType = planTss >= 120 ? 'duro' : planTss >= 60 ? 'medio' : planTss > 0 ? 'suave' : 'de descanso';

  const initial: Record<string, number> = {};
  (['soreness', 'fatigue', 'stress', 'motivation'] as const).forEach((k) => {
    const v = w[k];
    if (v && v >= 1 && v <= 4) initial[k] = 5 - v;
  });

  return (
    <main className="phone">
      <div className="header">
        <div className="stack-sm" style={{ gap: 4 }}>
          <span className="muted" style={{ fontSize: 13 }}>{longDate(data.today)}</span>
          <h1>Buenos días, {name}</h1>
        </div>
        <Link href="/tendencias" className="avatar" aria-label="Ver tendencias">{name.charAt(0)}</Link>
      </div>

      {data.demo && (
        <div className="banner">
          {data.error ? `No se ha podido leer intervals.icu (${data.error}). ` : ''}Estás viendo datos de ejemplo. Añade tu clave de intervals.icu en Vercel para ver los tuyos.
        </div>
      )}

      <section className="card rings">
        <Ring value={t.recovery} label="Recuperación" sub="HRV + pulso reposo" />
        <Ring value={t.sleep} label="Sueño" sub="horas + calidad" />
        <Ring value={t.readiness} label="Listo para entrenar" sub="todo + carga + sensaciones" />
        <Ring value={t.strain} max={21} display={t.strain.toLocaleString('es-ES')} unit="de 21" color="#60A5FA" label="Esfuerzo de hoy" sub={`objetivo hoy: ${t.strainTarget}`} />
      </section>

      <section className={'verdict ' + (t.status || 'nodata')}>
        {t.status && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="lights" aria-hidden="true">
              <span style={{ background: t.status === 'rojo' ? '#F87171' : '#4A2A2A' }} />
              <span style={{ background: t.status === 'amarillo' ? '#F5B83D' : '#3A3220' }} />
              <span style={{ background: t.status === 'verde' ? '#4ADE80' : '#22392A' }} />
            </div>
            <span className="tag" style={{ color: TAGCOLOR[t.status] }}>{TAG[t.status]}</span>
          </div>
        )}
        <h2>{t.headline}</h2>
        <p>{t.summary}</p>
        <div className="stack-sm" style={{ paddingTop: 4 }}>
          <span className="small" style={{ fontWeight: 600, color: '#BFB79F', letterSpacing: '.06em' }}>POR QUÉ</span>
          {t.reasons.map((r, i) => (
            <div key={i} className="reason">
              <span className={'dot-' + r.tone} aria-hidden="true">●</span>
              <span>{r.text}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="tiles">
        <div className="card tile">
          <span className="small muted">HRV (noche)</span>
          <span className="v">{t.hrv ?? '—'} <small>ms</small></span>
          <span className="small" style={{ color: t.hrvVsMean != null && t.hrvVsMean < 0 ? '#F87171' : '#4ADE80' }}>
            {t.hrvVsMean != null ? `${t.hrvVsMean < 0 ? '↓' : '↑'} ${Math.abs(t.hrvVsMean)} ms vs tu media` : 'sin referencia aún'}
          </span>
        </div>
        <div className="card tile">
          <span className="small muted">Sueño</span>
          <span className="v">{t.sleepSecs ? fmtH(t.sleepSecs).replace(' min', '') : '—'}</span>
          <span className="small muted">{t.sleepScore ? `Nota ${t.sleepScore} / 100` : 'sin nota'}</span>
        </div>
        <div className="card tile">
          <span className="small muted">Pulso en reposo</span>
          <span className="v">{t.rhr ?? '—'} <small>ppm</small></span>
          <span className="small muted">{t.rhrMean ? `tu media ${t.rhrMean}` : ''}</span>
        </div>
        <div className="card tile">
          <span className="small muted">Forma (TSB)</span>
          <span className="v">{t.tsb != null ? fmtSigned(t.tsb) : '—'}</span>
          <span className="small muted">Fitness {t.ctl ?? '—'} · Fatiga {t.atl ?? '—'}</span>
        </div>
      </div>

      <section className="card stack-sm">
        <div className="row">
          <h3>HRV · últimos 14 días</h3>
          <span className="small muted">▬ tu rango normal</span>
        </div>
        <LineChart
          label="HRV de los últimos 14 días comparado con tu rango normal"
          height={120}
          min={lo}
          max={hi}
          band={t.hrvRange ? [{ from: t.hrvRange[0], to: t.hrvRange[1], color: '#C8F25A' }] : []}
          series={[{ values: hrv14, color: '#C8F25A' }]}
        />
        <div className="axis"><span>{shortDate(data.wellness[Math.max(0, data.wellness.length - 14)].id)}</span><span>hoy</span></div>
      </section>

      <CheckIn initial={initial} />

      <section className="card stack-sm">
        <div className="row">
          <h3>Entreno de hoy</h3>
          {planTss > 0 && <span className="small muted">TSS previsto {Math.round(planTss)}</span>}
        </div>
        {plan ? (
          <>
            <span className="display" style={{ fontSize: 19, fontWeight: 600 }}>{plan.name}{plan.moving_time ? ` · ${hm(plan.moving_time)}` : ''}</span>
            {plan.description && <span style={{ fontSize: 14, color: '#C3C7CE', whiteSpace: 'pre-line' }}>{plan.description.split('\n').slice(0, 3).join('\n')}</span>}
            {suggestion && <div className="hint">{suggestion}</div>}
          </>
        ) : (
          <span style={{ fontSize: 14, color: '#C3C7CE' }}>No tienes entreno planificado en intervals.icu para hoy.</span>
        )}
      </section>

      <section className="card stack-sm">
        <h3>Nutrición de hoy</h3>
        <span style={{ fontSize: 14, color: '#C3C7CE' }}>
          Día {dayType} según tu entreno. Sigue la pauta de tu nutricionista para un día {dayType === 'de descanso' ? 'de descanso' : dayType}.
        </span>
        {process.env.NUTRITION_URL && <a href={process.env.NUTRITION_URL} style={{ fontSize: 14, fontWeight: 600 }}>Ver el menú del día →</a>}
      </section>

      <nav className="tabbar" aria-label="Secciones">
        <Link href="/" className="on">Hoy</Link>
        <Link href="/tendencias">Tendencias</Link>
      </nav>
    </main>
  );
}
