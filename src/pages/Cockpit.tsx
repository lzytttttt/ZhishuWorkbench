import { useEffect, useState } from 'react';
import PageHeader from '../components/PageHeader';
import Ring from '../components/Ring';
import { LESSONS, PART_MAP, PARTS, PHASES } from '../data/curriculum';
import { THREE_LAWS } from '../data/governance';
import { pageMeta } from '../data/nav';
import type { PartId, PhaseId } from '../data/types';
import { navigate } from '../hooks/useHashRoute';
import { useApp } from '../store/AppContext';
import CognitiveHeart from '../three/CognitiveHeart';
import { cv } from '../utils/css';

type Sel = PartId | PhaseId;

export default function Cockpit({ sub }: { sub?: string }) {
  const { item, tab, tabs } = pageMeta('cockpit', sub);
  return (
    <div className="page cockpit-page">
      <PageHeader route="cockpit" title={item.label} desc={tab.desc} tabs={tabs} active={tab.id} />
      <div className="tab-pane" key={tab.id}>
        {tab.id === 'laws' ? <Laws /> : tab.id === 'judge' ? <ThirtySecondJudge /> : <Anatomy />}
      </div>
    </div>
  );
}

/* ---------------- 五件套架构：3D 认知心脏 + 检视面板 ---------------- */
function Anatomy() {
  const { aiFree } = useApp();
  const [sel, setSel] = useState<Sel>('heart');
  const part = PARTS.find((p) => p.id === sel);
  const phase = PHASES.find((p) => p.id === sel);
  const related = LESSONS.filter((l) => (part ? l.part === part.id : l.phase === sel));
  const accent = part?.color ?? phase?.color ?? '#1d1d1f';

  return (
    <div className="cockpit">
      <section className="stage panel">
        <div className="stage-head slim">
          <div className="stage-legend inline">
            {PARTS.map((p) => (
              <button key={p.id} className={`legend-chip ${sel === p.id ? 'on' : ''}`} style={cv({ '--c': p.color })} onClick={() => setSel(p.id)}>
                <i />
                {p.name}
              </button>
            ))}
          </div>
        </div>
        <div className="stage-canvas">
          <CognitiveHeart selected={sel} onSelect={setSel} dormant={aiFree} />
          {aiFree && <div className="dormant-note">AI-Free 时段 · 心脏停了一会儿——此刻请用纸笔独立推演</div>}
        </div>
        <div className="phase-rail">
          {PHASES.map((p, i) => (
            <button key={p.id} className={`phase-btn ${sel === p.id ? 'on' : ''}`} style={cv({ '--c': p.color })} onClick={() => setSel(p.id)}>
              <span className="idx">0{i + 1}</span>
              <b>{p.name}</b>
              <small>{p.verb}</small>
            </button>
          ))}
        </div>
      </section>

      <aside className="inspector panel" style={cv({ '--c': accent })}>
        {part && (
          <>
            <div className="insp-head">
              <span className="insp-kicker">零件 · {part.reconstructs}</span>
              <h2 className="insp-title">{part.name}</h2>
              <div className="insp-en">{part.en}</div>
            </div>
            <p className="insp-body">{part.summary}</p>
            <ul className="insp-points">
              {part.points.map((pt) => (
                <li key={pt}>{pt}</li>
              ))}
            </ul>
          </>
        )}
        {phase && (
          <>
            <div className="insp-head">
              <span className="insp-kicker">螺旋阶段 · {phase.verb}</span>
              <h2 className="insp-title">{phase.name}</h2>
              <div className="insp-en">{phase.en}</div>
            </div>
            <div className="role-card">
              <small>学生角色</small>
              <b>{phase.role}</b>
              <span>{phase.roleEn}</span>
            </div>
            <p className="insp-body">{phase.desc}</p>
          </>
        )}
        <div className="related">
          <div className="label">关联课程 · {related.length}</div>
          {related.map((l) => (
            <button key={l.id} className="related-item" onClick={() => navigate(`curriculum/${l.id}`)}>
              <span className="dot" style={{ background: PART_MAP[l.part].color }} />
              <span className="ri-text">
                {l.title}
                <em>{l.hook}</em>
              </span>
              <span className="ri-arrow">→</span>
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}

/* ---------------- 三大铁律 ---------------- */
function Laws() {
  return (
    <div className="law-cards">
      {THREE_LAWS.map((l) => (
        <article key={l.no} className="panel law-card">
          <span className="lc-no">{l.no}</span>
          <h3>{l.title}</h3>
          <small>{l.en}</small>
          <p>{l.desc}</p>
        </article>
      ))}
    </div>
  );
}

const JUDGE_QS = ['移除 LLM 后，课程的知识主线是否立即失效？', '移除 LLM 后，探究任务是否无法开展？', '移除 LLM 后，评价机制是否失去依据？'];

function ThirtySecondJudge() {
  const [ans, setAns] = useState<(boolean | null)[]>([null, null, null]);
  const [left, setLeft] = useState(30);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    if (left <= 0) {
      setRunning(false);
      return;
    }
    const t = window.setTimeout(() => setLeft((l) => l - 1), 1000);
    return () => window.clearTimeout(t);
  }, [running, left]);

  const done = ans.every((a) => a !== null);
  const native = done && ans.every((a) => a === true);
  const set = (i: number, v: boolean) => {
    if (!running && left === 30) setRunning(true);
    setAns((prev) => prev.map((x, k) => (k === i ? v : x)));
  };
  const reset = () => {
    setAns([null, null, null]);
    setLeft(30);
    setRunning(false);
  };

  useEffect(() => {
    if (done) setRunning(false);
  }, [done]);

  return (
    <section className="judge30 panel">
      <div className="judge-body">
        <Ring value={left / 30} size={92} stroke={6} color={left > 10 ? '#1b6b93' : '#c83e2b'}>
          <b className="mono">{left}s</b>
        </Ring>
        <div className="judge-qs">
          {JUDGE_QS.map((q, i) => (
            <div key={q} className="judge-q">
              <span>{q}</span>
              <div className="yn">
                <button className={ans[i] === true ? 'on yes' : ''} onClick={() => set(i, true)}>
                  是
                </button>
                <button className={ans[i] === false ? 'on no' : ''} onClick={() => set(i, false)}>
                  否
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className={`verdict ${done ? (native ? 'native' : 'enabled') : ''}`}>
        {done ? (
          native ? (
            <>
              <b>AI Native · 智能原生</b>
              <span>移除 LLM 后知识主线、探究任务与评价机制全部失效——这套课程从第一天起就围绕 LLM 构建。</span>
            </>
          ) : (
            <>
              <b>AI-Enabled · 外挂插件</b>
              <span>抽离 LLM 后课程依然成立，它只是在传统课程上附加了 AI 体验环节。</span>
            </>
          )
        ) : (
          <span className="muted">回答三个问题，得出判定结论。</span>
        )}
        <button className="btn ghost sm" onClick={reset}>
          重置
        </button>
      </div>
    </section>
  );
}
