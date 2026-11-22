import { useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { play } from './sound';

interface Props {
  label: string;
  onPull: () => void;
  size?: 'sm' | 'lg';
  disabled?: boolean;
}

/**
 * 拉红绳：需要“向下拉”这个有意的动作才会触发，而不是普通点击。
 * 键盘用户按 Enter / 空格即可（可访问性优先于仪式感）。
 */
export default function PullCord({ label, onPull, size = 'lg', disabled }: Props) {
  const [drag, setDrag] = useState(0);
  const [hint, setHint] = useState(false);
  const [fired, setFired] = useState(false);
  const start = useRef<number | null>(null);
  const max = size === 'lg' ? 96 : 22;
  const threshold = size === 'lg' ? 58 : 14;

  const fire = () => {
    if (disabled) return;
    setFired(true);
    window.setTimeout(() => setFired(false), 500);
    play('paper');
    onPull();
  };

  const down = (e: PointerEvent<HTMLButtonElement>) => {
    if (disabled) return;
    start.current = e.clientY;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const move = (e: PointerEvent<HTMLButtonElement>) => {
    if (start.current === null) return;
    setDrag(Math.max(0, Math.min(max, e.clientY - start.current)));
  };
  const up = () => {
    if (start.current === null) return;
    start.current = null;
    if (drag >= threshold) fire();
    else if (drag < 4) {
      setHint(true);
      window.setTimeout(() => setHint(false), 1600);
    }
    setDrag(0);
  };
  const key = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fire();
    }
  };

  return (
    <button
      type="button"
      className={`pullcord ${size} ${drag ? 'dragging' : ''} ${fired ? 'fired' : ''} ${drag >= threshold ? 'ready' : ''}`}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={key}
      disabled={disabled}
      aria-label={`${label}（向下拉红绳，或按回车）`}
      title={`${label} · 向下拉`}
    >
      <span className="pc-rail" aria-hidden />
      <span className="pc-cord" aria-hidden style={{ height: `calc(var(--cord) + ${drag}px)` }} />
      <span className="pc-tassel" aria-hidden style={{ transform: `translateY(${drag}px)` }}>
        <i />
      </span>
      {size === 'lg' && <span className="pc-label">{label}</span>}
      {hint && <span className="pc-hint">向下拉一下红绳 ↓</span>}
    </button>
  );
}
