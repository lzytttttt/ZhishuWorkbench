import { useEffect, useState } from 'react';
import Ring from '../components/Ring';
import { LESSONS, PART_MAP, PARTS, PHASES, PROJECTS } from '../data/curriculum';
import { THREE_LAWS } from '../data/governance';
import type { PartId, PhaseId } from '../data/types';
import { navigate } from '../hooks/useHashRoute';
import { useApp } from '../store/AppContext';
import CognitiveHeart from '../three/CognitiveHeart';
import { cv, pct } from '../utils/css';
import { aiFreeRatio } from '../utils/plan';

type Sel = PartId | PhaseId;

export default function Cockpit() {
  const { aiFree, badcases, plan } = useApp();
  const [sel, setSel] = useState<Sel>('heart');
  const part = PARTS.find((p) => p.id === sel);
  const phase = PHASES.find((p) => p.id === sel);
  const related = LESSONS.filter((l) => (part ? l.part === part.id : l.phase === sel));
  const ratio = aiFreeRatio(plan);
  const accent = part?.color ?? phase?.color ?? '#1d1d1f';
  const evalSet = badcases.filter((b) => b.status === 'regression').length;

  return (
    <div className="page cockpit">
      <section className="stage panel">
        <div className="stage-head">
          <div>
            <div className="eyebrow">AI NATIVE ANATOMY · 五件套 × 螺旋认知环</div>
            <h1 className="display">
              让学生成为 <em>AI 系统的导演</em>
            </h1>
            <p className="lead">以大语言模型为“认知心脏”，把 AI4K12 五大概念重构为可解剖、可触摸的原生架构。拖动旋转，点击零件或螺旋节点查看关联课程。</p>
          </div>
          <div className="stage-legend">
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

      <section className="kpi-row">
        <div className="kpi panel">
          <div className="kpi-label">课时结构</div>
          <div className="kpi-val">
            8 <span>+</span> 8
          </div>
          <div className="kpi-sub">核心通识必修 + 跨学科 PBL 拓展</div>
        </div>
        <div className="kpi panel kpi-ring">
          <Ring value={ratio} size={86} stroke={8} color={ratio >= 0.25 ? '#1d7453' : '#c83e2b'} mark={0.25}>
            <b>{pct(ratio)}</b>
          </Ring>
          <div>
            <div className="kpi-label">当前备课 AI-Free 占比</div>
            <div className="kpi-sub">{ratio >= 0.25 ? '满足铁律二（≥ 25%）' : '低于 25%，请调整课时编排'}</div>
            <button className="btn ghost sm" onClick={() => navigate('composer')}>
              打开备课编排 →
            </button>
          </div>
        </div>
        <div className="kpi panel">
          <div className="kpi-label">Badcase 数据飞轮</div>
          <div className="kpi-val">
            {badcases.length}
            <span className="kpi-unit">条</span>
          </div>
          <div className="kpi-sub">已沉淀为回归评估集 {evalSet} 条</div>
        </div>
        <div className="kpi panel">
          <div className="kpi-label">课程资源</div>
          <div className="kpi-val">
            {LESSONS.length}
            <span className="kpi-unit">单元</span>
            {PROJECTS.length}
            <span className="kpi-unit">PBL</span>
          </div>
          <div className="kpi-sub">覆盖 4 条工程范式轨道 × 4 个螺旋阶段</div>
        </div>
      </section>

      <section className="laws panel">
        <div className="section-title">
          <span className="eyebrow">THREE IRON LAWS</span>
          <h3>捍卫人类认知主权的三大课堂铁律</h3>
        </div>
        <div className="law-list">
          {THREE_LAWS.map((l) => (
            <div key={l.no} className="law">
              <div className="law-no">{l.no}</div>
              <div>
                <b>{l.title}</b>
                <small>{l.en}</small>
                <p>{l.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <ThirtySecondJudge />
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
      <div className="section-title">
        <span className="eyebrow">30-SECOND TEST</span>
        <h3>30 秒判定法</h3>
        <p className="muted">把 LLM 从课程体系中抽离——它还能照常运转吗？</p>
      </div>
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
