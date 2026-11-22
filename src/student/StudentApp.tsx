import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { Logo } from '../components/Icons';
import { play, setClassMode } from '../fun/sound';
import { LESSONS } from '../data/curriculum';
import { useClassSession, type ConnStatus } from '../hooks/useClassSession';
import { navigate } from '../hooks/useHashRoute';
import { normalizeCode, reduceClass } from '../services/classroom/reducer';
import type { ClassState } from '../services/classroom/types';
import { describeError } from '../services/errors';
import { useServices } from '../services/ServiceContext';
import BuddyChat from './BuddyChat';
import { loadIdentity, newStudentId, saveIdentity, suggestNames, useStudentLog, validateNickname, type LogEntry, type NameOption, type StudentIdentity } from './identity';
import MyLog from './MyLog';
import { AiFreeScreen, StudentAudit, StudentPoll } from './StudentActivities';

type Tab = 'class' | 'log';

const CONN_LABEL: Record<ConnStatus, string> = {
  idle: '未连接',
  loading: '连接中',
  live: '已连接',
  reconnecting: '重连中',
  missing: '课堂不存在',
  error: '连接失败',
};

export default function StudentApp({ initialCode }: { initialCode?: string }) {
  const { classroom } = useServices();
  const [me, setMe] = useState<StudentIdentity | null>(loadIdentity);
  const urlCode = initialCode ? normalizeCode(initialCode) : '';
  const active = me && (!urlCode || urlCode === me.code) ? me : null;
  const session = useClassSession(active?.code ?? null, active?.id ?? null);
  const { state, status, publish } = session;
  const log = useStudentLog(active?.id ?? null);
  const [tab, setTab] = useState<Tab>('class');
  const rejoined = useRef(false);

  useEffect(() => {
    document.title = '知枢 · 学生端';
    return () => {
      document.title = '知枢 · AI Native 教学工作台';
    };
  }, []);

  // 课堂模式：声音默认开启
  const classOpen = Boolean(state?.open);
  useEffect(() => {
    setClassMode(classOpen);
    return () => setClassMode(false);
  }, [classOpen]);

  // 在线心跳
  useEffect(() => {
    if (!active || status !== 'live') return;
    const beat = () => {
      classroom.ping(active.code, active.id).catch(() => undefined);
    };
    beat();
    const t = window.setInterval(beat, 10000);
    return () => window.clearInterval(t);
  }, [active, status, classroom]);

  // 远程课堂重置等情况下自动补发加入事件
  useEffect(() => {
    if (!active || !state?.open || rejoined.current) return;
    if (!state.students.some((s) => s.id === active.id)) {
      rejoined.current = true;
      publish({ type: 'student.join', student: { id: active.id, nickname: active.nickname, avatar: active.avatar, joinedAt: active.joinedAt } }).catch(() => undefined);
    }
  }, [active, state, publish]);

  const onUsage = useCallback(
    (e: Omit<LogEntry, 'id' | 'at'>) => {
      const all = log.add(e);
      const blocked = all.filter((x) => x.outcome === 'blocked-input' || x.outcome === 'blocked-output').length;
      publish({ type: 'usage.report', prompts: all.length, blocked }).catch(() => undefined);
    },
    [log, publish],
  );

  const leave = () => {
    if (active && !window.confirm('确定退出当前课堂吗？退出后需要重新输入课堂码加入。')) return;
    saveIdentity(null);
    setMe(null);
    navigate('student');
  };

  if (!active) {
    return (
      <div className="student-app">
        <JoinScreen
          initialCode={urlCode || me?.code || ''}
          onJoined={(ident) => {
            rejoined.current = false;
            setMe(ident);
            setTab('class');
          }}
        />
      </div>
    );
  }

  const lesson = LESSONS.find((l) => l.id === state?.lessonId);
  const aiFree = Boolean(state && state.open && state.aiFree.on);

  let body: ReactElement;
  if (status === 'missing') {
    body = <Notice title="没有找到这个课堂" text="课堂码可能输错了，或者这节课已被老师清除。" action={{ label: '重新加入', onClick: leave }} />;
  } else if (!state) {
    body = status === 'error' ? <Notice title="连接失败" text={session.error ?? '请检查网络后刷新页面'} /> : <Loading />;
  } else if (tab === 'log') {
    body = <MyLog entries={log.entries} reflection={log.reflection} setReflection={log.setReflection} lessonTitle={lesson?.title ?? '本节课'} nickname={active.nickname} />;
  } else if (!state.open) {
    body = <ClosedScreen state={state} me={active} prompts={log.totals.prompts} onLog={() => setTab('log')} />;
  } else if (aiFree) {
    body = <AiFreeScreen task={state.aiFree.task} since={state.aiFree.since} studentId={active.id} />;
  } else if (!state.activity) {
    body = <Waiting lessonTitle={lesson?.title} hook={lesson?.hook} storeKey={`${active.id}.${state.lessonId}`} />;
  } else if (state.activity.kind === 'poll') {
    body = <StudentPoll key={state.activity.id} act={state.activity} state={state} me={active} publish={publish} />;
  } else if (state.activity.kind === 'audit') {
    body = <StudentAudit key={state.activity.id} act={state.activity} state={state} me={active} publish={publish} />;
  } else {
    body = <BuddyChat key={state.activity.id} act={state.activity} onUsage={onUsage} />;
  }

  return (
    <div className={`student-app ${aiFree ? 'ai-free' : ''}`}>
      <header className="s-header">
        <div className="s-brand">
          <span className="s-logo">
            <Logo size={22} />
          </span>
          <div>
            <b>知枢 · 学生端</b>
            <small>{lesson?.title ?? '课堂'}</small>
          </div>
        </div>
        <div className="s-me">
          <span className={`s-status ${status}`} title={CONN_LABEL[status]}>
            <i className={`conn ${status}`} />
            <span>{CONN_LABEL[status]}</span>
          </span>
          <span className="mono s-code" title="课堂码">
            {active.code}
          </span>
          <span className="s-user">
            <span className="avatar-sm">{active.avatar}</span>
            <b>{active.nickname}</b>
          </span>
          <button className="s-leave" onClick={leave} title="退出课堂">
            退出
          </button>
        </div>
      </header>

      <nav className="s-tabs" aria-label="学生端导航">
        <div className="s-seg" role="tablist">
          <button role="tab" aria-selected={tab === 'class'} className={tab === 'class' ? 'on' : ''} onClick={() => setTab('class')}>
            <TabIcon kind="class" />
            课堂
          </button>
          <button role="tab" aria-selected={tab === 'log'} className={tab === 'log' ? 'on' : ''} onClick={() => setTab('log')}>
            <TabIcon kind="log" />
            我的 AI 日志
            {log.totals.prompts > 0 && <span className="s-tab-count mono">{log.totals.prompts}</span>}
          </button>
        </div>
      </nav>

      <main className="s-main" key={`${tab}-${state?.activity?.id ?? 'none'}-${aiFree}`}>
        {body}
      </main>
    </div>
  );
}

/* ---------------- 加入课堂 ---------------- */
function JoinScreen({ initialCode, onJoined }: { initialCode: string; onJoined: (i: StudentIdentity) => void }) {
  const { classroom } = useServices();
  const [code, setCode] = useState(initialCode);
  const [names, setNames] = useState<NameOption[]>(() => suggestNames());
  const [pick, setPick] = useState(0);
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const join = async () => {
    const c = normalizeCode(code);
    if (c.length !== 6) {
      setErr('课堂码是 6 位字母或数字');
      return;
    }
    const nickname = custom.trim() || names[pick].nickname;
    const bad = validateNickname(nickname);
    if (bad) {
      setErr(bad);
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const list = await classroom.load(c);
      if (!list) throw new Error('没有找到这个课堂，请核对课堂码');
      if (!reduceClass(c, list).open) throw new Error('这节课已经结束了');
      const id = newStudentId();
      const student = { id, nickname, avatar: names[pick].avatar, joinedAt: Date.now() };
      await classroom.publish(c, id, { type: 'student.join', student });
      const ident: StudentIdentity = { ...student, code: c };
      saveIdentity(ident);
      onJoined(ident);
      navigate(`student/${c}`);
    } catch (e) {
      setErr(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="join">
      <div className="join-mark">
        <Logo size={40} />
        <span className="eyebrow">知枢 · 学生端</span>
      </div>
      <h1 className="join-title">
        加入课堂 <em>成为 AI 系统的导演</em>
      </h1>
      <label className="join-field">
        <span>课堂码 <em className="join-sub">6 位字母或数字，看老师的投屏</em></span>
        <CodeCells value={code} onChange={setCode} autoFocus={!initialCode} onEnter={join} />
      </label>
      <div className="join-field">
        <span>
          选一个昵称 <em>（不要用真实姓名）</em>
        </span>
        <div className="name-picks">
          {names.map((n, i) => (
            <button
              key={n.nickname}
              className={`name-pick ${pick === i && !custom ? 'on' : ''}`}
              onClick={() => {
                setPick(i);
                setCustom('');
              }}
            >
              <span className="np-avatar">{n.avatar}</span>
              {n.nickname}
            </button>
          ))}
          <button className="name-pick shuffle" onClick={() => setNames(suggestNames())} title="换一批">
            <span className="np-avatar">↻</span>
            换一批
          </button>
        </div>
        <input
          className="search"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && join()}
          placeholder="或者自己起一个（最多 12 个字）"
          maxLength={12}
        />
      </div>
      {err && <p className="err">{err}</p>}
      <button className="btn primary lg" onClick={join} disabled={busy || normalizeCode(code).length !== 6}>
        {busy ? '加入中…' : '进入课堂 →'}
      </button>
      <div className="join-tip">
        <p>
          <b>红灯隐私</b>真实姓名、家庭住址、电话、密码，永远不要告诉 AI。
        </p>
        {classroom.kind === 'mock' && <p className="muted">本机演示模式：请在同一浏览器中先由老师端开启课堂。</p>}
      </div>
    </section>
  );
}

/* ---------------- 各种状态页 ---------------- */
function Waiting({ lessonTitle, hook, storeKey }: { lessonTitle?: string; hook?: string; storeKey: string }) {
  return (
    <section className="s-card s-waiting">
      <div className="wait-mark" aria-hidden>
        <i />
      </div>
      <b>等待老师发起活动…</b>
      {lessonTitle && <span className="muted">本节课：{lessonTitle}</span>}
      {hook && <blockquote className="wait-hook">{hook}</blockquote>}
      <PredictCard storeKey={storeKey} />
    </section>
  );
}

/* 预判卡：先写下“我现在相信什么”，折起来；揭晓之后再翻开对照 */
function PredictCard({ storeKey }: { storeKey: string }) {
  const key = `zhishu.v1.predict.${storeKey}`;
  const [card, setCard] = useState<{ text: string; folded: boolean }>(() => {
    try {
      const raw = sessionStorage.getItem(key);
      return raw ? (JSON.parse(raw) as { text: string; folded: boolean }) : { text: '', folded: false };
    } catch {
      return { text: '', folded: false };
    }
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(key, JSON.stringify(card));
    } catch {
      /* ignore */
    }
  }, [key, card]);

  const fold = (folded: boolean) => {
    play('paper');
    setCard((c) => ({ ...c, folded }));
  };

  return (
    <div className={`predict-card ${card.folded ? 'folded' : ''}`}>
      {card.folded ? (
        <button className="pc-folded" onClick={() => fold(false)} title="翻开预判卡">
          <span className="pc-flap" aria-hidden />
          <b>预判卡已折好</b>
          <small>揭晓之后翻开，对照一下当初的自己 ↺</small>
        </button>
      ) : (
        <>
          <span className="pc-kicker">预判卡 · 只给自己看</span>
          <p className="s-hint">先想一想：关于这个问题，你现在相信什么？为什么？</p>
          <textarea rows={3} value={card.text} onChange={(e) => setCard((c) => ({ ...c, text: e.target.value }))} placeholder="写一句就够：我猜……因为……" />
          <button className="btn sm" onClick={() => fold(true)} disabled={!card.text.trim()}>
            折起来 ⤵
          </button>
        </>
      )}
    </div>
  );
}

function ClosedScreen({ state, me, prompts, onLog }: { state: ClassState; me: StudentIdentity; prompts: number; onLog: () => void }) {
  const mine = state.submissions.filter((s) => s.studentId === me.id);
  const accepted = mine.filter((s) => state.reviews[s.id]?.status === 'accepted').length;
  const votes = Object.values(state.votes).filter((v) => v[me.id] !== undefined).length;
  return (
    <section className="s-card s-closed">
      <div className="s-kicker">下课啦</div>
      <h2 className="s-q">本节课已结束，谢谢你的参与！</h2>
      <div className="log-kpis">
        <div>
          <small>参与投票</small>
          <b className="mono">{votes}</b>
        </div>
        <div>
          <small>Badcase 被采纳</small>
          <b className="mono">
            {accepted}/{mine.length}
          </b>
        </div>
        <div>
          <small>向 AI 提问</small>
          <b className="mono">{prompts}</b>
        </div>
      </div>
      <p className="s-hint">别忘了完成你的 AI 使用透明度声明——它比 AI 写出的内容更重要。</p>
      <button className="btn primary" onClick={onLog}>
        填写透明度声明 →
      </button>
    </section>
  );
}

function Notice({ title, text, action }: { title: string; text: string; action?: { label: string; onClick: () => void } }) {
  return (
    <section className="s-card s-notice">
      <h2 className="s-q sm">{title}</h2>
      <p className="muted">{text}</p>
      {action && (
        <button className="btn primary" onClick={action.onClick}>
          {action.label}
        </button>
      )}
    </section>
  );
}

function Loading() {
  return (
    <div className="loading">
      <div className="loading-orb" />
      <span>正在推开教室的门…</span>
    </div>
  );
}

/* ---------------- 课堂码：6 格输入 ---------------- */
function CodeCells({ value, onChange, autoFocus, onEnter }: { value: string; onChange: (v: string) => void; autoFocus?: boolean; onEnter?: () => void }) {
  const [focused, setFocused] = useState(false);
  const chars = Array.from({ length: 6 }, (_, i) => value[i] ?? '');
  const active = Math.min(value.length, 5);
  return (
    <div className={`code-cells ${focused ? 'focused' : ''}`}>
      {chars.map((ch, i) => (
        <span key={i} className={`code-cell ${ch ? 'filled' : ''} ${i === active ? 'active' : ''} ${i === active && value.length < 6 ? 'caret' : ''}`}>
          {ch}
        </span>
      ))}
      <input
        aria-label="课堂码"
        value={value}
        maxLength={6}
        onChange={(e) => onChange(normalizeCode(e.target.value))}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={autoFocus}
        autoComplete="off"
        autoCapitalize="characters"
        autoCorrect="off"
        spellCheck={false}
        inputMode="text"
      />
    </div>
  );
}

function TabIcon({ kind }: { kind: 'class' | 'log' }) {
  const p = { width: 16, height: 16, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true };
  return kind === 'class' ? (
    <svg {...p}>
      <circle cx="12" cy="12" r="2.2" />
      <path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6" />
    </svg>
  ) : (
    <svg {...p}>
      <path d="M6 3.5h9l3 3V20.5H6z" />
      <path d="M9 10h6M9 14h6M9 18h3" />
    </svg>
  );
}
