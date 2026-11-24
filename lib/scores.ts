import type { Wellness, Activity } from './intervals';

// ---------------------------------------------------------------------------
// Cálculo de los porcentajes del día (estilo Whoop) a partir de tus datos.
// Todo es relativo a TU normalidad: se compara cada día con tus últimos 60.
// ---------------------------------------------------------------------------

export type Status = 'verde' | 'amarillo' | 'rojo';
export type Tone = 'bien' | 'regular' | 'mal';
export type Reason = { tone: Tone; text: string; short?: string };

export type DayScores = {
  date: string;
  recovery: number | null; // 0-100
  sleep: number | null; // 0-100
  readiness: number | null; // 0-100
  status: Status | null;
};

export type Today = DayScores & {
  hrv: number | null;
  hrvRange: [number, number] | null;
  hrvVsMean: number | null;
  hrv7: number | null;
  rhr: number | null;
  rhrMean: number | null;
  sleepSecs: number | null;
  sleepAvgSecs: number | null;
  sleepScore: number | null;
  ctl: number | null;
  atl: number | null;
  tsb: number | null;
  strain: number;
  strainTarget: string;
  reasons: Reason[];
  headline: string;
  summary: string;
};

const SLEEP_NEED_H = Number(process.env.SLEEP_NEED_HOURS || 7.5);
const clamp = (v: number, lo = 1, hi = 99) => Math.max(lo, Math.min(hi, v));
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};
const num = (v: number | null | undefined): v is number => typeof v === 'number' && !Number.isNaN(v) && v > 0;

export function statusOf(p: number | null): Status | null {
  if (p == null) return null;
  return p >= 67 ? 'verde' : p >= 34 ? 'amarillo' : 'rojo';
}

// Escala de sensaciones de intervals.icu: 1 = muy bien … 4 = muy mal
function subjective(w: Wellness | undefined): number | null {
  if (!w) return null;
  const vals = [w.soreness, w.fatigue, w.stress, w.motivation].filter(num) as number[];
  if (!vals.length) return null;
  return mean(vals.map((v) => ((4 - v) / 3) * 100));
}

function hrvStats(hist: Wellness[]) {
  const lns = hist.map((w) => w.hrv).filter(num).map((v) => Math.log(v));
  if (lns.length < 7) return null;
  return { m: mean(lns), s: Math.max(sd(lns), 0.08) };
}

function rhrStats(hist: Wellness[]) {
  const v = hist.map((w) => w.restingHR).filter(num) as number[];
  if (v.length < 7) return null;
  return { m: mean(v), s: Math.max(sd(v), 1.5) };
}

/** Puntuaciones de un día usando los 60 días anteriores como referencia. */
export function scoreDay(all: Wellness[], idx: number): DayScores & { _parts: Record<string, number | null> } {
  const w = all[idx];
  const hist = all.slice(Math.max(0, idx - 60), idx);
  const hs = hrvStats(hist);
  const rs = rhrStats(hist);

  // Recuperación: HRV de hoy + tendencia 7 días + pulso en reposo
  let recovery: number | null = null;
  if (hs && num(w.hrv)) {
    const zH = (Math.log(w.hrv) - hs.m) / hs.s;
    const last7 = all.slice(Math.max(0, idx - 6), idx + 1).map((x) => x.hrv).filter(num).map((v) => Math.log(v));
    const zH7 = last7.length ? (mean(last7) - hs.m) / hs.s : 0;
    const zR = rs && num(w.restingHR) ? (w.restingHR - rs.m) / rs.s : 0;
    // tanh suaviza los extremos: un día malo baja mucho, pero no a 0
    recovery = clamp(50 + 45 * Math.tanh(0.3 * zH + 0.12 * zH7 - 0.15 * zR + 0.2));
  } else if (rs && num(w.restingHR)) {
    recovery = clamp(50 + 45 * Math.tanh(0.2 - 0.3 * ((w.restingHR - rs.m) / rs.s)));
  }

  // Sueño: horas frente a lo que necesitas + nota de sueño de Garmin
  let sleep: number | null = null;
  if (num(w.sleepSecs)) {
    const dur = Math.min(1, w.sleepSecs / 3600 / SLEEP_NEED_H) * 100;
    sleep = clamp(num(w.sleepScore) ? 0.6 * dur + 0.4 * w.sleepScore : dur);
  }

  // Listo para entrenar: todo junto menos la fatiga acumulada
  const subj = subjective(w);
  const parts: [number | null, number][] = [[recovery, 0.5], [sleep, 0.25], [subj, 0.25]];
  const used = parts.filter(([v]) => v != null) as [number, number][];
  let readiness: number | null = null;
  if (used.length) {
    const wsum = used.reduce((a, [, k]) => a + k, 0);
    let r = used.reduce((a, [v, k]) => a + v * k, 0) / wsum;
    if (num(w.ctl) && w.atl != null) {
      const tsb = w.ctl - w.atl;
      if (tsb < -10) r -= Math.min(25, (-10 - tsb) * 0.8);
      if (w.atl / w.ctl > 1.3) r -= 5;
    }
    readiness = clamp(r);
  }

  return { date: w.id, recovery: rnd(recovery), sleep: rnd(sleep), readiness: rnd(readiness), status: statusOf(readiness), _parts: { subj } };
}

const rnd = (v: number | null) => (v == null ? null : Math.round(v));

/** Esfuerzo del día en escala 0-21 a partir del TSS (aprox. al "strain" de Whoop). */
export function strainFromTss(tss: number) {
  return Math.round(21 * (1 - Math.exp(-tss / 180)) * 10) / 10;
}

export function computeToday(all: Wellness[], activities: Activity[], today: string): Today {
  const idx = all.length - 1;
  const w = all[idx];
  const base = scoreDay(all, idx);
  const hist = all.slice(Math.max(0, idx - 60), idx);
  const hs = hrvStats(hist);
  const rs = rhrStats(hist);

  const hrv = num(w.hrv) ? Math.round(w.hrv) : null;
  const hrvRange: [number, number] | null = hs ? [Math.round(Math.exp(hs.m - hs.s)), Math.round(Math.exp(hs.m + hs.s))] : null;
  const hrvMean = hs ? Math.exp(hs.m) : null;
  const last7 = all.slice(-7).map((x) => x.hrv).filter(num) as number[];
  const hrv7 = last7.length ? Math.round(mean(last7)) : null;

  const sleepHist = all.slice(-15, -1).map((x) => x.sleepSecs).filter(num) as number[];
  const ctl = num(w.ctl) ? Math.round(w.ctl) : lastVal(all, 'ctl');
  const atl = w.atl != null ? Math.round(w.atl) : lastVal(all, 'atl');
  const tsb = ctl != null && atl != null ? ctl - atl : null;

  const tssToday = activities.filter((a) => a.start_date_local.slice(0, 10) === today).reduce((s, a) => s + (a.icu_training_load || 0), 0);
  const status = base.status;
  const strainTarget = status === 'verde' ? '14–17' : status === 'rojo' ? '4–8' : '10–13';

  // Motivos
  const reasons: Reason[] = [];
  if (hrv != null && hrvRange) {
    const tone: Tone = hrv < hrvRange[0] ? 'mal' : hrv > hrvRange[1] ? 'bien' : 'bien';
    reasons.push({ tone, text: `HRV ${hrv} ms · tu rango ${hrvRange[0]}–${hrvRange[1]}`, short: 'HRV por debajo de tu rango' });
  } else if (hrv != null) {
    reasons.push({ tone: 'regular', text: `HRV ${hrv} ms · aún calculando tu rango (faltan días)` });
  } else {
    reasons.push({ tone: 'regular', text: 'Sin dato de HRV esta noche' });
  }
  if (num(w.sleepSecs)) {
    const avg = sleepHist.length ? mean(sleepHist) : null;
    const h = w.sleepSecs / 3600;
    const sp = base.sleep ?? 0;
    const tone: Tone = sp >= 67 ? 'bien' : sp >= 34 ? 'regular' : 'mal';
    void h;
    reasons.push({ tone, text: `Sueño ${fmtH(w.sleepSecs)}${avg ? ` · tu media ${fmtH(avg)}` : ''}`, short: 'has dormido poco' });
  }
  if (tsb != null) {
    const tone: Tone = tsb < -25 ? 'mal' : tsb < -10 ? 'regular' : 'bien';
    const label = tsb < -25 ? 'mucha carga' : tsb < -10 ? 'carga alta' : tsb > 10 ? 'fresco' : 'equilibrado';
    reasons.push({ tone, text: `Forma (TSB) ${fmtSigned(tsb)} · ${label}`, short: 'llevas mucha carga acumulada' });
  }
  if (num(w.restingHR) && rs) {
    const d = w.restingHR - rs.m;
    const tone: Tone = d > 4 ? 'mal' : d > 2 ? 'regular' : 'bien';
    reasons.push({ tone, text: `Pulso en reposo ${Math.round(w.restingHR)} · ${d > 2 ? `+${Math.round(d)} sobre lo normal` : 'normal'}`, short: 'pulso en reposo alto' });
  }
  const subj = base._parts.subj;
  if (subj != null) {
    reasons.push({ tone: subj >= 60 ? 'bien' : subj >= 35 ? 'regular' : 'mal', text: `Sensaciones ${Math.round(subj)}%`, short: 'te notas cansado' });
  }

  const headline =
    status === 'verde' ? 'Buen día: puedes apretar' : status === 'rojo' ? 'Hoy toca aflojar' : status === 'amarillo' ? 'Haz la sesión prevista, sin forzar' : 'Aún no hay datos de hoy';
  const bad = reasons.filter((r) => r.tone !== 'bien' && r.short).map((r) => r.short as string);
  const summary =
    status == null
      ? 'Sincroniza el reloj para que lleguen el HRV y el sueño de esta noche.'
      : bad.length
        ? `Lo que te frena hoy: ${bad.join(', ').replace(/, ([^,]*)$/, ' y $1')}.${status === 'rojo' ? ' Mejor rodaje suave o descanso.' : status === 'amarillo' ? ' No es día de buscar marcas.' : ''}`
        : 'Todo está dentro de tu normalidad. Si tienes sesión de calidad, es buen día.';

  return {
    ...base,
    hrv,
    hrvRange,
    hrvVsMean: hrv != null && hrvMean ? Math.round(hrv - hrvMean) : null,
    hrv7,
    rhr: num(w.restingHR) ? Math.round(w.restingHR) : null,
    rhrMean: rs ? Math.round(rs.m) : null,
    sleepSecs: num(w.sleepSecs) ? w.sleepSecs : null,
    sleepAvgSecs: sleepHist.length ? mean(sleepHist) : null,
    sleepScore: num(w.sleepScore) ? Math.round(w.sleepScore) : null,
    ctl,
    atl,
    tsb,
    strain: strainFromTss(tssToday),
    strainTarget,
    reasons,
    headline,
    summary,
  };
}

function lastVal(all: Wellness[], k: 'ctl' | 'atl') {
  for (let i = all.length - 1; i >= 0; i--) if (all[i][k] != null) return Math.round(all[i][k] as number);
  return null;
}

export function fmtH(secs: number) {
  const t = Math.round(secs / 60);
  const h = Math.floor(t / 60);
  const m = t % 60;
  return `${h} h ${String(m).padStart(2, '0')} min`;
}

export function fmtSigned(n: number) {
  return n < 0 ? `−${Math.abs(n)}` : n > 0 ? `+${n}` : '0';
}
