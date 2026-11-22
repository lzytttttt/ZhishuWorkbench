import { useEffect, useMemo, useState, type MouseEvent } from 'react';
import { EmptyState } from '../fun/LineArt';
import { play } from '../fun/sound';
import { useStamp } from '../fun/Stamp';
import { ARB_CASES, KIND_META, type ArbCase, type ModelOutput } from '../data/arbitration';
import type { BadcaseKind, BadcaseStatus, NewBadcase } from '../data/types';
import { describeError } from '../services/errors';
import { buildTribunalMessages } from '../services/prompts';
import { useServices } from '../services/ServiceContext';
import { STATUS_FLOW, useApp } from '../store/AppContext';
import { cv } from '../utils/css';

type Brush = BadcaseKind | 'erase';
type Flags = Record<string, BadcaseKind>;

const KINDS: BadcaseKind[] = ['hallucination', 'logic', 'bias', 'format'];
const STATUS_META: Record<BadcaseStatus, { label: string; desc: string; color: string }> = {
  found: { label: '发现', desc: '线上事故 Badcase', color: '#be3448' },
  attributed: { label: '归因', desc: '提示词 / 知识库 / 模型？', color: '#a67214' },
  fixed: { label: '修正', desc: '重构上下文或工作流', color: '#1b6b93' },
  regression: { label: '入评估集', desc: '新增回归测试用例', color: '#1d7453' },
};

const CUSTOM = 'custom';
const splitSentences = (text: string) =>
  text
    .split(/(?<=[。！？!?；;\n])/)
    .map((s) => s.trim())
    .filter(Boolean);

interface LiveState {
  question: string;
  outputs: ModelOutput[] | null;
  loading: boolean;
  error: string | null;
}
const EMPTY_LIVE: LiveState = { question: '', outputs: null, loading: false, error: null };

export default function Arbitration() {
  const [caseId, setCaseId] = useState<string>(ARB_CASES[0].id);
  const [brush, setBrush] = useState<Brush>('hallucination');
  const [flagsByCase, setFlagsByCase] = useState<Record<string, Flags>>({});
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [archived, setArchived] = useState(0);
  const [draftQ, setDraftQ] = useState('');
  const [live, setLive] = useState<LiveState>(EMPTY_LIVE);
  const { badcases, badcaseSource, badcaseError, addBadcases, advanceBadcase, removeBadcase } = useApp();
  const { llm, config } = useServices();
  const { stamp } = useStamp();
  // 飞轮转格：每归档或推进一次，飞轮真的转一格
  const [turn, setTurn] = useState(0);

  const isCustom = caseId === CUSTOM;
  const c = useMemo<ArbCase>(() => {
    if (!isCustom) return ARB_CASES.find((x) => x.id === caseId) ?? ARB_CASES[0];
    return {
      id: CUSTOM,
      title: '自定义问题',
      question: live.question || '（尚未提问）',
      hint: '自定义问题没有预置的标准答案，请用教材、字典或权威来源人工核查。',
      outputs: live.outputs ?? [],
    };
  }, [isCustom, caseId, live]);

  const flags = flagsByCase[caseId] ?? {};
  const isRevealed = !isCustom && !!revealed[caseId];

  /** 同一问题并行询问三个模型席位：任何一个失败都不影响其他两个 */
  const askLive = async (questionArg?: string, at?: Element | null) => {
    const question = (questionArg ?? draftQ).trim();
    if (!question) return;
    // 法槌敲下：开庭
    stamp({ label: '开庭', tone: 'ink', target: `三堂会审 · ${question}`, at });
    setDraftQ(question);
    setCaseId(CUSTOM);
    setLive({ question, outputs: null, loading: true, error: null });
    setFlagsByCase((p) => ({ ...p, [CUSTOM]: {} }));
    const slots = config.tribunalModels;
    const settled = await Promise.allSettled(
      slots.map((slot, i) =>
        llm.chat({
          messages: buildTribunalMessages(question),
          model: slot.id || undefined,
          temperature: 0.7,
          scenario: { id: 'tribunal.answer', question, slot: i },
        }),
      ),
    );
    const outputs: ModelOutput[] = settled.map((r, i) => {
      const sentences = r.status === 'fulfilled' ? splitSentences(r.value.content) : [`（调用失败：${describeError(r.reason)}）`];
      const modelId = r.status === 'fulfilled' ? r.value.model : slots[i].id || config.defaultModel || '默认模型';
      return { model: slots[i].label, base: `${slots[i].base} · ${modelId}`, sentences, truth: sentences.map(() => null) };
    });
    setLive({
      question,
      outputs,
      loading: false,
      error: settled.every((r) => r.status === 'rejected') ? '三个模型席位均调用失败，请检查“接口设置”' : null,
    });
  };

  const paint = (key: string) => {
    setFlagsByCase((prev) => {
      const cur: Flags = { ...(prev[caseId] ?? {}) };
      if (brush === 'erase' || cur[key] === brush) delete cur[key];
      else cur[key] = brush;
      return { ...prev, [caseId]: cur };
    });
  };

  const stats = c.outputs.map((o, mi) => {
    const counts: Record<BadcaseKind, number> = { hallucination: 0, logic: 0, bias: 0, format: 0 };
    o.sentences.forEach((_, si) => {
      const f = flags[`${mi}-${si}`];
      if (f) counts[f]++;
    });
    const flagged = KINDS.reduce((a, k) => a + counts[k], 0);
    return { counts, trust: o.sentences.length ? 1 - flagged / o.sentences.length : 1 };
  });

  let hit = 0;
  let miss = 0;
  let fp = 0;
  c.outputs.forEach((o, mi) =>
    o.truth.forEach((t, si) => {
      const f = flags[`${mi}-${si}`];
      if (t && f) hit++;
      else if (t && !f) miss++;
      else if (!t && f) fp++;
    }),
  );

  const archive = async (e: MouseEvent<HTMLButtonElement>) => {
    const at = e.currentTarget;
    const items: NewBadcase[] = [];
    c.outputs.forEach((o, mi) =>
      o.sentences.forEach((s, si) => {
        const f = flags[`${mi}-${si}`];
        if (f) items.push({ question: c.question, model: `${o.model}（${o.base}）`, excerpt: s, kind: f });
      }),
    );
    if (!items.length) return;
    stamp({ label: '采纳', target: `${items.length} 条 Badcase · ${c.question}`, at });
    setTurn((t) => t + 1);
    await addBadcases(items);
    setArchived(items.length);
  };

  useEffect(() => {
    if (!archived) return;
    const t = window.setTimeout(() => setArchived(0), 2000);
    return () => window.clearTimeout(t);
  }, [archived]);

  const totalFlags = Object.keys(flags).length;

  return (
    <div className="page arb">
      <header className="page-head">
        <div>
          <div className="eyebrow">MODEL TRIBUNAL · 鉴赏力优先于生产力</div>
          <h1 className="display sm">
            三堂会审 <em>学生是质量仲裁者</em>
          </h1>
          <p className="lead">就同一问题向三种不同底座的模型提问，用“审计画笔”标记幻觉、逻辑谬误、偏见与格式偏离；再把每一个错误送进数据飞轮。</p>
        </div>
        <span className={`mode-tag ${config.mode}`}>{config.mode === 'mock' ? 'Mock 模拟' : '真实接口'}</span>
      </header>

      <div className="case-tabs five">
        {ARB_CASES.map((x) => (
          <button key={x.id} className={`case-tab ${caseId === x.id ? 'on' : ''}`} onClick={() => setCaseId(x.id)}>
            <small>{x.title} · 教学案例</small>
            <span>{x.question}</span>
          </button>
        ))}
        <button className={`case-tab live ${isCustom ? 'on' : ''}`} onClick={() => setCaseId(CUSTOM)}>
          <small>自定义 · 实时提问</small>
          <span>{live.question || '向三个模型席位提出你自己的问题'}</span>
        </button>
      </div>

      <section className="panel tribunal">
        {isCustom ? (
          <div className="live-ask">
            <span className="q-mark">问</span>
            <input
              className="search grow"
              value={draftQ}
              placeholder="输入一个需要“三堂会审”的问题，例如：长城在太空中肉眼可见吗？"
              onChange={(e) => setDraftQ(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && askLive(undefined, e.currentTarget)}
            />
            <button className="btn primary gavel-btn" onClick={(e) => askLive(undefined, e.currentTarget)} disabled={!draftQ.trim() || live.loading}>
              {live.loading ? '三位证人作答中…' : '⚖ 敲槌开庭 · 同时询问三个模型'}
            </button>
          </div>
        ) : (
          <div className="question">
            <span className="q-mark">问</span>
            <p>{c.question}</p>
            <div className="spacer" />
            <button className="btn ghost sm" onClick={(e) => askLive(c.question, e.currentTarget)} title="用当前接口配置的三个模型重新回答本题">
              ↻ 用当前接口重新提问
            </button>
          </div>
        )}

        <div className="brushes">
          <span className="muted">审计画笔：</span>
          {KINDS.map((k) => (
            <button key={k} className={`brush ${brush === k ? 'on' : ''}`} style={cv({ '--c': KIND_META[k].color })} onClick={() => setBrush(k)} title={KIND_META[k].hint}>
              <i />
              {KIND_META[k].label}
            </button>
          ))}
          <button className={`brush erase ${brush === 'erase' ? 'on' : ''}`} onClick={() => setBrush('erase')}>
            ⌫ 擦除
          </button>
          <div className="spacer" />
          <button
            className="btn"
            onClick={() => setRevealed((r) => ({ ...r, [caseId]: !isRevealed }))}
            disabled={isCustom}
            title={isCustom ? '自定义问题没有预置核查依据，请人工核查' : undefined}
          >
            {isRevealed ? '隐藏核查结果' : '🔍 揭晓核查依据'}
          </button>
          <button className="btn primary" onClick={archive} disabled={!totalFlags}>
            {archived ? `已归档 ${archived} 条 ✓` : `采纳 · 归档为 Badcase（${totalFlags}）`}
          </button>
        </div>

        {isCustom && live.loading ? (
          <div className="models">
            {config.tribunalModels.map((s) => (
              <article key={s.label} className="model-card skeleton">
                <header>
                  <b>{s.label}</b>
                  <small>{s.base}</small>
                </header>
                <div className="sentences">
                  <div className="sk-line" />
                  <div className="sk-line" />
                  <div className="sk-line short" />
                </div>
              </article>
            ))}
          </div>
        ) : c.outputs.length ? (
          <div className="models">
            {c.outputs.map((o, mi) => (
              <article key={`${o.model}-${mi}`} className="model-card testimony" style={cv({ '--tilt': `${(mi - 1) * 0.6}deg` })}>
                <span className="testimony-tag mono" aria-hidden>
                  证词 {String.fromCharCode(65 + mi)}
                </span>
                <header>
                  <b>{o.model}</b>
                  <small>{o.base}</small>
                  <span className="trust mono" style={{ color: stats[mi].trust > 0.66 ? '#1d7453' : stats[mi].trust > 0.33 ? '#a67214' : '#be3448' }}>
                    可信度 {Math.round(stats[mi].trust * 100)}
                  </span>
                </header>
                <div className="sentences">
                  {o.sentences.map((s, si) => {
                    const key = `${mi}-${si}`;
                    const f = flags[key];
                    const t = o.truth[si];
                    const res = !isRevealed ? '' : t && f ? 'hit' : t && !f ? 'miss' : !t && f ? 'fp' : 'clean';
                    return (
                      <button key={key} className={`sentence ${f ? 'flagged' : ''} ${res}`} style={f ? cv({ '--c': KIND_META[f].color }) : undefined} onClick={() => paint(key)}>
                        {s}
                        {f && <span className="badge">{KIND_META[f].label}</span>}
                        {isRevealed && res === 'miss' && t && <span className="badge miss">漏判 · {KIND_META[t].label}</span>}
                        {isRevealed && res === 'fp' && <span className="badge fp">误判</span>}
                        {isRevealed && res === 'hit' && <span className="badge ok">✓</span>}
                      </button>
                    );
                  })}
                </div>
                <footer className="kind-count">
                  {KINDS.map((k) => (
                    <span key={k} style={cv({ '--c': KIND_META[k].color })} className={stats[mi].counts[k] ? 'on' : ''}>
                      <i />
                      {stats[mi].counts[k]}
                    </span>
                  ))}
                </footer>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState kind="scroll" title="证人席还空着" hint="输入一个问题，敲槌开庭：三个模型席位会同时作答（席位与模型 ID 可在“数据与接口”中配置）。" />
        )}

        {live.error && isCustom && <p className="err">{live.error}</p>}

        {isRevealed && (
          <div className="reveal">
            <div className="reveal-hint">
              <b>核查依据</b>
              <p>{c.hint}</p>
            </div>
            <div className="reveal-stats mono">
              <span className="ok">命中 {hit}</span>
              <span className="bad">漏判 {miss}</span>
              <span className="warn">误判 {fp}</span>
            </div>
          </div>
        )}
        {isCustom && c.outputs.length > 0 && <p className="note">{c.hint}</p>}
      </section>

      <section className="flywheel-grid">
        <div className="panel flywheel">
          <div className="section-title">
            <span className="eyebrow">EVOLUTION NATIVE</span>
            <h3>Badcase 数据飞轮</h3>
          </div>
          <Flywheel counts={STATUS_FLOW.map((s) => badcases.filter((b) => b.status === s).length)} turn={turn} />
          <p className="muted small">每一次幻觉、逻辑断层或格式偏离，都是一次“线上生产事故”——它将被转化为修正提示词、扩充知识库或迭代评估集的燃料。</p>
        </div>
        <div className="panel bc-panel">
          <div className="bc-head">
            <b>Badcase 库 · {badcases.length}</b>
            <small className="muted">
              {badcaseSource === 'mock' ? '保存在本机浏览器' : '已同步到远程评估集'} · 回归评估集 {badcases.filter((b) => b.status === 'regression').length} 条
            </small>
          </div>
          {badcaseError && <p className="err small">{badcaseError}</p>}
          <div className="bc-list">
            {badcases.map((b) => {
              const st = STATUS_META[b.status];
              return (
                <div key={b.id} className="bc-item dossier" style={cv({ '--c': KIND_META[b.kind].color })}>
                  <span className="bc-kind">{KIND_META[b.kind].label}</span>
                  <div className="bc-main">
                    <p>“{b.excerpt}”</p>
                    <small>
                      {b.model} · {b.question}
                    </small>
                  </div>
                  <span className="bc-status" style={{ color: st.color, borderColor: st.color }} title={st.desc}>
                    {st.label}
                  </span>
                  <button
                    className="btn sm"
                    onClick={() => {
                      play('paper');
                      setTurn((t) => t + 1);
                      void advanceBadcase(b.id);
                    }}
                    disabled={b.status === 'regression'}
                  >
                    推进 →
                  </button>
                  <button className="icon-btn" onClick={() => removeBadcase(b.id)} title="删除">
                    ×
                  </button>
                </div>
              );
            })}
            {!badcases.length && <EmptyState compact kind="scroll" title="档案柜还空着" hint="去上方用审计画笔标出问题句，盖章采纳后，案卷会滑进这里。" />}
          </div>
        </div>
      </section>
    </div>
  );
}

function Flywheel({ counts, turn }: { counts: number[]; turn: number }) {
  const size = 300;
  const c = size / 2;
  const R = 104;
  return (
    <svg className="fw-svg" viewBox={`0 0 ${size} ${size}`} width="100%" height={size}>
      <defs>
        <marker id="fwArrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" fill="rgba(28,25,23,.45)" />
        </marker>
        <linearGradient id="fwGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#be3448" />
          <stop offset=".33" stopColor="#a67214" />
          <stop offset=".66" stopColor="#1b6b93" />
          <stop offset="1" stopColor="#1d7453" />
        </linearGradient>
      </defs>
      <circle cx={c} cy={c} r={R} fill="none" stroke="rgba(28,25,23,.09)" strokeWidth={18} />
      <g className="fw-turn" style={{ transform: `rotate(${turn * 90}deg)`, transformOrigin: `${c}px ${c}px` }}>
        <circle cx={c} cy={c} r={R} fill="none" stroke="url(#fwGrad)" strokeWidth={2} strokeDasharray="4 10" className="fw-spin" />
        <circle cx={c} cy={c - R - 13} r={4} className="fw-notch" />
      </g>
      {STATUS_FLOW.map((s, i) => {
        const a0 = -Math.PI / 2 + (i * Math.PI) / 2 + 0.32;
        const a1 = a0 + Math.PI / 2 - 0.64;
        return (
          <path
            key={`arc-${s}`}
            d={`M ${c + Math.cos(a0) * (R + 26)} ${c + Math.sin(a0) * (R + 26)} A ${R + 26} ${R + 26} 0 0 1 ${c + Math.cos(a1) * (R + 26)} ${c + Math.sin(a1) * (R + 26)}`}
            fill="none"
            stroke="rgba(28,25,23,.22)"
            strokeWidth={1.2}
            markerEnd="url(#fwArrow)"
          />
        );
      })}
      {STATUS_FLOW.map((s, i) => {
        const a = -Math.PI / 2 + (i * Math.PI) / 2;
        const x = c + Math.cos(a) * R;
        const y = c + Math.sin(a) * R;
        const m = STATUS_META[s];
        return (
          <g key={s} transform={`translate(${x},${y})`}>
            <circle r={30} fill="#ffffff" stroke={m.color} strokeWidth={2} />
            <text textAnchor="middle" y={-4} className="fw-count" fill={m.color}>
              {counts[i]}
            </text>
            <text textAnchor="middle" y={13} className="fw-label">
              {m.label}
            </text>
          </g>
        );
      })}
      <text x={c} y={c - 6} textAnchor="middle" className="fw-center">
        人机共同进化
      </text>
      <text x={c} y={c + 14} textAnchor="middle" className="fw-center-sub">
        Data Flywheel
      </text>
    </svg>
  );
}
