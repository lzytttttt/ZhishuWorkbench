import { useCallback, useEffect, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import { useReducedMotion } from './motion';
import { play } from './sound';

interface Props {
  children: ReactNode;
  /** 涂层上的字 */
  label?: string;
  /** 刮开多少比例后自动揭开 */
  threshold?: number;
  onReveal?: () => void;
}

/**
 * 刮开卡：宣纸涂层盖住答案，用指尖 / 鼠标刮开。
 * - 刮开约 45% 自动揭开；
 * - 永远提供“直接揭开”按钮（键盘、读屏与减少动态效果用户不必刮）。
 */
export default function ScratchCard({ children, label = '刮开看答案', threshold = 0.45, onReveal }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const last = useRef<{ x: number; y: number } | null>(null);
  const moves = useRef(0);
  const [done, setDone] = useState(false);
  const reduced = useReducedMotion();

  const reveal = useCallback(() => {
    if (done) return;
    setDone(true);
    play('paper');
    onReveal?.();
  }, [done, onReveal]);

  // 绘制涂层：宣纸底 + 细纤维 + 一行字
  useEffect(() => {
    if (done) return;
    const el = wrap.current;
    const cv = canvas.current;
    if (!el || !cv) return;
    const paint = () => {
      const r = el.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.max(1, Math.round(r.width * dpr));
      cv.height = Math.max(1, Math.round(r.height * dpr));
      const ctx = cv.getContext('2d');
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ddd1bb';
      ctx.fillRect(0, 0, r.width, r.height);
      ctx.strokeStyle = 'rgba(122, 108, 80, 0.16)';
      ctx.lineWidth = 1;
      for (let i = 0; i < r.width * r.height / 380; i++) {
        const x = Math.random() * r.width;
        const y = Math.random() * r.height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + (Math.random() - 0.5) * 14, y + (Math.random() - 0.5) * 4);
        ctx.stroke();
      }
      ctx.fillStyle = '#7a6c50';
      ctx.font = `600 15px ${getComputedStyle(el).getPropertyValue('--serif') || 'serif'}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`${label}  ·  ↔`, r.width / 2, r.height / 2);
    };
    paint();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(paint) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [done, label]);

  const at = (e: PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const scratch = (e: PointerEvent<HTMLCanvasElement>) => {
    const ctx = canvas.current?.getContext('2d');
    if (!ctx) return;
    const p = at(e);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 30;
    ctx.beginPath();
    const from = last.current ?? p;
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    last.current = p;
    if (++moves.current % 8 === 0) {
      const cv = canvas.current!;
      const data = ctx.getImageData(0, 0, cv.width, cv.height).data;
      let clear = 0;
      let n = 0;
      for (let i = 3; i < data.length; i += 64) {
        n++;
        if (data[i] === 0) clear++;
      }
      if (n && clear / n >= threshold) reveal();
    }
  };

  return (
    <div className={`scratch ${done ? 'done' : ''}`} ref={wrap}>
      <div className="scratch-under" aria-hidden={!done}>
        {children}
      </div>
      {!done && !reduced && (
        <canvas
          ref={canvas}
          className="scratch-cover"
          aria-hidden
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            last.current = null;
            scratch(e);
          }}
          onPointerMove={(e) => e.buttons && scratch(e)}
          onPointerUp={() => (last.current = null)}
        />
      )}
      {!done && reduced && (
        <div className="scratch-cover plain" aria-hidden>
          {label}
        </div>
      )}
      {!done && (
        <button className="scratch-skip" onClick={reveal}>
          直接揭开
        </button>
      )}
    </div>
  );
}
