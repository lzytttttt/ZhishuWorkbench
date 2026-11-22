import { useEffect, useState } from 'react';
import { ARB_CASES, KIND_META } from '../data/arbitration';
import type { BadcaseKind } from '../data/types';
import ScratchCard from '../fun/ScratchCard';
import { play } from '../fun/sound';
import { Seal } from '../fun/Stamp';
import { useNow } from '../hooks/useNow';
import { tally } from '../services/classroom/reducer';
import type { AuditActivity, ClassEvent, ClassState, PollActivity } from '../services/classroom/types';
import { describeError } from '../services/errors';
import { cv, fmtClock } from '../utils/css';
import { uid } from '../utils/plan';
import type { StudentIdentity } from './identity';

type Publish = (e: ClassEvent) => Promise<unknown>;
const KINDS: BadcaseKind[] = ['hallucination', 'logic', 'bias', 'format'];

/* ---------------- 投票 ---------------- */
export function StudentPoll({ act, state, me, publish }: { act: PollActivity; state: ClassState; me: StudentIdentity; publish: Publish }) {
  const [err, setErr] = useState<string | null>(null);
  const myVote = state.votes[act.id]?.[me.id];
  const revealed = !!state.revealed[act.id];
  const counts = tally(state, act);
  const total = counts.reduce((a, b) => a + b, 0);
  // 知识题揭晓后先盖一层宣纸：自己刮开才看到正确答案
  const [uncovered, setUncovered] = useState(false);
  const hasAnswer = act.answer !== undefined;
  const showAnswer = revealed && (!hasAnswer || uncovered);

  const vote = (i: number) => {
    if (revealed) return;
    setErr(null);
    play('paper');
    publish({ type: 'poll.vote', activityId: act.id, option: i }).catch((e: unknown) => setErr(describeError(e)));
  };

  return (
    <section className="s-card s-poll">
      <div className="s-kicker">课堂投票{act.answer !== undefined ? ' · 知识题' : ' · 观点题'}</div>
      <h2 className="s-q">{act.question}</h2>
      {revealed && hasAnswer && (
        <ScratchCard label="老师揭晓了 · 刮开看正确答案" onReveal={() => setUncovered(true)}>
          <div className="scratch-answer">
            <small>正确答案</small>
            <b>
              {String.fromCharCode(65 + act.answer!)} · {act.options[act.answer!]}
            </b>
          </div>
        </ScratchCard>
      )}
      <div className="s-options">
        {act.options.map((o, i) => {
          const pctv = total ? Math.round((counts[i] / total) * 100) : 0;
          const isAnswer = showAnswer && act.answer === i;
          const isWrongMine = showAnswer && hasAnswer && myVote === i && act.answer !== i;
          return (
            <button
              key={i}
              className={`s-option ${myVote === i ? 'mine' : ''} ${isAnswer ? 'answer' : ''} ${isWrongMine ? 'wrong' : ''}`}
              onClick={() => vote(i)}
              disabled={revealed}
            >
              {revealed && <span className="s-fill" style={{ width: `${pctv}%` }} />}
              <span className="s-letter mono">{String.fromCharCode(65 + i)}</span>
              <span className="s-text">{o}</span>
              {revealed && <span className="s-pct mono">{pctv}%</span>}
              {isAnswer && (
                <span className="s-answer-seal">
                  <Seal label="正解" size="sm" />
                </span>
              )}
              {myVote === i && !revealed && <span className="s-badge">我的选择</span>}
            </button>
          );
        })}
      </div>
      {showAnswer && hasAnswer && myVote !== undefined && (
        <div className={`s-verdict ${myVote === act.answer ? 'ok' : 'miss'}`} role="status">
          {myVote === act.answer ? (
            <>
              <b>你的判断和答案对上了</b>
              <span>想一想：你是凭什么知道的？把这条依据讲给同桌听。</span>
            </>
          ) : (
            <>
              <i className="ink-bloom" aria-hidden />
              <b>这正是我们要抓的 Badcase</b>
              <span>你的直觉和答案岔开了——没关系，记下“我为什么这么想”，它就是今天最有价值的线索。</span>
            </>
          )}
        </div>
      )}
      <p className="s-hint">
        {revealed
          ? `老师已揭晓结果 · 共 ${total} 人投票`
          : myVote === undefined
            ? '想好了再选——揭晓前可以修改。'
            : '已提交，揭晓前还可以修改。'}
      </p>
      {err && <p className="err small">{err}</p>}
    </section>
  );
}

/* ---------------- 共建 Badcase ---------------- */
export function StudentAudit({ act, state, me, publish }: { act: AuditActivity; state: ClassState; me: StudentIdentity; publish: Publish }) {
  const c = ARB_CASES.find((x) => x.id === act.caseId) ?? ARB_CASES[0];
  const [brush, setBrush] = useState<BadcaseKind>('hallucination');
  const [flags, setFlags] = useState<Record<string, BadcaseKind>>({});
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(0);

  useEffect(() => {
    setFlags({});
    setReason('');
  }, [act.id]);

  const mine = state.submissions.filter((s) => s.studentId === me.id && s.caseId === c.id);
  const submitted = new Set(mine.filter((s) => state.reviews[s.id]?.status !== 'rejected').map((s) => `${s.modelIndex}-${s.sentenceIndex}`));
  const fresh = Object.entries(flags).filter(([k]) => !submitted.has(k));
  const reasonOk = Array.from(reason.trim()).length >= 6;

  const paint = (key: string) => {
    if (submitted.has(key)) return;
    setFlags((f) => {
      const next = { ...f };
      if (next[key] === brush) delete next[key];
      else next[key] = brush;
      return next;
    });
  };

  const submit = async () => {
    if (!fresh.length || !reasonOk) return;
    setBusy(true);
    setErr(null);
    try {
      for (const [key, kind] of fresh) {
        const [mi, si] = key.split('-').map(Number);
        const o = c.outputs[mi];
        await publish({
          type: 'badcase.submit',
          submission: {
            id: uid() + uid(),
            studentId: me.id,
            nickname: me.nickname,
            caseId: c.id,
            modelIndex: mi,
            sentenceIndex: si,
            model: o.model,
            excerpt: o.sentences[si],
            kind,
            reason: reason.trim(),
            ts: Date.now(),
          },
        });
      }
      setDone(fresh.length);
      setFlags({});
      setReason('');
    } catch (e) {
      setErr(describeError(e));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!done) return;
    const t = window.setTimeout(() => setDone(0), 2200);
    return () => window.clearTimeout(t);
  }, [done]);

  return (
    <section className="s-card s-audit">
      <div className="s-kicker">共建 Badcase · 你是质量仲裁者</div>
      <h2 className="s-q">{c.question}</h2>
      <div className="brushes">
        <span className="muted">审计画笔：</span>
        {KINDS.map((k) => (
          <button key={k} className={`brush ${brush === k ? 'on' : ''}`} style={cv({ '--c': KIND_META[k].color })} onClick={() => setBrush(k)} title={KIND_META[k].hint}>
            <i />
            {KIND_META[k].label}
          </button>
        ))}
      </div>
      <div className="models">
        {c.outputs.map((o, mi) => (
          <article key={o.model} className="model-card">
            <header>
              <b>{o.model}</b>
              <small>{o.base}</small>
            </header>
            <div className="sentences">
              {o.sentences.map((s, si) => {
                const key = `${mi}-${si}`;
                const f = flags[key];
                const sent = submitted.has(key);
                return (
                  <button key={key} className={`sentence ${f ? 'flagged' : ''} ${sent ? 'sent' : ''}`} style={f ? cv({ '--c': KIND_META[f].color }) : undefined} onClick={() => paint(key)}>
                    {s}
                    {f && <span className="badge">{KIND_META[f].label}</span>}
                    {sent && <span className="badge sent">已提交</span>}
                  </button>
                );
              })}
            </div>
          </article>
        ))}
      </div>
      <label className="reason">
        <span>
          我的核查依据 <em>（必填 · 说出你是怎么知道它有问题的）</em>
        </span>
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="例如：查了语文课本，鲁迅就是周树人的笔名，所以两个人不可能一起喝咖啡。" />
      </label>
      <div className="row s-submit">
        <button className="btn primary" disabled={!fresh.length || !reasonOk || busy} onClick={submit}>
          {busy ? '提交中…' : done ? `已提交 ${done} 条 ✓` : `提交给老师（${fresh.length}）`}
        </button>
        {!reasonOk && fresh.length > 0 && <span className="muted small">理由至少写 6 个字</span>}
      </div>
      {err && <p className="err small">{err}</p>}

      {mine.length > 0 && (
        <div className="my-subs">
          <b>我的提交</b>
          {mine.map((s) => {
            const r = state.reviews[s.id];
            return (
              <div key={s.id} className={`my-sub ${r?.status ?? 'pending'}`}>
                <span className="tag" style={cv({ '--c': KIND_META[s.kind].color })}>
                  {KIND_META[s.kind].label}
                </span>
                <span className="ms-text">“{s.excerpt}”</span>
                <span className="ms-status">{!r ? '⏳ 等待老师审阅' : r.status === 'accepted' ? '✓ 已采纳为 Badcase' : '↺ 未采纳'}</span>
                {r?.comment && <small className="ms-comment">老师：{r.comment}</small>}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ---------------- AI-Free 独立推演 ---------------- */
export function AiFreeScreen({ task, since, studentId }: { task?: string; since?: number; studentId: string }) {
  const now = useNow(1000);
  const key = `zhishu.v1.notes.${studentId}`;
  const [notes, setNotes] = useState(() => {
    try {
      return sessionStorage.getItem(key) ?? '';
    } catch {
      return '';
    }
  });
  const [folded, setFolded] = useState(false);
  const elapsed = Math.max(0, Math.floor((now - (since ?? now)) / 1000));

  useEffect(() => {
    try {
      sessionStorage.setItem(key, notes);
    } catch {
      /* ignore */
    }
  }, [key, notes]);

  const fold = (v: boolean) => {
    play('paper');
    setFolded(v);
  };

  return (
    <section className="aifree-screen">
      <div className="af-seal">无 AI</div>
      <div className="af-head">
        <span className="af-dot" />
        <b>AI-Free 独立推演时段</b>
        <span className="mono af-timer">{fmtClock(elapsed)}</span>
      </div>
      <div className="af-body">
        <div className="af-text">
          <p className="af-task">{task || '合上屏幕，用纸和笔独立完成老师布置的任务。'}</p>
          <p className="af-note">所有 AI 功能已暂停。这是锻炼你独立思考“肌肉”的时间——先自己想，再请 AI 帮忙。</p>
        </div>
        <IncenseCoil elapsed={elapsed} />
      </div>
      {folded ? (
        <button className="notepad-folded" onClick={() => fold(false)}>
          <span className="nf-corner" aria-hidden />
          <b>草稿已折角收起</b>
          <small>{notes.trim() ? `${Array.from(notes.trim()).length} 字 · 点开继续写` : '点开继续写'}</small>
        </button>
      ) : (
        <div className="notepad">
          <label htmlFor="af-notes">我的草稿（只保存在这台设备上）</label>
          <button type="button" className="np-corner" onClick={() => fold(true)} title="折角收起草稿" aria-label="折角收起草稿" />
          <textarea id="af-notes" rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="写下你的问题定义、思路草图或第一版答案……" />
        </div>
      )}
    </section>
  );
}

/* 香篆计时：一炷香 15 分钟，从外圈向内慢慢燃尽；只计时，不打分 */
const COIL_SEC = 15 * 60;
const COIL = (() => {
  const pts: { x: number; y: number }[] = [];
  const turns = 3.25;
  const max = Math.PI * 2 * turns;
  for (let k = 0; k <= 240; k++) {
    const th = max - (k / 240) * max; // 外圈 → 内圈
    const r = 7 + 41 * (th / max);
    pts.push({ x: 60 + r * Math.cos(th - Math.PI / 2), y: 60 + r * Math.sin(th - Math.PI / 2) });
  }
  const cum = [0];
  for (let k = 1; k < pts.length; k++) cum.push(cum[k - 1] + Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y));
  const total = cum[cum.length - 1];
  const d = pts.map((p, k) => `${k ? 'L' : 'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const at = (f: number) => {
    const target = f * total;
    let k = cum.findIndex((c) => c >= target);
    if (k < 0) k = pts.length - 1;
    return pts[k];
  };
  return { d, at };
})();

function IncenseCoil({ elapsed }: { elapsed: number }) {
  const round = Math.floor(elapsed / COIL_SEC);
  const f = (elapsed % COIL_SEC) / COIL_SEC;
  const p = f * 100;
  const ember = COIL.at(f);
  return (
    <figure className="incense" aria-label={`香篆计时：第 ${round + 1} 炷香，已燃 ${Math.round(f * 100)}%`}>
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden>
        <circle cx="60" cy="60" r="56" className="ic-tray" />
        <path d={COIL.d} pathLength={100} className="ic-ash" />
        <path d={COIL.d} pathLength={100} className="ic-coil" style={{ strokeDasharray: `${100 - p} 100`, strokeDashoffset: -p }} />
        <g transform={`translate(${ember.x} ${ember.y})`}>
          <circle r="2.6" className="ic-ember" />
          <path d="M0 -4 C -4 -10, 4 -14, 0 -20 C -3 -25, 3 -28, 1 -33" className="ic-smoke" />
        </g>
      </svg>
      <figcaption>
        香篆 · 第 {round + 1} 炷
        <small>一炷 15 分钟，慢慢想</small>
      </figcaption>
    </figure>
  );
}
