const C = 2 * Math.PI * 38;

export function colorFor(p: number | null) {
  if (p == null) return '#4B5563';
  return p >= 67 ? '#4ADE80' : p >= 34 ? '#F5B83D' : '#F87171';
}

export default function Ring({
  value,
  max = 100,
  label,
  sub,
  color,
  display,
  unit,
}: {
  value: number | null;
  max?: number;
  label: string;
  sub: string;
  color?: string;
  display?: string;
  unit?: string;
}) {
  const frac = value == null ? 0 : Math.max(0, Math.min(1, value / max));
  const stroke = color || colorFor(value);
  return (
    <div className="ring">
      <div className="ring-box">
        <svg viewBox="0 0 92 92" aria-hidden="true">
          <circle cx="46" cy="46" r="38" fill="none" stroke="#262A31" strokeWidth="9" />
          <circle cx="46" cy="46" r="38" fill="none" stroke={stroke} strokeWidth="9" strokeLinecap="round" strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`} />
        </svg>
        <span className="ring-val">
          {value == null ? '—' : display ?? `${value}%`}
          {unit && <small>{unit}</small>}
        </span>
      </div>
      <span className="ring-label">{label}</span>
      <span className="ring-sub">{sub}</span>
    </div>
  );
}
