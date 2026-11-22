import { useEffect, useMemo, useRef, useState } from 'react';
import { LESSONS } from '../data/curriculum';
import { PROMPT_FUNCTIONS } from '../data/rubric';
import type { ChatActivity } from '../services/classroom/types';
import { toServiceError } from '../services/errors';
import { buildTutorSystemPrompt } from '../services/prompts';
import { useServices } from '../services/ServiceContext';
import type { ChatMessage, VerifyResult } from '../services/types';
import { cv } from '../utils/css';
import { uid } from '../utils/plan';
import type { LogEntry } from './identity';

interface Msg {
  id: string;
  role: 'user' | 'assistant' | 'guard';
  content: string;
}

type Phase = 'idle' | 'check-in' | 'generating' | 'check-out';

const STEPS: { id: Exclude<Phase, 'idle'>; label: string }[] = [
  { id: 'check-in', label: '提问复核' },
  { id: 'generating', label: 'AI 思考' },
  { id: 'check-out', label: '回答复核' },
];

/**
 * 学生端学习伙伴：
 * 学生输入 → Verifier 复核（拦截代写请求与红灯隐私）→ LLM 生成 → Verifier 复核 → 送达。
 * 回答在通过复核之前不会显示在学生屏幕上。
 */
export default function BuddyChat({ act, onUsage }: { act: ChatActivity; onUsage: (e: Omit<LogEntry, 'id' | 'at'>) => void }) {
  const { llm, verifier, config } = useServices();
  const lesson = LESSONS.find((l) => l.id === act.lessonId) ?? LESSONS[0];
  const fn = PROMPT_FUNCTIONS.find((f) => f.id === act.fn) ?? PROMPT_FUNCTIONS[0];
  const system = useMemo(() => buildTutorSystemPrompt(lesson, fn, { noRewrite: true, verifier: true, maxReplace: 2 }), [lesson, fn]);
  const model = config.mode === 'mock' ? 'Mock 模拟模型' : config.defaultModel || '默认模型';

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [draft, setDraft] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [chars, setChars] = useState(0);
  const ctrl = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => () => ctrl.current?.abort(), []);
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  }, [msgs, phase]);

  const push = (m: Omit<Msg, 'id'>) => setMsgs((prev) => [...prev, { ...m, id: uid() }]);

  const check = async (text: string): Promise<VerifyResult | null> => {
    try {
      return await verifier.check(text);
    } catch {
      return null;
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!text || phase !== 'idle') return;
    setDraft('');

    // ① 提问复核
    setPhase('check-in');
    const inCheck = await check(text);
    if (inCheck && !inCheck.passed) {
      const safe = inCheck.category === 'privacy' ? '（含红灯隐私，已拦截，未保存原文）' : text;
      push({ role: 'user', content: safe });
      push({ role: 'guard', content: `${inCheck.label ?? '安全提醒'}：${inCheck.action ?? '这条消息没有发送给 AI。'}` });
      onUsage({ prompt: safe, model, outcome: 'blocked-input' });
      setPhase('idle');
      return;
    }

    const history: ChatMessage[] = msgs
      .filter((m): m is Msg & { role: 'user' | 'assistant' } => m.role !== 'guard')
      .slice(-8)
      .map((m) => ({ role: m.role, content: m.content }));
    push({ role: 'user', content: text });

    // ② 生成（不直接展示）
    setPhase('generating');
    setChars(0);
    const c = new AbortController();
    ctrl.current = c;
    let acc = '';
    try {
      for await (const chunk of llm.stream({
        messages: [{ role: 'system', content: system }, ...history, { role: 'user', content: text }],
        temperature: 0.4,
        scenario: { id: 'tutor.reply', fn: act.fn, lessonId: act.lessonId },
        signal: c.signal,
      })) {
        acc += chunk.delta;
        setChars(acc.length);
      }
    } catch (e) {
      const err = toServiceError(e);
      push({ role: 'guard', content: err.code === 'aborted' ? '你停止了这次提问。' : `学习伙伴暂时无法回答：${err.message}` });
      onUsage({ prompt: text, model, outcome: 'error' });
      setPhase('idle');
      return;
    }

    // ③ 回答复核
    setPhase('check-out');
    const outCheck = await check(acc);
    if (!acc.trim() || (outCheck && !outCheck.passed)) {
      push({ role: 'guard', content: `这条回答未通过安全复核${outCheck?.label ? `（${outCheck.label}）` : ''}，已被拦截。换个方式问问看？` });
      onUsage({ prompt: text, model, outcome: 'blocked-output' });
    } else {
      push({ role: 'assistant', content: acc });
      onUsage({ prompt: text, model, outcome: 'ok' });
    }
    setPhase('idle');
  };

  return (
    <section className="s-card s-chat" style={cv({ '--c': fn.color })}>
      <div className="s-chat-head">
        <div>
          <div className="s-kicker">学习伙伴 · {fn.name}</div>
          <h2 className="s-q sm">{lesson.title}</h2>
        </div>
        <span className="muted small">{fn.desc}</span>
      </div>

      <div className="s-chat-list" ref={listRef}>
        {!msgs.length && (
          <div className="td-empty">
            先想一想你卡在哪一步，再提问。
            <br />
            伙伴不会直接给答案，它会帮你自己想明白。
          </div>
        )}
        {msgs.map((m) =>
          m.role === 'guard' ? (
            <div key={m.id} className="guard-note" role="status">
              {m.content}
            </div>
          ) : (
            <div key={m.id} className={`bubble ${m.role === 'user' ? 'user' : 'ai'}`}>
              {m.content}
            </div>
          ),
        )}
        {phase !== 'idle' && (
          <div className="pipe-mini">
            {STEPS.map((s, i) => {
              const cur = STEPS.findIndex((x) => x.id === phase);
              return (
                <span key={s.id} className={`pm-step ${i < cur ? 'pass' : i === cur ? 'active' : ''}`}>
                  {s.label}
                  {s.id === 'generating' && i === cur && chars > 0 ? ` · ${chars} 字` : ''}
                </span>
              );
            })}
          </div>
        )}
      </div>

      <div className="s-composer">
        <input
          className="search grow"
          value={draft}
          placeholder="把你的问题说清楚：我想知道……我已经试过……"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && send()}
          disabled={phase !== 'idle'}
        />
        {phase === 'generating' ? (
          <button className="btn" onClick={() => ctrl.current?.abort()}>
            ■ 停止
          </button>
        ) : (
          <button className="btn primary" onClick={send} disabled={!draft.trim() || phase !== 'idle'}>
            提问
          </button>
        )}
      </div>
      <p className="s-hint">你的提问和 AI 的回答都会先经过安全复核。老师只能看到你的提问次数，看不到聊天内容。</p>
    </section>
  );
}
