import { useMemo, useRef, useState, type MouseEvent, type PointerEvent } from 'react';
import { addMark } from '../fun/marks';
import { play } from '../fun/sound';
import { useStamp } from '../fun/Stamp';
import PageHeader from '../components/PageHeader';
import Ring from '../components/Ring';
import { pageMeta } from '../data/nav';
import { LESSONS, PART_MAP } from '../data/curriculum';
import { PROMPT_FUNCTIONS, type PromptFunction } from '../data/rubric';
import type { Segment, SegmentType } from '../data/types';
import { useStream } from '../hooks/useStream';
import { buildTutorSystemPrompt } from '../services/prompts';
import { useServices } from '../services/ServiceContext';
import type { VerifyResult } from '../services/types';
import { useApp } from '../store/AppContext';
import { cv, pct } from '../utils/css';
import { aiFreeRatio, SEGMENT_META, uid } from '../utils/plan';

const TYPES: SegmentType[] = ['intro', 'aifree', 'unplugged', 'ai', 'judge'];

export default function Composer({ sub }: { sub?: string }) {
  const { item, tab, tabs } = pageMeta('composer', sub);
  const { plan, setPlan, planLessonId, choosePlanLesson } = useApp();
  const lesson = LESSONS.find((l) => l.id === planLessonId) ?? LESSONS[0];
  const part = PART_MAP[lesson.part];
  const [fnId, setFnId] = useState<PromptFunction['id']>('socratic');
  const [noRewrite, setNoRewrite] = useState(true);
  const [verifier, setVerifier] = useState(true);
  const [maxReplace, setMaxReplace] = useState(2);
  const [copied, setCopied] = useState(false);
  const { stamp } = useStamp();
  const tlRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; x0: number; m0: number; pxPerMin: number; last: number } | null>(null);
  const [resizing, setResizing] = useState<string | null>(null);

  const total = plan.reduce((s, x) => s + x.minutes, 0);
  const ratio = aiFreeRatio(plan);
  const ok = ratio >= 0.25;
  const fn = PROMPT_FUNCTIONS.find((f) => f.id === fnId) ?? PROMPT_FUNCTIONS[0];
  const prompt = useMemo(() => buildTutorSystemPrompt(lesson, fn, { noRewrite, verifier, maxReplace }), [lesson, fn, noRewrite, verifier, maxReplace]);

  const update = (id: string, patch: Partial<Segment>) => setPlan(plan.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const move = (i: number, d: number) => {
    const j = i + d;
    if (j < 0 || j >= plan.length) return;
    const next = plan.slice();
    [next[i], next[j]] = [next[j], next[i]];
    setPlan(next);
  };
  const remove = (id: string) => setPlan(plan.filter((s) => s.id !== id));
  const add = (type: SegmentType) => setPlan([...plan, { id: uid(), title: SEGMENT_META[type].label, minutes: 5, type }]);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* 剪贴板不可用 */
    }
  };

  /* 木块：拖右边缘改时长，5 分钟吸附 */
  const grab = (s: Segment, e: PointerEvent<HTMLSpanElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const w = tlRef.current?.getBoundingClientRect().width ?? 600;
    drag.current = { id: s.id, x0: e.clientX, m0: s.minutes, pxPerMin: w / Math.max(1, total), last: s.minutes };
    e.currentTarget.setPointerCapture(e.pointerId);
    setResizing(s.id);
  };
  const pull = (e: PointerEvent<HTMLSpanElement>) => {
    const d = drag.current;
    if (!d) return;
    const raw = d.m0 + (e.clientX - d.x0) / d.pxPerMin;
    const snapped = Math.min(45, Math.max(5, Math.round(raw / 5) * 5));
    if (snapped !== d.last) {
      d.last = snapped;
      play('snip');
      update(d.id, { minutes: snapped });
    }
  };
  const release = () => {
    drag.current = null;
    setResizing(null);
  };
  const finalize = (e: MouseEvent<HTMLButtonElement>) => {
    stamp({ label: '定稿', target: `${lesson.title} · ${total} 分钟 · 无 AI ${pct(ratio)}`, at: e.currentTarget });
    addMark('verified', lesson.id);
  };
  // 秤杆：25% 是准星；低于阈值时秤砣滑向 AI 一侧，杆子下沉
  const tilt = Math.max(-12, Math.min(12, (ratio - 0.25) * 48));

  const ticks = Array.from({ length: Math.floor(total / 5) + 1 }, (_, i) => i * 5);

  return (
    <div className="page composer wide">
      <PageHeader
        route="composer"
        title={item.label}
        desc={tab.desc}
        tabs={tabs}
        active={tab.id}
        tools={
          <label className="field">
            <span>当前课程</span>
            <select value={lesson.id} onChange={(e) => choosePlanLesson(e.target.value)}>
              {LESSONS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <div className="tab-pane" key={tab.id}>
        {tab.id === 'timeline' && (
          <div className="comp-grid">
            <section className="panel timeline-panel">
              <div className="tp-head">
                <div>
                  <span className="tag" style={cv({ '--c': part.color })}>
                    {part.name}
                  </span>
                  <h3>{lesson.title}</h3>
                </div>
                <div className="tp-tools">
                  <div className="tp-total mono">
                    {total}
                    <small>min</small>
                  </div>
                  <button className="btn sm" onClick={finalize} disabled={!ok} title={ok ? '盖章定稿：记入印章抽屉，并在课程卡上留下“验”字章' : 'AI-Free 占比不足 25%，还不能定稿'}>
                    定稿 · 盖章
                  </button>
                </div>
              </div>

              <div className="timeline wood" ref={tlRef}>
                {plan.map((s) => (
                  <div
                    key={s.id}
                    className={`tl-seg t-${s.type} ${resizing === s.id ? 'resizing' : ''}`}
                    style={{ flexGrow: Math.max(1, s.minutes), ...cv({ '--c': SEGMENT_META[s.type].color }) }}
                    title={`${SEGMENT_META[s.type].label} · ${s.minutes} 分钟（拖右边缘改时长，5 分钟吸附）`}
                  >
                    <b>{SEGMENT_META[s.type].short}</b>
                    <span>{s.minutes}′</span>
                    <span
                      className="tl-grip"
                      role="slider"
                      aria-label={`${s.title} 时长`}
                      aria-valuemin={5}
                      aria-valuemax={45}
                      aria-valuenow={s.minutes}
                      tabIndex={0}
                      onPointerDown={(e) => grab(s, e)}
                      onPointerMove={pull}
                      onPointerUp={release}
                      onPointerCancel={release}
                      onKeyDown={(e) => {
                        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') update(s.id, { minutes: Math.min(45, Math.round(s.minutes / 5) * 5 + 5) });
                        if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') update(s.id, { minutes: Math.max(5, Math.round(s.minutes / 5) * 5 - 5) });
                      }}
                    />
                  </div>
                ))}
              </div>
              <div className="tl-ruler">
                {ticks.map((t) => (
                  <span key={t} style={{ left: total ? `${(t / total) * 100}%` : 0 }}>
                    {t}
                  </span>
                ))}
              </div>

              <div className="seg-list">
                {plan.map((s, i) => (
                  <div key={s.id} className="seg-row" style={cv({ '--c': SEGMENT_META[s.type].color })}>
                    <span className="seg-no mono">{String(i + 1).padStart(2, '0')}</span>
                    <select className="seg-type" value={s.type} onChange={(e) => update(s.id, { type: e.target.value as SegmentType })}>
                      {TYPES.map((t) => (
                        <option key={t} value={t}>
                          {SEGMENT_META[t].label}
                        </option>
                      ))}
                    </select>
                    <input className="seg-title" value={s.title} onChange={(e) => update(s.id, { title: e.target.value })} />
                    <div className="seg-min">
                      <button onClick={() => update(s.id, { minutes: Math.max(1, s.minutes - 1) })}>−</button>
                      <span className="mono">{s.minutes}</span>
                      <button onClick={() => update(s.id, { minutes: Math.min(45, s.minutes + 1) })}>+</button>
                    </div>
                    <div className="seg-ops">
                      <button onClick={() => move(i, -1)} title="上移">
                        ↑
                      </button>
                      <button onClick={() => move(i, 1)} title="下移">
                        ↓
                      </button>
                      <button onClick={() => remove(s.id)} title="删除">
                        ×
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="seg-add">
                <span className="muted">添加环节：</span>
                {TYPES.map((t) => (
                  <button key={t} className="chip marker" style={cv({ '--c': SEGMENT_META[t].color })} onClick={() => add(t)}>
                    <i />
                    {SEGMENT_META[t].label}
                  </button>
                ))}
              </div>
            </section>
            <section className={`panel gauge-card ${ok ? 'ok' : 'bad'}`}>
              <div className="eyebrow">IRON LAW · 铁律二</div>
              <Ring value={ratio} size={168} stroke={14} color={ok ? '#1d7453' : '#c83e2b'} mark={0.25}>
                <b className="big mono">{pct(ratio)}</b>
                <small>无 AI 时段</small>
              </Ring>
              <svg className={`steelyard ${ok ? 'ok' : 'bad'}`} viewBox="0 0 200 70" width="200" height="70" aria-label={`秤杆：无 AI 时段 ${pct(ratio)}，准星 25%`}>
                <path d="M100 8 v10" className="sy-hook" />
                <g style={{ transform: `rotate(${tilt}deg)`, transformOrigin: '100px 20px', transition: 'transform .5s var(--ease)' }}>
                  <line x1="16" y1="20" x2="184" y2="20" className="sy-beam" />
                  {[0.25, 0.5, 0.75].map((v) => (
                    <line key={v} x1={100 + (v - 0.25) * 140} y1="16" x2={100 + (v - 0.25) * 140} y2="24" className={`sy-tick ${v === 0.25 ? 'mark' : ''}`} />
                  ))}
                  <text x="22" y="12" className="sy-label">AI</text>
                  <text x="160" y="12" className="sy-label">无 AI</text>
                  <g style={{ transform: `translateX(${Math.max(-80, Math.min(80, (ratio - 0.25) * 140))}px)`, transition: 'transform .5s var(--ease)' }}>
                    <line x1="100" y1="20" x2="100" y2="40" className="sy-string" />
                    <path d="M92 40 h16 l-3 14 h-10z" className="sy-weight" />
                  </g>
                </g>
                <circle cx="100" cy="20" r="2.6" className="sy-pivot" />
              </svg>
              <p className="gauge-msg">
                {ok ? '✓ 满足“不少于 25% 纯人类独立推演时段”' : '✗ 低于 25% 阈值：独立思考的“肌肉”有萎缩风险'}
              </p>
              <ul className="legend-list">
                {TYPES.map((t) => {
                  const m = plan.filter((s) => s.type === t).reduce((a, b) => a + b.minutes, 0);
                  return (
                    <li key={t} style={cv({ '--c': SEGMENT_META[t].color })}>
                      <i />
                      <span>{SEGMENT_META[t].label}</span>
                      <b className="mono">{m}′</b>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        )}

        {tab.id === 'prompt' && (
          <section className="panel prompt-studio">
            <div className="ps-grid">
              <div className="ps-left">
                <div className="fn-cards">
                  {PROMPT_FUNCTIONS.map((f) => (
                    <button key={f.id} className={`fn-card ${fnId === f.id ? 'on' : ''}`} style={cv({ '--c': f.color })} onClick={() => setFnId(f.id)}>
                      <b>{f.name}</b>
                      <small>{f.en}</small>
                      <p>{f.desc}</p>
                    </button>
                  ))}
                </div>
                {fn.caution && <p className="note">⚠ {fn.caution}</p>}
                <div className="toggles">
                  <label className="toggle">
                    <input type="checkbox" checked={noRewrite} onChange={(e) => setNoRewrite(e.target.checked)} />
                    <span className="tg" />
                    <span>
                      <b>禁止重写约束</b>
                      <small>No-Rewrite Constraint · 保护学生原创文本</small>
                    </span>
                  </label>
                  {noRewrite && (
                    <label className="range-field">
                      <span>每页直接替换示例上限</span>
                      <input type="range" min={1} max={2} step={1} value={maxReplace} onChange={(e) => setMaxReplace(Number(e.target.value))} />
                      <b className="mono">{maxReplace} 句</b>
                    </label>
                  )}
                  <label className="toggle">
                    <input type="checkbox" checked={verifier} onChange={(e) => setVerifier(e.target.checked)} />
                    <span className="tg" />
                    <span>
                      <b>独立 Verifier LLM 复核</b>
                      <small>双层安全校验 · 规矩清单</small>
                    </span>
                  </label>
                </div>
              </div>
              <div className="prompt-box">
                <div className="pb-head">
                  <span className="mono">system_prompt.md</span>
                  <button className="btn sm" onClick={copy}>
                    {copied ? '已复制 ✓' : '复制'}
                  </button>
                </div>
                <pre>
                  {prompt.split('\n').map((line, i) => (
                    <div
                      key={i}
                      className={`pl ${line.startsWith('#') ? 'h' : line.startsWith('- 【') ? 'k' : line.startsWith('-') ? 'li' : line === '"""' ? 'd' : ''}`}
                    >
                      <span className="ln">{i + 1}</span>
                      {line || ' '}
                    </div>
                  ))}
                </pre>
              </div>
            </div>
            <div className="pane-next">
              <a className="btn" href="#/composer/trial">
                用这份提示词试运行 →
              </a>
            </div>
          </section>
        )}

        {tab.id === 'trial' && (
          <section className="panel prompt-studio">
            <TestDrive system={prompt} fnId={fn.id} lessonId={lesson.id} verify={verifier} />
          </section>
        )}
      </div>
    </div>
  );
}

/** 试运行：以学生身份与刚生成的系统提示词对话，检验“外骨骼”的实际边界 */
function TestDrive({ system, fnId, lessonId, verify }: { system: string; fnId: PromptFunction['id']; lessonId: string; verify: boolean }) {
  const { llm, verifier, config } = useServices();
  const [msg, setMsg] = useState('这道题我不会：西瓜每个 3 元，买 4 送 1，买 10 个最少花多少钱？');
  const [sent, setSent] = useState('');
  const [check, setCheck] = useState<VerifyResult | null>(null);
  const s = useStream();

  const send = async () => {
    const text = msg.trim();
    if (!text || s.status === 'streaming') return;
    setSent(text);
    setCheck(null);
    const out = await s.run((signal) =>
      llm.stream({
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: text },
        ],
        temperature: 0.4,
        scenario: { id: 'tutor.reply', fn: fnId, lessonId },
        signal,
      }),
    );
    if (out && verify) {
      try {
        setCheck(await verifier.check(out));
      } catch {
        setCheck(null);
      }
    }
  };

  return (
    <div className="test-drive rehearsal">
      <div className="stage-curtain" aria-hidden />
      <div className="td-head">
        <b>彩排 · 以学生身份对话</b>
        <span className="muted small">检验这份系统提示词是否真的“扣留答案、启发思考”</span>
        <div className="spacer" />
        <span className={`mode-tag ${config.mode}`}>{config.mode === 'mock' ? 'Mock 模拟' : config.defaultModel || '未配置模型'}</span>
      </div>
      <div className="td-chat">
        {sent ? (
          <>
            <div className="bubble user">{sent}</div>
            <div className={`bubble ai ${s.status}`}>
              {s.status === 'error' ? <span className="err">{s.error}</span> : s.text || '…'}
              {s.status === 'streaming' && <span className="stream-caret" />}
            </div>
            {check && <div className={`td-check ${check.passed ? 'ok' : 'bad'}`}>{check.passed ? '✓ Verifier 已复核放行' : `⛔ Verifier 拦截：${check.label}`}</div>}
            {s.usage && (
              <div className="td-usage mono">
                tokens · 输入 {s.usage.promptTokens} / 输出 {s.usage.completionTokens}
              </div>
            )}
          </>
        ) : (
          <div className="td-empty">小舞台已经搭好，幕布还没拉开——输入一条学生消息，看看这位学习伙伴会怎么接戏。</div>
        )}
      </div>
      <div className="row">
        <input className="search grow" value={msg} onChange={(e) => setMsg(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && send()} />
        {s.status === 'streaming' ? (
          <button className="btn" onClick={s.stop}>
            ■ 停止
          </button>
        ) : (
          <button className="btn primary" onClick={send} disabled={!msg.trim()}>
            发送
          </button>
        )}
      </div>
    </div>
  );
}
