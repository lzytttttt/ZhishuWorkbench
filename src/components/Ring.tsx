import type { ReactNode } from 'react';

interface RingProps {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  mark?: number;
  children?: ReactNode;
}

/** 环形进度仪表，可选 mark 绘制阈值刻度（0–1） */
export default function Ring({ value, size = 120, stroke = 10, color = '#1b6b93', mark, children }: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const half = size / 2;
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={half} cy={half} r={r} fill="none" stroke="rgba(28,25,23,.08)" strokeWidth={stroke} />
        <circle
          cx={half}
          cy={half}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${c * v} ${c}`}
          transform={`rotate(-90 ${half} ${half})`}
          style={{ transition: 'stroke-dasharray .6s ease, stroke .3s' }}
        />
        {mark !== undefined && (
          <line
            x1={half}
            y1={0}
            x2={half}
            y2={stroke * 1.7}
            stroke="#1d1d1f"
            strokeWidth={2}
            transform={`rotate(${mark * 360} ${half} ${half})`}
          />
        )}
      </svg>
      <div className="ring-center">{children}</div>
    </div>
  );
}
