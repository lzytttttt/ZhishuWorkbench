import type { BadcaseKind } from '../../data/types';
import type { ClassEventType, ClassState, Envelope, PollActivity, Submission } from './types';

export const TEACHER = 'teacher';

/** 只有教师可以触发的事件；学生端伪造的同类事件会被忽略 */
const TEACHER_ONLY = new Set<ClassEventType>([
  'session.open',
  'session.close',
  'activity.start',
  'activity.stop',
  'poll.reveal',
  'aifree.set',
  'badcase.review',
]);

export const normalizeCode = (c: string) => c.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

export function isEnvelope(x: unknown): x is Envelope {
  if (!x || typeof x !== 'object') return false;
  const e = x as Record<string, unknown>;
  const ev = e.event as Record<string, unknown> | undefined;
  return typeof e.id === 'string' && typeof e.ts === 'number' && typeof e.actor === 'string' && !!ev && typeof ev.type === 'string';
}

const byTime = (a: Envelope, b: Envelope) => a.ts - b.ts || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** 按 id 去重合并并按时间排序；没有新事件时返回原数组（避免无谓重渲染） */
export function mergeEnvs(prev: Envelope[], add: Envelope[]): Envelope[] {
  if (!add.length) return prev;
  const seen = new Set(prev.map((e) => e.id));
  const fresh: Envelope[] = [];
  for (const e of add) {
    if (!seen.has(e.id)) {
      seen.add(e.id);
      fresh.push(e);
    }
  }
  if (!fresh.length) return prev;
  return [...prev, ...fresh].sort(byTime);
}

export function reduceClass(code: string, envs: Envelope[]): ClassState {
  const s: ClassState = {
    code,
    open: false,
    lessonId: '',
    openedAt: 0,
    students: [],
    activity: null,
    votes: {},
    revealed: {},
    aiFree: { on: false },
    submissions: [],
    reviews: {},
    usage: {},
    eventCount: envs.length,
  };
  const students = new Map<string, ClassState['students'][number]>();

  for (const { actor, event: e, ts } of envs) {
    if (TEACHER_ONLY.has(e.type) && actor !== TEACHER) continue;
    switch (e.type) {
      case 'session.open':
        s.open = true;
        s.lessonId = e.lessonId;
        s.openedAt = ts;
        s.closedAt = undefined;
        break;
      case 'session.close':
        s.open = false;
        s.closedAt = ts;
        s.activity = null;
        s.aiFree = { on: false };
        break;
      case 'student.join':
        if (e.student && e.student.id === actor) {
          const prev = students.get(actor);
          students.set(actor, { ...e.student, joinedAt: prev?.joinedAt ?? e.student.joinedAt });
        }
        break;
      case 'activity.start':
        s.activity = e.activity;
        break;
      case 'activity.stop':
        s.activity = null;
        break;
      case 'poll.vote': {
        const act = s.activity;
        if (!students.has(actor) || !act || act.kind !== 'poll' || act.id !== e.activityId) break;
        if (s.revealed[e.activityId]) break; // 揭晓后锁定
        if (!Number.isInteger(e.option) || e.option < 0 || e.option >= act.options.length) break;
        const box = s.votes[e.activityId] ?? (s.votes[e.activityId] = {});
        box[actor] = e.option;
        break;
      }
      case 'poll.reveal':
        s.revealed[e.activityId] = e.reveal;
        break;
      case 'aifree.set':
        s.aiFree = e.on ? { on: true, task: e.task, since: ts } : { on: false };
        break;
      case 'badcase.submit':
        if (students.has(actor) && e.submission && e.submission.studentId === actor) s.submissions.push(e.submission);
        break;
      case 'badcase.review':
        for (const id of e.submissionIds ?? []) s.reviews[id] = { status: e.status, comment: e.comment, ts };
        break;
      case 'usage.report':
        if (students.has(actor)) {
          s.usage[actor] = { prompts: Math.max(0, Math.floor(Number(e.prompts) || 0)), blocked: Math.max(0, Math.floor(Number(e.blocked) || 0)) };
        }
        break;
    }
  }
  s.students = [...students.values()].sort((a, b) => a.joinedAt - b.joinedAt);
  return s;
}

/* ---------------- 聚合工具 ---------------- */
export function tally(state: ClassState, act: PollActivity): number[] {
  const counts = act.options.map(() => 0);
  Object.values(state.votes[act.id] ?? {}).forEach((o) => {
    if (counts[o] !== undefined) counts[o]++;
  });
  return counts;
}

export const sentenceKey = (s: Pick<Submission, 'caseId' | 'modelIndex' | 'sentenceIndex'>) => `${s.caseId}:${s.modelIndex}:${s.sentenceIndex}`;

export function majorityKind(subs: Submission[]): BadcaseKind {
  const c = new Map<BadcaseKind, number>();
  subs.forEach((s) => c.set(s.kind, (c.get(s.kind) ?? 0) + 1));
  return [...c.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'hallucination';
}
