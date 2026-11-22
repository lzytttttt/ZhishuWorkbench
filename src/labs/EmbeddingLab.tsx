import { useMemo, useState } from 'react';
import type { WordVec } from '../data/types';
import EmbeddingSpace from '../three/EmbeddingSpace';

const AXES: [string, string, string] = ['体型大小', '温顺程度', '野性指数'];

const INITIAL: WordVec[] = [
  { name: '猫', v: [2.5, 6.5, 4] },
  { name: '狗', v: [4, 8.5, 2.5] },
  { name: '仓鼠', v: [1, 7, 2] },
  { name: '兔子', v: [1.5, 8, 3] },
  { name: '老虎', v: [7.5, 1.5, 9.5] },
  { name: '狮子', v: [8, 2, 9.5] },
  { name: '狼', v: [5.5, 2, 9] },
  { name: '大象', v: [10, 6, 6] },
  { name: '鲸鱼', v: [10, 7, 7.5] },
  { name: '羊', v: [4.5, 8.5, 3] },
  { name: '马', v: [7, 7, 4] },
  { name: '老鼠', v: [0.8, 3, 7] },
  { name: '鹦鹉', v: [1.2, 6, 5] },
  { name: '熊猫', v: [7, 6.5, 6.5] },
];

const dist = (a: WordVec, b: WordVec) => Math.hypot(a.v[0] - b.v[0], a.v[1] - b.v[1], a.v[2] - b.v[2]);
function cosine(a: WordVec, b: WordVec) {
  const x = a.v.map((v) => v - 5);
  const y = b.v.map((v) => v - 5);
  const dot = x[0] * y[0] + x[1] * y[1] + x[2] * y[2];
  const n = Math.hypot(...x) * Math.hypot(...y);
  return n ? dot / n : 0;
}

export default function EmbeddingLab() {
  const [words, setWords] = useState<WordVec[]>(INITIAL);
  const [selected, setSelected] = useState<string[]>(['猫', '老虎']);
  const [draft, setDraft] = useState<{ name: string; v: [number, number, number] }>({ name: '', v: [5, 5, 5] });

  const toggle = (name: string) =>
    setSelected((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name].slice(-2)));

  const [a, b] = selected.map((n) => words.find((w) => w.name === n));
  const neighbors = useMemo(() => {
    if (!a) return [];
    return words
      .filter((w) => w.name !== a.name)
      .map((w) => ({ w, d: dist(a, w) }))
      .sort((x, y) => x.d - y.d)
      .slice(0, 4);
  }, [a, words]);

  const addWord = () => {
    const name = draft.name.trim();
    if (!name || words.some((w) => w.name === name)) return;
    setWords((ws) => [...ws, { name, v: draft.v, custom: true }]);
    setSelected([name]);
    setDraft({ name: '', v: [5, 5, 5] });
  };

  const cos = a && b ? cosine(a, b) : null;

  return (
    <div className="lab emb-lab">
      <div className="emb-stage">
        <EmbeddingSpace words={words} selected={selected} onToggle={toggle} axes={AXES} />
        <div className="emb-hint">拖动旋转 · 点击两个点比较语义距离</div>
      </div>
      <aside className="emb-side">
        <div className="emb-card">
          <small>已选择</small>
          <div className="emb-pair">
            <span className="w">{a?.name ?? '—'}</span>
            <span className="vs">⟷</span>
            <span className="w">{b?.name ?? '—'}</span>
          </div>
          {a && b && cos !== null ? (
            <div className="emb-metrics">
              <div>
                <small>欧氏距离</small>
                <b className="mono">{dist(a, b).toFixed(2)}</b>
              </div>
              <div>
                <small>余弦相似度</small>
                <b className="mono" style={{ color: cos > 0.5 ? '#1d7453' : cos < 0 ? '#be3448' : '#a67214' }}>
                  {cos.toFixed(2)}
                </b>
              </div>
              <div className="cos-bar">
                <span style={{ left: `${((cos + 1) / 2) * 100}%` }} />
              </div>
              <p className="muted small">夹角越小（余弦越接近 1），两个词在语义空间里越“像”。</p>
            </div>
          ) : (
            <p className="muted small">再选择一个词进行比较。</p>
          )}
        </div>

        {a && (
          <div className="emb-card">
            <small>“{a.name}”的最近邻居</small>
            {neighbors.map(({ w, d }) => (
              <button key={w.name} className="nb-row" onClick={() => setSelected([a.name, w.name])}>
                <span>{w.name}</span>
                <span className="nb-bar">
                  <i style={{ width: `${Math.max(6, 100 - d * 9)}%` }} />
                </span>
                <span className="mono">{d.toFixed(1)}</span>
              </button>
            ))}
          </div>
        )}

        <div className="emb-card">
          <small>放置一个新词（学生给出坐标）</small>
          <input className="search" placeholder="例如：企鹅" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          {AXES.map((ax, i) => (
            <label key={ax} className="range-field">
              <span>{ax}</span>
              <input
                type="range"
                min={0}
                max={10}
                step={0.5}
                value={draft.v[i]}
                onChange={(e) => {
                  const v = [...draft.v] as [number, number, number];
                  v[i] = Number(e.target.value);
                  setDraft({ ...draft, v });
                }}
              />
              <b className="mono">{draft.v[i]}</b>
            </label>
          ))}
          <button className="btn primary sm" onClick={addWord} disabled={!draft.name.trim()}>
            ＋ 放入语义星图
          </button>
        </div>
      </aside>
    </div>
  );
}
