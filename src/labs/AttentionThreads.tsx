import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { play } from '../fun/sound';

interface Preset {
  id: string;
  label: string;
  tokens: string[];
  focus: number;
  weights: number[];
  answer: number;
  note: string;
}

const PRESETS: Preset[] = [
  {
    id: 'tired',
    label: '它太累了',
    tokens: ['动物', '没有', '穿过', '马路', '，', '因为', '它', '太', '累', '了'],
    focus: 6,
    weights: [0.52, 0.04, 0.06, 0.14, 0.01, 0.05, 0.06, 0.03, 0.07, 0.02],
    answer: 0,
    note: '“累”只能形容有生命的主体，于是“它”的注意力大量流向“动物”。',
  },
  {
    id: 'wide',
    label: '它太宽了',
    tokens: ['动物', '没有', '穿过', '马路', '，', '因为', '它', '太', '宽', '了'],
    focus: 6,
    weights: [0.12, 0.03, 0.07, 0.56, 0.01, 0.04, 0.06, 0.03, 0.06, 0.02],
    answer: 3,
    note: '只改了一个字！“宽”更适合形容道路，注意力立刻转向“马路”——上下文动态消除了歧义。',
  },
  {
    id: 'phone',
    label: '苹果 · 拍照',
    tokens: ['我', '用', '苹果', '拍', '了', '一张', '照片'],
    focus: 2,
    weights: [0.05, 0.18, 0.12, 0.38, 0.03, 0.06, 0.18],
    answer: 3,
    note: '“拍”和“照片”把多义词“苹果”拉向“手机”的含义。',
  },
  {
    id: 'fruit',
    label: '苹果 · 吃',
    tokens: ['我', '吃', '了', '一个', '红红的', '苹果'],
    focus: 5,
    weights: [0.04, 0.46, 0.04, 0.08, 0.3, 0.08],
    answer: 1,
    note: '“吃”与“红红的”让“苹果”回到水果的含义。',
  },
];

function heuristicRow(n: number, i: number): number[] {
  const row = Array.from({ length: n }, (_, j) => {
    const d = Math.abs(i - j);
    return d === 0 ? 0.35 : d === 1 ? 0.2 : d === 2 ? 0.08 : 0.03;
  });
  const s = row.reduce((a, b) => a + b, 0);
  return row.map((v) => v / s);
}

export default function AttentionThreads() {
  const [pid, setPid] = useState(PRESETS[0].id);
  const preset = PRESETS.find((p) => p.id === pid) ?? PRESETS[0];
  const [guess, setGuess] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [view, setView] = useState<'threads' | 'matrix'>('threads');
  const [pull, setPull] = useState<{ x: number; y: number } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const n = preset.tokens.length;
  const matrix = useMemo(() => preset.tokens.map((_, i) => (i === preset.focus ? preset.weights : heuristicRow(n, i))), [preset, n]);

  const W = 820;
  const H = 300;
  const baseY = 236;
  const gap = W / n;
  const xOf = (i: number) => gap * i + gap / 2;
  const fx = xOf(preset.focus);

  const arc = (j: number) => {
    const x2 = xOf(j);
    const h = Math.min(200, 40 + Math.abs(x2 - fx) * 0.42);
    return `M ${fx} ${baseY - 24} Q ${(fx + x2) / 2} ${baseY - 24 - h} ${x2} ${baseY - 24}`;
  };

  /* 拉毛线：从焦点卡片按住拖出一根线，松手落在哪张卡片上就连向哪里 */
  const toSvg = (e: PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    const m = svg?.getScreenCTM();
    if (!svg || !m) return null;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const p = pt.matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  };
  const startPull = (e: PointerEvent<SVGSVGElement>) => {
    if (revealed) return;
    const p = toSvg(e);
    if (!p || Math.abs(p.x - fx) > gap / 2 || Math.abs(p.y - baseY) > 30) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setPull(p);
  };
  const movePull = (e: PointerEvent<SVGSVGElement>) => {
    if (!pull) return;
    const p = toSvg(e);
    if (p) setPull(p);
  };
  const endPull = () => {
    if (!pull) return;
    const j = Math.max(0, Math.min(n - 1, Math.floor(pull.x / gap)));
    if (j !== preset.focus && pull.y > baseY - 70) {
      setGuess(j);
      play('paper');
    }
    setPull(null);
  };
  const dangle = `M ${fx} ${baseY - 24} C ${fx - 30} ${baseY - 70}, ${fx + 40} ${baseY - 110}, ${fx} ${baseY - 150}`;
  const pullPath = pull ? `M ${fx} ${baseY - 24} Q ${(fx + pull.x) / 2} ${Math.min(pull.y, baseY - 24) - 60} ${pull.x} ${pull.y}` : '';

  const choose = (id: string) => {
    setPid(id);
    setGuess(null);
    setRevealed(false);
  };

  return (
    <div className="lab attn-lab">
      <div className="lab-controls row">
        <div className="segmented">
          {PRESETS.map((p) => (
            <button key={p.id} className={pid === p.id ? 'on' : ''} onClick={() => choose(p.id)}>
              {p.label}
            </button>
          ))}
        </div>
        <div className="spacer" />
        <div className="segmented">
          <button className={view === 'threads' ? 'on' : ''} onClick={() => setView('threads')}>
            🧶 毛线连线
          </button>
          <button className={view === 'matrix' ? 'on' : ''} onClick={() => setView('matrix')}>
            ▦ 权重热力图
          </button>
        </div>
      </div>

      {view === 'threads' ? (
        <div className="attn-stage">
          <p className="attn-prompt">
            第一步（无 AI）：从高亮的“<b>{preset.tokens[preset.focus]}</b>”按住拉一根毛线，落到你认为它最该连向的卡片上（也可以直接点卡片）。
          </p>
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className={`attn-svg yarn-cursor ${pull ? 'pulling' : ''}`}
            onPointerDown={startPull}
            onPointerMove={movePull}
            onPointerUp={endPull}
            onPointerCancel={() => setPull(null)}
          >
            <defs>
              <linearGradient id="threadG" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#1b6b93" />
                <stop offset="1" stopColor="#5b4b9a" />
              </linearGradient>
            </defs>
            {revealed &&
              preset.weights.map((w, j) =>
                j === preset.focus ? null : (
                  <path key={j} d={arc(j)} fill="none" stroke="url(#threadG)" strokeWidth={1 + w * 22} strokeLinecap="round" opacity={0.25 + w * 1.3} className="thread" style={{ animationDelay: `${j * 60}ms` }} />
                ),
              )}
            {guess === null && !pull && !revealed && (
              <g className="yarn-dangle" aria-hidden>
                <path d={dangle} fill="none" stroke="#c83e2b" strokeWidth={2.4} strokeDasharray="5 5" strokeLinecap="round" />
                <circle cx={fx} cy={baseY - 164} r={14} className="yarn-q" />
                <text x={fx} y={baseY - 163} textAnchor="middle" dominantBaseline="middle" className="yarn-q-text">
                  ？
                </text>
              </g>
            )}
            {pull && <path d={pullPath} fill="none" stroke="#c83e2b" strokeWidth={3} strokeLinecap="round" className="yarn live" />}
            {guess !== null && guess !== preset.focus && !pull && <path d={arc(guess)} fill="none" stroke="#c83e2b" strokeWidth={3} strokeDasharray="6 6" className="yarn" />}
            {preset.tokens.map((t, i) => {
              const isFocus = i === preset.focus;
              const w = preset.weights[i];
              return (
                <g key={i} transform={`translate(${xOf(i)}, ${baseY})`} className={`attn-card ${isFocus ? 'focus' : ''} ${guess === i ? 'guess' : ''}`} onClick={() => !isFocus && setGuess(i)}>
                  <rect x={-gap / 2 + 6} y={-24} width={gap - 12} height={48} rx={10} />
                  <text textAnchor="middle" dominantBaseline="middle" y={1}>
                    {t}
                  </text>
                  {revealed && !isFocus && (
                    <text className="w-label" textAnchor="middle" y={44}>
                      {(w * 100).toFixed(0)}%
                    </text>
                  )}
                </g>
              );
            })}
          </svg>
          <div className="row">
            <button
              className="btn primary"
              onClick={() => {
                play('paper');
                setRevealed(true);
              }}
              disabled={revealed}
            >
              第二步：揭晓模型的注意力
            </button>
            <button
              className="btn ghost"
              onClick={() => {
                setGuess(null);
                setRevealed(false);
              }}
            >
              重来
            </button>
            {revealed && guess !== null && (
              <span className={`verdict-inline ${guess === preset.answer ? 'ok' : 'soft-miss'}`}>
                {guess === preset.answer ? '✓ 接上了：你的毛线与模型的最强连线一致' : `毛线接偏了一点——模型最强的那根连向“${preset.tokens[preset.answer]}”。这正是值得追问的地方：它看到了哪个你没注意的词？`}
              </span>
            )}
          </div>
          {revealed && <div className="insight">{preset.note}</div>}
        </div>
      ) : (
        <div className="attn-matrix">
          <div className="hm" style={{ gridTemplateColumns: `90px repeat(${n}, 1fr)` }}>
            <span />
            {preset.tokens.map((t, j) => (
              <span key={`h${j}`} className="hm-h">
                {t}
              </span>
            ))}
            {matrix.map((row, i) => (
              <div key={`r${i}`} className="hm-row" style={{ display: 'contents' }}>
                <span className={`hm-h left ${i === preset.focus ? 'focus' : ''}`}>{preset.tokens[i]}</span>
                {row.map((v, j) => (
                  <span key={j} className="hm-cell" style={{ background: `rgba(27,107,147,${Math.min(1, v * 1.8)})`, color: v * 1.8 > 0.55 ? '#ffffff' : undefined }} title={`${preset.tokens[i]} → ${preset.tokens[j]}：${(v * 100).toFixed(0)}%`}>
                    {v >= 0.1 ? (v * 100).toFixed(0) : ''}
                  </span>
                ))}
              </div>
            ))}
          </div>
          <p className="muted">每一行表示“这个词在理解自己时，把多少注意力分给了其他词”。高亮行即焦点词；其余行为示意分布。</p>
        </div>
      )}
    </div>
  );
}
