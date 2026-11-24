// Gráficas SVG sencillas, sin librerías.

type Series = { values: (number | null)[]; color: string; width?: number };

function path(values: (number | null)[], n: number, W: number, y: (v: number) => number) {
  let d = '';
  let pen = false;
  values.forEach((v, i) => {
    if (v == null) {
      pen = false;
      return;
    }
    const x = n > 1 ? (i * W) / (n - 1) : W / 2;
    d += `${pen ? 'L' : 'M'}${x.toFixed(1)},${y(v).toFixed(1)} `;
    pen = true;
  });
  return d;
}

export function LineChart({
  series,
  min,
  max,
  height = 200,
  band,
  hlines = [],
  bars,
  label,
}: {
  series: Series[];
  min: number;
  max: number;
  height?: number;
  band?: { from: number; to: number; color: string; opacity?: number }[];
  hlines?: number[];
  bars?: { values: number[]; max: number; color: string };
  label: string;
}) {
  const W = 1000;
  const H = height;
  const n = Math.max(...series.map((s) => s.values.length), bars?.values.length || 0);
  const y = (v: number) => H - ((Math.max(min, Math.min(max, v)) - min) / (max - min)) * (H - 8) - 4;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H }} role="img" aria-label={label}>
      {band?.map((b, i) => (
        <rect key={i} x="0" y={y(b.to)} width={W} height={Math.max(0, y(b.from) - y(b.to))} fill={b.color} fillOpacity={b.opacity ?? 0.12} />
      ))}
      {hlines.map((h) => (
        <line key={h} x1="0" x2={W} y1={y(h)} y2={y(h)} stroke="#2E333B" strokeDasharray="4 6" vectorEffect="non-scaling-stroke" />
      ))}
      {bars?.values.map((v, i) => {
        const bh = (v / bars.max) * (H * 0.45);
        const x = n > 1 ? (i * W) / (n - 1) : W / 2;
        return v > 0 ? <rect key={i} x={x - 6} y={H - bh} width="12" height={bh} rx="2" fill={bars.color} /> : null;
      })}
      {series.map((s, i) => (
        <path key={i} d={path(s.values, n, W, y)} fill="none" stroke={s.color} strokeWidth={s.width ?? 2.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}

export function SleepBars({ hours, need, label }: { hours: (number | null)[]; need: number; label: string }) {
  const W = 500;
  const H = 180;
  const max = 10;
  const step = W / hours.length;
  const y = (h: number) => H - (h / max) * H;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: H }} role="img" aria-label={label}>
      <line x1="0" x2={W} y1={y(need)} y2={y(need)} stroke="#C8F25A" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
      {hours.map((h, i) =>
        h == null ? null : <rect key={i} x={i * step + step * 0.2} y={y(h)} width={step * 0.6} height={H - y(h)} rx="4" fill={h < need - 0.5 ? '#F5B83D' : '#4B5563'} />,
      )}
    </svg>
  );
}
