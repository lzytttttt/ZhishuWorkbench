interface RadarProps {
  labels: string[];
  values: number[];
  max: number;
  size?: number;
  color?: string;
}

export default function RadarChart({ labels, values, max, size = 280, color = '#1b6b93' }: RadarProps) {
  const n = labels.length;
  const cx = size / 2;
  const cy = size / 2;
  const R = size / 2 - 44;
  const pt = (i: number, r: number): [number, number] => {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n;
    return [cx + Math.cos(a) * r, cy + Math.sin(a) * r];
  };
  const poly = (r: (i: number) => number) =>
    Array.from({ length: n }, (_, i) => pt(i, r(i)))
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(' ');

  return (
    <svg className="radar" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <defs>
        <radialGradient id="radarFill" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={color} stopOpacity=".05" />
          <stop offset="1" stopColor={color} stopOpacity=".35" />
        </radialGradient>
      </defs>
      {Array.from({ length: max }, (_, k) => (
        <polygon
          key={k}
          points={poly(() => (R * (k + 1)) / max)}
          fill="none"
          stroke="rgba(28,25,23,.1)"
          strokeDasharray={k === max - 1 ? undefined : '3 4'}
        />
      ))}
      {labels.map((_, i) => {
        const [x, y] = pt(i, R);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="rgba(28,25,23,.09)" />;
      })}
      <polygon
        points={poly((i) => (R * Math.max(0, values[i] ?? 0)) / max)}
        fill="url(#radarFill)"
        stroke={color}
        strokeWidth={2}
        style={{ transition: 'all .5s ease' }}
      />
      {values.map((v, i) => {
        const [x, y] = pt(i, (R * v) / max);
        return <circle key={i} cx={x} cy={y} r={4} fill={color} stroke="#ffffff" strokeWidth={2} />;
      })}
      {labels.map((l, i) => {
        const [x, y] = pt(i, R + 24);
        return (
          <text key={l} x={x} y={y} textAnchor="middle" dominantBaseline="middle" className="radar-label">
            {l}
          </text>
        );
      })}
    </svg>
  );
}
