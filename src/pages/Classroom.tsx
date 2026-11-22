import { useState } from 'react';
import { ARB_CASES, KIND_META } from '../data/arbitration';
import { LESSONS, PART_MAP } from '../data/curriculum';
import { PROMPT_FUNCTIONS, type PromptFunction } from '../data/rubric';
import type { BadcaseKind } from '../data/types';
import { useNow } from '../hooks/useNow';
import { sentenceKey, tally } from '../services/classroom/reducer';
import type { AuditActivity, ChatActivity, ClassState, PollActivity, Submission } from '../services/classroom/types';
import { useServices } from '../services/ServiceContext';
import { useApp } from '../store/AppContext';
import { useTeacherClass } from '../store/ClassroomContext';
import { cv, fmtClock } from '../utils/css';
import { uid } from '../utils/plan';

const ONLINE_MS = 30000;
const KINDS: BadcaseKind[] = ['hallucination', 'logic', 'bias', 'format'];
const ACT_LABEL = { poll: '课堂投票', audit: '共建 Badcase', chat: '学习伙伴' } as const;

const POLL_TEMPLATES: { title: string; question: string; options: string[]; answer?: number }[] = [
  { title: '幻觉判断', question: 'AI 说“鲁迅和周树人一起喝过咖啡”。这是？', options: ['真实的历史', 'AI 幻觉', '不确定，需要查资料核实'], answer: 1 },
  { title: '温度直觉', question: '把 Temperature 调高后，AI 写的故事会怎样？', options: ['更稳定，每次都一样', '更有创意，也更容易胡说八道', '完全没有变化'], answer: 1 },
  { title: '隐私红绿灯', question: '“家庭住址”可以告诉聊天机器人吗？', options: ['可以（绿灯）', '不可以（红灯）'], answer: 1 },
  { title: '鉴赏力', question: '三堂会审：你认为哪个模型的回答最可信？', options: ['模型 A', '模型 B', '模型 C'] },
  { title: '30 秒判定', question: '把 LLM 从这节课中拿走，课程还能照常进行吗？', options: ['能 → AI-Enabled 外挂', '不能 → AI Native 原生'] },
];

const studentLink = (code: string) => `${window.location.origin}${window.location.pathname}#/student/${code}`;

export default function Classroom() {
  const t = useTeacherClass();

  if (!t.code) return <StartPanel />;
  if (t.status === 'missing' || t.status === 'error') {
    return (
      <div className="page classroom wide">
        <section className="panel cls-notice">
          <h3>{t.status === 'missing' ? '找不到这节课' : '课堂连接失败'}</h3>
          <p className="muted">{t.status === 'missing' ? `课堂 ${t.code} 不存在：可能已被清除，或刚刚切换了“课堂同步”后端。` : t.error}</p>
          <button className="btn primary" onClick={t.forget}>
            开启新课堂
          </button>
        </section>
      </div>
    );
  }
  if (!t.state) {
    return (
      <div className="loading">
        <div className="loading-orb" />
        <span>正在连接课堂…</span>
      </div>
    );
  }
  if (!t.state.open) {
    return (
      <div className="page classroom wide">
        <section className="panel cls-notice">
          <h3>本节课已结束</h3>
          <p className="muted">共 {t.state.students.length} 名学生参与，提交 {t.state.submissions.length} 条 Badcase 线索。</p>
          <button className="btn primary" onClick={t.forget}>
            开启新课堂
          </button>
        </section>
      </div>
    );
  }
  return <Console state={t.state} />;
}

/* ---------------- 开课 ---------------- */
function StartPanel() {
  const t = useTeacherClass();
  const { planLessonId } = useApp();
  const { classroom } = useServices();
  const [lessonId, setLessonId] = useState(planLessonId);
  const lesson = LESSONS.find((l) => l.id === lessonId) ?? LESSONS[0];

  return (
    <div className="page classroom wide">
      <header className="page-head">
        <div>
          <div className="eyebrow">CLASSROOM LIVE</div>
          <h1 className="display sm">
            课堂直播 <em>老师编排节奏，学生执掌判断</em>
          </h1>
          <p className="lead">开启课堂后，学生用 6 位课堂码和昵称加入。你可以发起投票、共建 Badcase、开放学习伙伴，或一键让全班进入 AI-Free 独立推演时段。</p>
        </div>
      </header>
      <section className="panel start-hero" style={cv({ '--c': PART_MAP[lesson.part].color })}>
        <div className="sh-left">
          <label className="field">
            <span>本节课</span>
            <select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
              {LESSONS.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title}
                </option>
              ))}
            </select>
          </label>
          <p className="sh-hook">“{lesson.hook}”</p>
          <button className="btn primary lg" onClick={() => t.start(lessonId)} disabled={t.busy}>
            {t.busy ? '正在开课…' : '▶ 开启课堂'}
          </button>
          {t.actionError && <p className="err small">{t.actionError}</p>}
        </div>
        <ul className="sh-points">
          <li>
            <b>学生只用昵称</b>
            <span>加入时禁止真实姓名、电话等红灯隐私</span>
          </li>
          <li>
            <b>输入输出双重复核</b>
            <span>学生的提问与 AI 的回答都要先经过 Verifier</span>
          </li>
          <li>
            <b>老师看用量，不看聊天</b>
            <span>只汇总提问次数与拦截次数，保护学生隐私</span>
          </li>
          <li>
            <b>{classroom.kind === 'mock' ? '本机演示模式' : '跨设备实时同步'}</b>
            <span>{classroom.kind === 'mock' ? '在同一浏览器打开多个学生标签页即可体验' : '学生在任意设备打开链接加入'}</span>
          </li>
        </ul>
      </section>
    </div>
  );
}

/* ---------------- 主控台 ---------------- */
function Console({ state }: { state: ClassState }) {
  const t = useTeacherClass();
  const { classroom } = useServices();
  const now = useNow(5000);
  const [copied, setCopied] = useState(false);
  const lesson = LESSONS.find((l) => l.id === state.lessonId) ?? LESSONS[0];
  const online = state.students.filter((s) => now - (t.lastSeen[s.id] ?? 0) < ONLINE_MS).length;
  const link = studentLink(state.code);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="page classroom wide">
      <section className="panel session-bar" style={cv({ '--c': PART_MAP[lesson.part].color })}>
        <div className="sb-code">
          <small>课堂码</small>
          <b className="mono">{state.code}</b>
        </div>
        <div className="sb-info">
          <b>{lesson.title}</b>
          <span>
            <i className={`dot ${t.status === 'live' ? 'ok' : 'warn'}`} />
            {online} / {state.students.length} 名学生在线 · 已开课 {Math.max(0, Math.floor((now - state.openedAt) / 60000))} 分钟 ·{' '}
            {classroom.kind === 'mock' ? '本机多标签页同步' : '远程实时同步'}
          </span>
        </div>
        <div className="sb-actions">
          <button className="btn" onClick={copy}>
            {copied ? '已复制 ✓' : '复制学生链接'}
          </button>
          <button className="btn" onClick={() => window.open(link, '_blank')}>
            ↗ 打开学生端
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (window.confirm('确定结束本节课吗？学生端将显示“课堂已结束”。')) void t.end();
            }}
          >
            结束课堂
          </button>
        </div>
      </section>
      {t.actionError && <p className="err">{t.actionError}</p>}

      <div className="cls-grid">
        <Launcher state={state} />
        <div className="cls-live">
          <LivePanel state={state} />
          <Queue state={state} />
        </div>
        <Roster state={state} now={now} />
      </div>
    </div>
  );
}

/* ---------------- 发起活动 ---------------- */
type LTab = 'poll' | 'audit' | 'chat' | 'aifree';

function Launcher({ state }: { state: ClassState }) {
  const [tab, setTab] = useState<LTab>('poll');
  return (
    <section className="panel launcher">
      <div className="section-title">
        <span className="eyebrow">LAUNCH</span>
        <h3>发起活动</h3>
      </div>
      <div className="segmented full">
        <button className={tab === 'poll' ? 'on' : ''} onClick={() => setTab('poll')}>
          投票
        </button>
        <button className={tab === 'audit' ? 'on' : ''} onClick={() => setTab('audit')}>
          共建
        </button>
        <button className={tab === 'chat' ? 'on' : ''} onClick={() => setTab('chat')}>
          伙伴
        </button>
        <button className={tab === 'aifree' ? 'on' : ''} onClick={() => setTab('aifree')}>
          AI-Free
        </button>
      </div>
      {tab === 'poll' && <PollLauncher />}
      {tab === 'audit' && <AuditLauncher />}
      {tab === 'chat' && <ChatLauncher state={state} />}
      {tab === 'aifree' && <AiFreeLauncher state={state} />}
    </section>
  );
}

function PollLauncher() {
  const t = useTeacherClass();
  const [q, setQ] = useState(POLL_TEMPLATES[0].question);
  const [opts, setOpts] = useState(POLL_TEMPLATES[0].options.join('\n'));
  const [answer, setAnswer] = useState(POLL_TEMPLATES[0].answer ?? -1);
  const options = opts
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 6);
  const valid = q.trim().length > 0 && options.length >= 2;

  return (
    <div className="launch-body">
      <div className="tpl-row">
        {POLL_TEMPLATES.map((tp) => (
          <button
            key={tp.title}
            className="chip"
            onClick={() => {
              setQ(tp.question);
              setOpts(tp.options.join('\n'));
              setAnswer(tp.answer ?? -1);
            }}
          >
            {tp.title}
          </button>
        ))}
      </div>
      <label className="form-row">
        <span>问题</span>
        <input className="search" value={q} onChange={(e) => setQ(e.target.value)} />
      </label>
      <label className="form-row">
        <span>选项（每行一个，2–6 个）</span>
        <textarea rows={4} value={opts} onChange={(e) => setOpts(e.target.value)} />
      </label>
      <label className="form-row">
        <span>正确答案（可选）</span>
        <select value={answer} onChange={(e) => setAnswer(Number(e.target.value))}>
          <option value={-1}>无 · 观点投票</option>
          {options.map((o, i) => (
            <option key={i} value={i}>
              {String.fromCharCode(65 + i)}. {o}
            </option>
          ))}
        </select>
      </label>
      <button
        className="btn primary"
        disabled={!valid || t.busy}
        onClick={() =>
          t.launch({
            kind: 'poll',
            id: uid(),
            question: q.trim(),
            options,
            answer: answer >= 0 && answer < options.length ? answer : undefined,
            startedAt: Date.now(),
          })
        }
      >
        发起投票
      </button>
    </div>
  );
}

function AuditLauncher() {
  const t = useTeacherClass();
  const [caseId, setCaseId] = useState(ARB_CASES[0].id);
  return (
    <div className="launch-body">
      <div className="pick-list">
        {ARB_CASES.map((c) => (
          <button key={c.id} className={`pick-card ${caseId === c.id ? 'on' : ''}`} onClick={() => setCaseId(c.id)}>
            <small>{c.title}</small>
            <span>{c.question}</span>
          </button>
        ))}
      </div>
      <p className="muted small">学生用审计画笔标注问题句子，并必须写出核查依据。相同句子的提交会自动合并，采纳后进入 Badcase 库。</p>
      <button className="btn primary" disabled={t.busy} onClick={() => t.launch({ kind: 'audit', id: uid(), caseId, startedAt: Date.now() })}>
        发起共建审计
      </button>
    </div>
  );
}

function ChatLauncher({ state }: { state: ClassState }) {
  const t = useTeacherClass();
  const [lessonId, setLessonId] = useState(state.lessonId);
  const [fn, setFn] = useState<PromptFunction['id']>('socratic');
  return (
    <div className="launch-body">
      <label className="form-row">
        <span>围绕的课程</span>
        <select value={lessonId} onChange={(e) => setLessonId(e.target.value)}>
          {LESSONS.map((l) => (
            <option key={l.id} value={l.id}>
              {l.title}
            </option>
          ))}
        </select>
      </label>
      <div className="fn-mini">
        {PROMPT_FUNCTIONS.map((f) => (
          <button key={f.id} className={fn === f.id ? 'on' : ''} style={cv({ '--c': f.color })} onClick={() => setFn(f.id)}>
            <b>{f.name}</b>
            <small>{f.en}</small>
          </button>
        ))}
      </div>
      <p className="muted small">学习伙伴使用备课台同款系统提示词（含禁止重写约束）。学生输入与 AI 输出都先经过 Verifier 复核；老师端只汇总使用量。</p>
      <button
        className="btn primary"
        disabled={t.busy}
        onClick={() => t.launch({ kind: 'chat', id: uid(), lessonId, fn, startedAt: Date.now() })}
      >
        开放学习伙伴
      </button>
    </div>
  );
}

function AiFreeLauncher({ state }: { state: ClassState }) {
  const t = useTeacherClass();
  const { aiFree, setAiFree } = useApp();
  const lesson = LESSONS.find((l) => l.id === state.lessonId) ?? LESSONS[0];
  const [task, setTask] = useState(t.aiFreeTask || state.aiFree.task || lesson.aiFreeHint);

  return (
    <div className="launch-body">
      <div className="law-chip">
        <b>铁律二</b> 每个单元保留不少于 25% 的纯人类独立推演时段
      </div>
      <label className="form-row">
        <span>独立推演任务（显示在学生屏幕上）</span>
        <textarea rows={4} value={task} onChange={(e) => setTask(e.target.value)} />
      </label>
      {aiFree ? (
        <div className="row">
          <button className="btn" disabled={t.busy} onClick={() => t.updateAiFreeTask(task.trim())}>
            更新任务
          </button>
          <button className="btn danger" onClick={() => setAiFree(false)}>
            结束 AI-Free
          </button>
        </div>
      ) : (
        <button
          className="btn aifree-go"
          onClick={() => {
            t.setAiFreeTask(task.trim());
            setAiFree(true);
          }}
        >
          🔴 全班进入 AI-Free
        </button>
      )}
      <p className="muted small">与顶栏的 AI-Free 开关联动：学生端所有 AI 功能立即暂停，屏幕切换为纸笔推演模式。</p>
    </div>
  );
}

/* ---------------- 实时面板 ---------------- */
function LivePanel({ state }: { state: ClassState }) {
  const t = useTeacherClass();
  const now = useNow(1000);
  const a = state.activity;

  return (
    <section className="panel live-panel">
      {state.aiFree.on && (
        <div className="aifree-banner">
          <b>🔴 全班 AI-Free 中</b>
          <span>{state.aiFree.task || '纸笔独立推演'}</span>
          <span className="mono">{fmtClock(Math.floor((now - (state.aiFree.since ?? now)) / 1000))}</span>
        </div>
      )}
      {a ? (
        <>
          <div className="live-head">
            <span className="eyebrow">LIVE · {ACT_LABEL[a.kind]}</span>
            <span className="mono muted">{fmtClock(Math.floor((now - a.startedAt) / 1000))}</span>
            <div className="spacer" />
            <button className="btn ghost sm" onClick={t.stop} disabled={t.busy}>
              ■ 结束活动
            </button>
          </div>
          {a.kind === 'poll' && <PollLive act={a} state={state} />}
          {a.kind === 'audit' && <AuditLive act={a} state={state} />}
          {a.kind === 'chat' && <ChatLive act={a} state={state} />}
        </>
      ) : (
        <div className="live-idle">
          <div className="idle-orb" />
          <b>当前没有进行中的活动</b>
          <span className="muted">从左侧发起投票、共建审计或学习伙伴；学生屏幕会同步切换。</span>
        </div>
      )}
    </section>
  );
}

function PollLive({ act, state }: { act: PollActivity; state: ClassState }) {
  const t = useTeacherClass();
  const counts = tally(state, act);
  const voted = counts.reduce((a, b) => a + b, 0);
  const revealed = !!state.revealed[act.id];
  const max = Math.max(1, ...counts);

  return (
    <div className="poll-live">
      <h3 className="pl-q">{act.question}</h3>
      <div className="pl-meta">
        <span>
          已投票 <b className="mono">{voted}</b> / {state.students.length}
        </span>
        <div className="pl-progress">
          <i style={{ width: `${state.students.length ? (voted / state.students.length) * 100 : 0}%` }} />
        </div>
        <button className="btn sm" onClick={() => t.reveal(act.id, !revealed)} disabled={t.busy}>
          {revealed ? '收起结果' : '向全班揭晓'}
        </button>
      </div>
      <div className="pl-bars">
        {act.options.map((o, i) => (
          <div key={i} className={`pl-bar ${revealed && act.answer === i ? 'answer' : ''}`}>
            <span className="pl-letter mono">{String.fromCharCode(65 + i)}</span>
            <span className="pl-label">{o}</span>
            <span className="pl-track">
              <i style={{ width: `${(counts[i] / max) * 100}%` }} />
            </span>
            <span className="pl-count mono">
              {counts[i]}
              <small>{voted ? ` · ${Math.round((counts[i] / voted) * 100)}%` : ''}</small>
            </span>
          </div>
        ))}
      </div>
      {act.answer !== undefined && <p className="muted small">知识投票 · 揭晓后学生端将显示正确答案“{String.fromCharCode(65 + act.answer)}”，投票同时锁定。</p>}
    </div>
  );
}

function AuditLive({ act, state }: { act: AuditActivity; state: ClassState }) {
  const c = ARB_CASES.find((x) => x.id === act.caseId) ?? ARB_CASES[0];
  const subs = state.submissions.filter((s) => s.caseId === c.id && state.reviews[s.id]?.status !== 'rejected');
  const heat = new Map<string, { students: Set<string>; kinds: Partial<Record<BadcaseKind, number>> }>();
  subs.forEach((s) => {
    const k = `${s.modelIndex}-${s.sentenceIndex}`;
    const h = heat.get(k) ?? { students: new Set<string>(), kinds: {} };
    h.students.add(s.studentId);
    h.kinds[s.kind] = (h.kinds[s.kind] ?? 0) + 1;
    heat.set(k, h);
  });
  const auditors = new Set(subs.map((s) => s.studentId)).size;
  const peak = Math.max(1, ...[...heat.values()].map((h) => h.students.size));

  return (
    <div className="audit-live">
      <div className="al-head">
        <h3 className="pl-q">{c.question}</h3>
        <span className="muted small">
          {auditors} 名学生提交了 {subs.length} 条标注 · 颜色越深代表越多同学认为此句有问题
        </span>
      </div>
      <div className="al-models">
        {c.outputs.map((o, mi) => (
          <div key={o.model} className="al-model">
            <b>{o.model}</b>
            {o.sentences.map((sent, si) => {
              const h = heat.get(`${mi}-${si}`);
              const n = h?.students.size ?? 0;
              return (
                <div key={si} className="heat-sentence" style={cv({ '--heat': String(n / peak) })}>
                  <span>{sent}</span>
                  {n > 0 && (
                    <span className="heat-tags">
                      {KINDS.filter((k) => h?.kinds[k]).map((k) => (
                        <i key={k} style={cv({ '--c': KIND_META[k].color })}>
                          {KIND_META[k].label} {h?.kinds[k]}
                        </i>
                      ))}
                    </span>
                  )}
                  {o.truth[si] && <em className="truth-flag" title={`标准答案：${KIND_META[o.truth[si]!].label}`} />}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <p className="muted small">右上角小红点 = 教学案例预置的问题句（仅老师可见），可用于课后对比全班的“命中率”。</p>
    </div>
  );
}

function ChatLive({ act, state }: { act: ChatActivity; state: ClassState }) {
  const lesson = LESSONS.find((l) => l.id === act.lessonId) ?? LESSONS[0];
  const fn = PROMPT_FUNCTIONS.find((f) => f.id === act.fn) ?? PROMPT_FUNCTIONS[0];
  const rows = state.students.map((s) => ({ s, u: state.usage[s.id] ?? { prompts: 0, blocked: 0 } }));
  const total = rows.reduce((a, r) => a + r.u.prompts, 0);
  const blocked = rows.reduce((a, r) => a + r.u.blocked, 0);

  return (
    <div className="chat-live">
      <h3 className="pl-q">
        <span style={{ color: fn.color }}>{fn.name}</span>学习伙伴 · {lesson.title}
      </h3>
      <div className="cl-kpis">
        <div>
          <small>全班提问</small>
          <b className="mono">{total}</b>
        </div>
        <div>
          <small>被 Verifier 拦截</small>
          <b className="mono warn-text">{blocked}</b>
        </div>
        <div>
          <small>人均提问</small>
          <b className="mono">{rows.length ? (total / rows.length).toFixed(1) : '0'}</b>
        </div>
      </div>
      <div className="cl-table">
        {rows.map(({ s, u }) => (
          <div key={s.id} className="cl-row">
            <span className="avatar-sm">{s.avatar}</span>
            <span className="cl-name">{s.nickname}</span>
            <span className="cl-bar">
              <i style={{ width: `${Math.min(100, u.prompts * 10)}%` }} />
            </span>
            <span className="mono">{u.prompts}</span>
            <span className="mono warn-text">{u.blocked ? `⛔${u.blocked}` : ''}</span>
          </div>
        ))}
        {!rows.length && <div className="empty">还没有学生加入</div>}
      </div>
      <p className="muted small">🔒 老师只看到使用量，看不到聊天内容。提问过于频繁的同学，可以引导他“先想清楚再问”——数字极简主义。</p>
    </div>
  );
}

/* ---------------- 待审队列 ---------------- */
function Queue({ state }: { state: ClassState }) {
  const t = useTeacherClass();
  const pending = state.submissions.filter((s) => !state.reviews[s.id]);
  const handled = state.submissions.length - pending.length;
  if (!state.submissions.length) return null;

  const groups = new Map<string, Submission[]>();
  pending.forEach((s) => {
    const k = sentenceKey(s);
    groups.set(k, [...(groups.get(k) ?? []), s]);
  });
  const list = [...groups.values()].sort((a, b) => b.length - a.length);

  return (
    <section className="panel queue">
      <div className="q-head">
        <b>Badcase 线索 · 待审 {pending.length}</b>
        <small className="muted">已处理 {handled} 条 · 采纳后进入“三堂会审”的 Badcase 库</small>
      </div>
      {list.map((g) => {
        const first = g[0];
        const c = ARB_CASES.find((x) => x.id === first.caseId);
        const kinds = KINDS.filter((k) => g.some((s) => s.kind === k));
        return (
          <article key={sentenceKey(first)} className="q-group">
            <div className="q-top">
              <span className="q-count mono">×{g.length}</span>
              <p>“{first.excerpt}”</p>
            </div>
            <div className="q-meta">
              <span className="muted small">
                {c?.title} · {first.model}
              </span>
              {kinds.map((k) => (
                <span key={k} className="tag" style={cv({ '--c': KIND_META[k].color })}>
                  {KIND_META[k].label}
                </span>
              ))}
            </div>
            <ul className="q-reasons">
              {g.slice(0, 3).map((s) => (
                <li key={s.id}>
                  <b>{s.nickname}</b>：{s.reason}
                </li>
              ))}
              {g.length > 3 && <li className="muted">……另有 {g.length - 3} 条理由</li>}
            </ul>
            <div className="row">
              <button className="btn primary sm" disabled={t.busy} onClick={() => t.review(g, 'accepted', '理由充分，已采纳为 Badcase')}>
                ✓ 采纳为 Badcase
              </button>
              <button className="btn ghost sm" disabled={t.busy} onClick={() => t.review(g, 'rejected', '再核查一下：这句话其实没有问题')}>
                驳回
              </button>
            </div>
          </article>
        );
      })}
      {!list.length && <div className="empty">所有线索都已处理 ✓</div>}
    </section>
  );
}

/* ---------------- 学生名单 ---------------- */
function Roster({ state, now }: { state: ClassState; now: number }) {
  const t = useTeacherClass();
  const poll = state.activity?.kind === 'poll' ? state.activity : null;

  return (
    <section className="panel roster">
      <div className="section-title">
        <span className="eyebrow">ROSTER</span>
        <h3>学生 · {state.students.length}</h3>
      </div>
      <div className="stu-list">
        {state.students.map((s) => {
          const online = now - (t.lastSeen[s.id] ?? 0) < ONLINE_MS;
          const u = state.usage[s.id];
          const subs = state.submissions.filter((x) => x.studentId === s.id).length;
          const voted = poll ? state.votes[poll.id]?.[s.id] !== undefined : false;
          return (
            <div key={s.id} className={`stu-chip ${online ? 'online' : ''}`}>
              <span className="avatar-sm">{s.avatar}</span>
              <div className="stu-main">
                <b>{s.nickname}</b>
                <small>
                  💬 {u?.prompts ?? 0}
                  {u?.blocked ? ` · ⛔ ${u.blocked}` : ''} · 🖌 {subs}
                </small>
              </div>
              {poll && <span className={`voted ${voted ? 'on' : ''}`}>{voted ? '已投' : '未投'}</span>}
              <i className="online-dot" title={online ? '在线' : '离线'} />
            </div>
          );
        })}
        {!state.students.length && (
          <div className="empty">
            还没有学生加入
            <br />
            分享课堂码 <b className="mono">{state.code}</b>
          </div>
        )}
      </div>
    </section>
  );
}
