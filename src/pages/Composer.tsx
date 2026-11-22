import { useMemo, useState } from 'react';
import Ring from '../components/Ring';
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

export default function Composer() {
  const { plan, setPlan, planLessonId, choosePlanLesson } = useApp();
  const lesson = LESSONS.find((l) => l.id === planLessonId) ?? LESSONS[0];
  const part = PART_MAP[lesson.part];
  const [fnId, setFnId] = useState<PromptFunction['id']>('socratic');
  const [noRewrite, setNoRewrite] = useState(true);
  const [verifier, setVerifier] = useState(true);
  const [maxReplace, setMaxReplace] = useState(2);
  const [copied, setCopied] = useState(false);

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

  const ticks = Array.from({ length: Math.floor(total / 5) + 1 }, (_, i) => i * 5);

  return (
    <div className="page composer wide">
      <header className="page-head">
        <div>
          <div className="eyebrow">LESSON COMPOSER</div>
          <h1 className="display sm">
            备课编排台 <em>为“外骨骼”设定边界</em>
          </h1>
          <p className="lead">编排一节课的时间结构，实时校验 AI-Free 占比；再为课堂教学智能体生成符合“教育提示词四大功能”的系统提示词。</p>
        </div>
        <div className="head-tools">
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
        </div>
      </header>

      <div className="comp-grid">
        <section className="panel timeline-panel">
          <div className="tp-head">
            <div>
              <span className="tag" style={cv({ '--c': part.color })}>
                {part.name}
              </span>
              <h3>{lesson.title}</h3>
            </div>
            <div className="tp-total mono">
              {total}
              <small>min</small>
            </div>
          </div>

          <div className="timeline">
            {plan.map((s) => (
              <div
                key={s.id}
                className={`tl-seg t-${s.type}`}
                style={{ flexGrow: Math.max(1, s.minutes), ...cv({ '--c': SEGMENT_META[s.type].color }) }}
                title={`${SEGMENT_META[s.type].label} · ${s.minutes} 分钟`}
              >
                <b>{SEGMENT_META[s.type].short}</b>
                <span>{s.minutes}′</span>
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

      <section className="panel prompt-studio">
        <div className="section-title">
          <span className="eyebrow">EDUCATIONAL PROMPT FUNCTIONS</span>
          <h3>课堂教学智能体 · 系统提示词生成</h3>
        </div>
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
        <TestDrive system={prompt} fnId={fn.id} lessonId={lesson.id} verify={verifier} />
      </section>
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
    <div className="test-drive">
      <div className="td-head">
        <b>试运行 · 以学生身份对话</b>
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
          <div className="td-empty">输入一条学生消息，看看这位学习伙伴会如何回应。</div>
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
