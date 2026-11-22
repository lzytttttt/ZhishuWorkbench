import { useEffect, useMemo, useRef, useState } from 'react';

type Genre = 'science' | 'wuxia' | 'mix';

const CORPORA: Record<'science' | 'wuxia', string> = {
  science:
    '春天 来了 ， 花 开了 。 花 需要 阳光 和 水 。 阳光 让 植物 长大 。 植物 需要 水 和 阳光 。 小鸟 在 树上 唱歌 。 树上 有 很多 叶子 。 叶子 会 变成 黄色 。 春天 来了 ， 小鸟 飞 回来 了 。 月亮 绕着 地球 转 。 地球 绕着 太阳 转 。 太阳 让 植物 长大 。 月亮 照亮 了 夜空 。 小鸟 需要 水 。',
  wuxia:
    '少侠 拔出 长剑 。 长剑 闪着 寒光 。 寒光 照亮 了 山谷 。 山谷 里 有 一位 老 剑客 。 老 剑客 在 树上 喝酒 。 少侠 飞 上 树上 。 月亮 照亮 了 山谷 。 少侠 和 剑客 比武 。 剑客 拔出 长剑 。 春天 来了 ， 少侠 下山 了 。 剑客 飞 上 屋顶 。 月亮 照亮 了 长剑 。',
};

const STARTS = ['春天', '月亮', '少侠', '小鸟', '阳光'];

type Model = Map<string, Map<string, number>>;

function buildModel(text: string): Model {
  const toks = text.split(/\s+/).filter(Boolean);
  const m: Model = new Map();
  for (let i = 0; i < toks.length - 1; i++) {
    const a = toks[i];
    const b = toks[i + 1];
    if (!m.has(a)) m.set(a, new Map());
    const row = m.get(a)!;
    row.set(b, (row.get(b) ?? 0) + 1);
  }
  return m;
}

interface Entry {
  tok: string;
  count: number;
  p: number;
}

function distribution(model: Model, cur: string, T: number): Entry[] {
  const row = model.get(cur);
  if (!row) return [];
  const entries: Entry[] = Array.from(row.entries()).map(([tok, count]) => ({ tok, count, p: 0 }));
  if (T < 0.05) {
    const max = Math.max(...entries.map((e) => e.count));
    entries.forEach((e) => (e.p = e.count === max ? 1 : 0));
    const winners = entries.filter((e) => e.p > 0);
    winners.forEach((e) => (e.p = 1 / winners.length));
  } else {
    const w = entries.map((e) => Math.pow(e.count, 1 / T));
    const s = w.reduce((a, b) => a + b, 0);
    entries.forEach((e, i) => (e.p = w[i] / s));
  }
  return entries.sort((a, b) => b.p - a.p || b.count - a.count);
}

function sample(dist: Entry[], T: number): Entry | null {
  if (!dist.length) return null;
  if (T < 0.05) return dist[0];
  let r = Math.random();
  for (const e of dist) {
    r -= e.p;
    if (r <= 0) return e;
  }
  return dist[dist.length - 1];
}

interface Step {
  tok: string;
  p: number;
}

export default function TemperatureDice() {
  const [genre, setGenre] = useState<Genre>('mix');
  const [temp, setTemp] = useState(0.8);
  const [start, setStart] = useState('春天');
  const [seq, setSeq] = useState<Step[]>([{ tok: '春天', p: 1 }]);
  const [rolling, setRolling] = useState(false);
  const [auto, setAuto] = useState(0);
  const [showRaw, setShowRaw] = useState(false);
  const last = useRef<string | null>(null);

  const model = useMemo(() => {
    const text = genre === 'mix' ? `${CORPORA.science} ${CORPORA.wuxia}` : CORPORA[genre];
    return buildModel(text);
  }, [genre]);

  const cur = seq[seq.length - 1].tok;
  const dist = useMemo(() => distribution(model, cur, temp), [model, cur, temp]);
  const top = dist.slice(0, 7);

  const roll = () => {
    const pick = sample(dist, temp);
    if (!pick) return;
    last.current = pick.tok;
    setRolling(true);
    window.setTimeout(() => setRolling(false), 380);
    setSeq((s) => [...s, { tok: pick.tok, p: pick.p }]);
  };

  useEffect(() => {
    if (auto <= 0) return;
    const t = window.setTimeout(() => {
      roll();
      setAuto((a) => a - 1);
    }, 260);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, seq]);

  const reset = (s = start) => {
    setAuto(0);
    setSeq([{ tok: s, p: 1 }]);
    last.current = null;
  };

  const lowProb = seq.slice(1).filter((s) => s.p < 0.25).length;
  const tempLabel = temp < 0.05 ? '贪心 · 绝对零度' : temp < 0.6 ? '低温 · 严谨求真' : temp < 1.2 ? '常温 · 平衡' : '高温 · 脑洞大开';
  const tempColor = temp < 0.6 ? '#1b6b93' : temp < 1.2 ? '#1d7453' : '#9a386c';

  return (
    <div className="lab dice-lab">
      <div className="dice-grid">
        <div className="dice-left">
          <div className="lab-controls">
            <div className="row">
              <span className="muted">语料</span>
              <div className="segmented">
                <button className={genre === 'science' ? 'on' : ''} onClick={() => setGenre('science')}>
                  科普文
                </button>
                <button className={genre === 'wuxia' ? 'on' : ''} onClick={() => setGenre('wuxia')}>
                  武侠
                </button>
                <button className={genre === 'mix' ? 'on' : ''} onClick={() => setGenre('mix')}>
                  混搭生成器
                </button>
              </div>
            </div>
            <div className="row">
              <span className="muted">起始词</span>
              {STARTS.map((s) => (
                <button
                  key={s}
                  className={`chip ${start === s ? 'on' : ''}`}
                  onClick={() => {
                    setStart(s);
                    reset(s);
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="gen-paper">
            <div className="gen-text">
              {seq.map((s, i) => (
                <span key={i} className={`gen-tok ${i === 0 ? 'seed' : s.p < 0.25 ? 'wild' : ''} ${i === seq.length - 1 && i > 0 ? 'fresh' : ''}`} title={i ? `采样概率 ${(s.p * 100).toFixed(0)}%` : '起始词'}>
                  {s.tok}
                </span>
              ))}
              <span className="caret" />
            </div>
            <div className="gen-foot">
              <span>已生成 {seq.length - 1} 个 Token</span>
              <span className={lowProb ? 'warn-text' : ''}>低概率“脑洞”词 {lowProb} 个</span>
            </div>
          </div>

          <div className="row">
            <button className="btn primary" onClick={roll} disabled={!dist.length}>
              🎲 掷骰子 · 下一个词
            </button>
            <button className="btn" onClick={() => setAuto(12)} disabled={!dist.length || auto > 0}>
              ▶ 自动续写 12 步
            </button>
            <button className="btn ghost" onClick={() => reset()}>
              重置
            </button>
          </div>
        </div>

        <div className="dice-right">
          <div className="thermo-block">
            <svg className="thermo" width="64" height="220" viewBox="0 0 64 220">
              <defs>
                <linearGradient id="thermoG" x1="0" y1="1" x2="0" y2="0">
                  <stop offset="0" stopColor="#1b6b93" />
                  <stop offset=".5" stopColor="#1d7453" />
                  <stop offset="1" stopColor="#9a386c" />
                </linearGradient>
              </defs>
              <rect x="24" y="10" width="16" height="170" rx="8" fill="rgba(28,25,23,.06)" stroke="rgba(28,25,23,.16)" />
              <rect x="28" y={176 - (temp / 2) * 160} width="8" height={(temp / 2) * 160 + 6} rx="4" fill="url(#thermoG)" style={{ transition: 'all .3s' }} />
              <circle cx="32" cy="194" r="16" fill={tempColor} opacity=".9" />
              {[0, 0.5, 1, 1.5, 2].map((v) => (
                <g key={v}>
                  <line x1="44" x2="52" y1={176 - (v / 2) * 160} y2={176 - (v / 2) * 160} stroke="rgba(28,25,23,.3)" />
                  <text x="56" y={180 - (v / 2) * 160} className="thermo-tick">
                    {v}
                  </text>
                </g>
              ))}
            </svg>
            <div className="thermo-info">
              <small>Temperature</small>
              <b className="mono" style={{ color: tempColor }}>
                {temp.toFixed(2)}
              </b>
              <span>{tempLabel}</span>
              <input type="range" min={0} max={2} step={0.05} value={temp} onChange={(e) => setTemp(Number(e.target.value))} />
            </div>
          </div>

          <div className={`die ${rolling ? 'rolling' : ''}`}>
            <svg viewBox="0 0 100 100" width="84" height="84">
              <polygon points="50,4 92,30 92,70 50,96 8,70 8,30" fill="rgba(154,56,108,.08)" stroke="#9a386c" strokeWidth="2" />
              <polygon points="50,4 92,30 50,50 8,30" fill="rgba(154,56,108,.05)" />
              <line x1="50" y1="50" x2="50" y2="96" stroke="rgba(154,56,108,.4)" />
              <text x="50" y="62" textAnchor="middle" className="die-text">
                {seq.length > 1 ? `${Math.round(seq[seq.length - 1].p * 100)}%` : '?'}
              </text>
            </svg>
          </div>

          <div className="dist">
            <div className="dist-head">
              <span>
                “<b>{cur}</b>” 后面可能出现…
              </span>
              <label className="toggle inline">
                <input type="checkbox" checked={showRaw} onChange={(e) => setShowRaw(e.target.checked)} />
                <span className="tg" />
                <span>原始频次</span>
              </label>
            </div>
            {top.length ? (
              top.map((e) => (
                <div key={e.tok} className={`bar-row ${last.current === e.tok && seq[seq.length - 1].tok === e.tok ? 'picked' : ''}`}>
                  <span className="bar-tok">{e.tok}</span>
                  <span className="bar-track">
                    <span className="bar-fill" style={{ width: `${(showRaw ? e.count / Math.max(...dist.map((d) => d.count)) : e.p) * 100}%` }} />
                  </span>
                  <span className="bar-val mono">{showRaw ? `×${e.count}` : `${(e.p * 100).toFixed(0)}%`}</span>
                </div>
              ))
            ) : (
              <p className="muted">语料中没有它的后续词，试试重置。</p>
            )}
          </div>
        </div>
      </div>
      <div className="insight-row">
        <div className="insight">
          <b>❄ 低温（T → 0）</b>
          <p>严格按最高概率选词：句子平稳但枯燥，每次结果几乎一样——适合数学推理等严谨求真任务。</p>
        </div>
        <div className="insight warn">
          <b>🔥 高温（T ↑）</b>
          <p>低概率词被放大：故事更有创意，但也更容易偏离事实、产生“胡说八道”（幻觉）——适合头脑风暴。</p>
        </div>
      </div>
    </div>
  );
}
