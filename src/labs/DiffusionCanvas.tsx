import { useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';

const N = 32;
type RGB = [number, number, number];

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussianField(seed: number): Float32Array {
  const r = mulberry32(seed);
  const out = new Float32Array(N * N * 3);
  for (let i = 0; i < out.length; i++) {
    const u = Math.max(1e-6, r());
    const v = r();
    out[i] = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }
  return out;
}

const d = (x: number, y: number, cx: number, cy: number) => Math.hypot(x - cx, y - cy);

interface Target {
  id: string;
  label: string;
  prompt: string;
  draw: (x: number, y: number) => RGB;
}

const TARGETS: Target[] = [
  {
    id: 'smile',
    label: '笑脸',
    prompt: '一张黄色的笑脸',
    draw: (x, y) => {
      if (d(x, y, 15.5, 15.5) <= 12.5) {
        if (d(x, y, 11, 12) < 2.2 || d(x, y, 20, 12) < 2.2) return [40, 30, 60];
        const rm = d(x, y, 15.5, 15);
        if (y > 17 && rm > 6 && rm < 8.4) return [120, 40, 60];
        return [245, 196, 81];
      }
      return [22, 28, 58];
    },
  },
  {
    id: 'moon',
    label: '新月',
    prompt: '夜空中的一弯新月',
    draw: (x, y) => {
      if (d(x, y, 15, 16) < 11 && d(x, y, 20, 12) > 9.5) return [240, 232, 205];
      if ((x * 7 + y * 13) % 29 === 0 && y < 27) return [200, 210, 255];
      return [10, 14, 38];
    },
  },
  {
    id: 'house',
    label: '小房子',
    prompt: '草地上的一座小房子',
    draw: (x, y) => {
      if (y >= 26) return [62, 170, 110];
      if (y >= 6 && y < 15) {
        const hw = ((y - 6) / 9) * 11;
        if (Math.abs(x - 15.5) <= hw) return [255, 93, 115];
      }
      if (y >= 15 && y < 26 && x >= 7 && x <= 24) {
        if (x >= 14 && x <= 17 && y >= 19) return [120, 70, 50];
        if (x >= 9 && x <= 12 && y >= 17 && y <= 20) return [71, 215, 255];
        return [239, 230, 210];
      }
      return [90, 150, 215];
    },
  },
];

function targetField(t: Target): Float32Array {
  const out = new Float32Array(N * N * 3);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const c = t.draw(x, y);
      for (let k = 0; k < 3; k++) out[(y * N + x) * 3 + k] = (c[k] / 255) * 2 - 1;
    }
  return out;
}

function compose(target: Float32Array, noise: Float32Array, t: number, out: Uint8ClampedArray) {
  const a = Math.sqrt(1 - t);
  const b = Math.sqrt(t);
  for (let p = 0; p < N * N; p++) {
    for (let c = 0; c < 3; c++) {
      const i = p * 3 + c;
      const v = a * target[i] + b * noise[i] * 0.9;
      out[p * 4 + c] = Math.max(0, Math.min(255, (v + 1) * 127.5));
    }
    out[p * 4 + 3] = 255;
  }
}

function paint(canvas: HTMLCanvasElement | null, target: Float32Array, noise: Float32Array, t: number): Uint8ClampedArray | null {
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const img = ctx.createImageData(N, N);
  compose(target, noise, t, img.data);
  ctx.putImageData(img, 0, 0);
  return img.data;
}

function Thumb({ target, noise, t }: { target: Float32Array; noise: Float32Array; t: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    paint(ref.current, target, noise, t);
  }, [target, noise, t]);
  return (
    <div className="thumb">
      <canvas ref={ref} width={N} height={N} />
      <span className="mono">t={t.toFixed(1)}</span>
    </div>
  );
}

export default function DiffusionCanvas() {
  const [tid, setTid] = useState(TARGETS[0].id);
  const [t, setT] = useState(0);
  const [seed, setSeed] = useState(7);
  const [playing, setPlaying] = useState<'none' | 'forward' | 'reverse'>('none');
  const [hover, setHover] = useState<{ x: number; y: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const bufRef = useRef<Uint8ClampedArray | null>(null);

  const target = TARGETS.find((x) => x.id === tid) ?? TARGETS[0];
  const field = useMemo(() => targetField(target), [target]);
  const noise = useMemo(() => gaussianField(seed), [seed]);

  useEffect(() => {
    bufRef.current = paint(canvasRef.current, field, noise, t);
  }, [field, noise, t]);

  useEffect(() => {
    if (playing === 'none') return;
    const iv = window.setInterval(() => {
      setT((cur) => {
        const next = playing === 'forward' ? cur + 0.02 : cur - 0.02;
        if (next >= 1 || next <= 0) {
          setPlaying('none');
          return Math.max(0, Math.min(1, next));
        }
        return next;
      });
    }, 55);
    return () => window.clearInterval(iv);
  }, [playing]);

  const onMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = Math.floor(((e.clientX - r.left) / r.width) * N);
    const y = Math.floor(((e.clientY - r.top) / r.height) * N);
    if (x >= 0 && x < N && y >= 0 && y < N) setHover({ x, y });
  };

  const lens: number[][] = [];
  if (hover && bufRef.current) {
    for (let dy = -2; dy <= 2; dy++) {
      const row: number[] = [];
      for (let dx = -2; dx <= 2; dx++) {
        const x = Math.min(N - 1, Math.max(0, hover.x + dx));
        const y = Math.min(N - 1, Math.max(0, hover.y + dy));
        const p = (y * N + x) * 4;
        const buf = bufRef.current;
        row.push(Math.round(0.299 * buf[p] + 0.587 * buf[p + 1] + 0.114 * buf[p + 2]));
      }
      lens.push(row);
    }
  }

  const stage = t < 0.08 ? '清晰画面' : t > 0.92 ? '纯高斯噪声' : t < 0.5 ? '轮廓尚存' : '雪花主导';

  return (
    <div className="lab diff-lab">
      <div className="diff-grid">
        <div className="diff-canvas-wrap">
          <canvas ref={canvasRef} width={N} height={N} className="diff-canvas" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
          <div className="diff-overlay mono">
            <span>32 × 32 px</span>
            <span>
              t = {t.toFixed(2)} · {stage}
            </span>
          </div>
        </div>

        <div className="diff-side">
          <div className="lab-controls">
            <small className="muted">文本语义引导（同一团噪声，不同的文字）</small>
            <div className="row">
              {TARGETS.map((x) => (
                <button key={x.id} className={`chip ${tid === x.id ? 'on' : ''}`} onClick={() => setTid(x.id)}>
                  “{x.prompt}”
                </button>
              ))}
            </div>
            <label className="range-field wide">
              <span>噪声强度 t</span>
              <input type="range" min={0} max={1} step={0.01} value={t} onChange={(e) => setT(Number(e.target.value))} />
              <b className="mono">{t.toFixed(2)}</b>
            </label>
            <div className="row">
              <button className="btn" onClick={() => setPlaying('forward')} disabled={playing !== 'none'}>
                → 前向加噪
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  setT(1);
                  window.setTimeout(() => setPlaying('reverse'), 60);
                }}
                disabled={playing !== 'none'}
              >
                ← 逆向去噪（雕刻）
              </button>
              <button className="btn ghost" onClick={() => setSeed((s) => s + 1)}>
                换一团噪声
              </button>
            </div>
          </div>

          <div className="lens">
            <small>👁 AI 的眼睛看到的（悬停画面，查看 5×5 像素亮度值）</small>
            {lens.length ? (
              <div className="lens-grid mono">
                {lens.flat().map((v, i) => (
                  <span key={i} style={{ background: `rgb(${v},${v},${v})`, color: v > 140 ? '#070912' : '#e9edf8' }} className={i === 12 ? 'center' : ''}>
                    {v}
                  </span>
                ))}
              </div>
            ) : (
              <div className="lens-empty">把鼠标移到左侧画面上</div>
            )}
          </div>
        </div>
      </div>

      <div className="diff-strip">
        <small className="muted">前向加噪过程：清晰画面一步步变成“高斯雪花”；模型训练的，是把这条路倒着走回来。</small>
        <div className="thumbs">
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((tt) => (
            <Thumb key={tt} target={field} noise={noise} t={tt} />
          ))}
        </div>
      </div>
    </div>
  );
}
