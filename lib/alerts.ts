import type { Wellness } from './intervals';

export type Alert = { level: 'rojo' | 'amarillo'; title: string; text: string };

const num = (v: number | null | undefined): v is number => typeof v === 'number' && v > 0;
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const sd = (xs: number[]) => {
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, xs.length - 1));
};

/** Avisos automáticos a partir de tus datos de los últimos días. */
export function computeAlerts(all: Wellness[]): Alert[] {
  const out: Alert[] = [];
  const n = all.length;
  if (!n) return out;
  const today = all[n - 1];
  const base = all.slice(Math.max(0, n - 61), n - 1);

  const hrvBase = base.map((w) => w.hrv).filter(num).map(Math.log);
  const rhrBase = base.map((w) => w.restingHR).filter(num);
  const hs = hrvBase.length >= 7 ? { m: mean(hrvBase), s: Math.max(sd(hrvBase), 0.05) } : null;
  const rm = rhrBase.length >= 7 ? mean(rhrBase) : null;

  const hrvLow = (w: Wellness) => (hs && num(w.hrv) ? Math.log(w.hrv) < hs.m - hs.s : false);
  const rhrHigh = (w: Wellness) => (rm != null && num(w.restingHR) ? w.restingHR >= rm + 5 : false);

  // Posible resfriado o fatiga fuerte: pulso alto y HRV bajo a la vez
  if (rhrHigh(today) && hrvLow(today)) {
    out.push({ level: 'rojo', title: 'Posible resfriado o fatiga fuerte', text: `Pulso en reposo ${Math.round(today.restingHR as number)} (+${Math.round((today.restingHR as number) - (rm as number))}) y HRV por debajo de tu rango a la vez. Hoy, suave o descanso; si tienes síntomas por debajo del cuello o fiebre, no entrenes.` });
  } else if (rhrHigh(today)) {
    out.push({ level: 'amarillo', title: 'Pulso en reposo alto', text: `${Math.round(today.restingHR as number)} ppm, ${Math.round((today.restingHR as number) - (rm as number))} por encima de lo normal. Vigila cómo te encuentras al calentar.` });
  }

  // HRV bajo varios días seguidos
  const last4 = all.slice(-4);
  const lowDays = last4.filter(hrvLow).length;
  if (hs && lowDays >= 3) out.push({ level: 'rojo', title: 'HRV bajo varios días', text: `${lowDays} de los últimos 4 días con el HRV por debajo de tu rango. Señal de fatiga acumulada: mete 2–3 días suaves o una descarga.` });

  // Sueño corto repetido
  const shortSleep = all.slice(-4).filter((w) => num(w.sleepSecs) && (w.sleepSecs as number) < 6 * 3600).length;
  if (shortSleep >= 3) out.push({ level: 'amarillo', title: 'Poco sueño', text: `${shortSleep} de las últimas 4 noches por debajo de 6 h. Prioriza dormir antes que añadir entrenos.` });

  // Rampa de carga y forma
  const withCtl = all.filter((w) => w.ctl != null);
  if (withCtl.length >= 8) {
    const now = withCtl[withCtl.length - 1];
    const weekAgo = withCtl[withCtl.length - 8];
    const ramp = (now.ctl as number) - (weekAgo.ctl as number);
    if (ramp > 8) out.push({ level: 'amarillo', title: 'Subes la carga muy rápido', text: `Tu fitness ha subido ${Math.round(ramp)} puntos en 7 días (lo seguro es +3 a +7). Riesgo de sobrecarga o lesión.` });
    if (now.atl != null) {
      const tsb = (now.ctl as number) - now.atl;
      if (tsb < -30) out.push({ level: 'rojo', title: 'Mucha fatiga acumulada', text: `Forma (TSB) ${Math.round(tsb)}. Por debajo de −30 el riesgo de pasarte es alto: planifica descarga.` });
    }
  }

  // Molestias anotadas en el check-in de los últimos 3 días
  const notes = all.slice(-3).map((w) => (w as Wellness & { comments?: string }).comments).filter((c): c is string => !!c && /molesti|dolor|lesi|resfri|enferm|fiebre/i.test(c));
  if (notes.length) out.push({ level: 'amarillo', title: 'Tienes molestias anotadas', text: notes[notes.length - 1].slice(0, 200) });

  return out;
}
