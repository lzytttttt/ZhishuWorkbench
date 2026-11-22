import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ARB_CASES } from '../data/arbitration';
import { useClassSession, type ClassSession } from '../hooks/useClassSession';
import { majorityKind, TEACHER } from '../services/classroom/reducer';
import type { Activity, Submission } from '../services/classroom/types';
import { describeError } from '../services/errors';
import { useServices } from '../services/ServiceContext';
import { useApp } from './AppContext';

const KEY = 'zhishu.v1.hostCode';

interface TeacherClassCtx extends ClassSession {
  code: string | null;
  busy: boolean;
  actionError: string | null;
  aiFreeTask: string;
  start: (lessonId: string) => Promise<void>;
  end: () => Promise<void>;
  /** 仅在本机忘记课堂（例如课堂已失效） */
  forget: () => void;
  launch: (activity: Activity) => Promise<void>;
  stop: () => Promise<void>;
  reveal: (activityId: string, reveal: boolean) => Promise<void>;
  setAiFreeTask: (task: string) => void;
  updateAiFreeTask: (task: string) => Promise<void>;
  review: (subs: Submission[], status: 'accepted' | 'rejected', comment?: string) => Promise<void>;
}

const Ctx = createContext<TeacherClassCtx | null>(null);

/**
 * 教师端课堂主持：只挂载在教师外壳中（学生标签页不挂载，避免误发教师事件）。
 * 顶栏的 AI-Free 开关与课堂状态双向同步：载入课堂时以课堂为准，之后以教师操作为准。
 */
export function TeacherClassProvider({ children }: { children: ReactNode }) {
  const { classroom } = useServices();
  const { aiFree, setAiFree, addBadcases } = useApp();
  const [code, setCodeState] = useState<string | null>(() => {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });
  const session = useClassSession(code, TEACHER);
  const { state, publish } = session;
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [aiFreeTask, setTaskState] = useState('');
  const taskRef = useRef('');
  const adopted = useRef<string | null>(null);
  const pendingAiFree = useRef<boolean | null>(null);

  const setCode = useCallback((c: string | null) => {
    setCodeState(c);
    try {
      if (c) localStorage.setItem(KEY, c);
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const run = useCallback(async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setActionError(null);
    try {
      await fn();
    } catch (e) {
      setActionError(describeError(e));
    } finally {
      setBusy(false);
    }
  }, []);

  // AI-Free 同步
  const classAiFree = state?.aiFree.on;
  const classOpen = state?.open;
  useEffect(() => {
    if (!code || classAiFree === undefined || !classOpen) return;
    if (adopted.current !== code) {
      adopted.current = code;
      if (classAiFree !== aiFree) setAiFree(classAiFree);
      return;
    }
    if (classAiFree === aiFree || pendingAiFree.current === aiFree) return;
    pendingAiFree.current = aiFree;
    publish({ type: 'aifree.set', on: aiFree, task: aiFree ? taskRef.current || undefined : undefined })
      .catch((e: unknown) => setActionError(describeError(e)))
      .finally(() => {
        pendingAiFree.current = null;
      });
  }, [code, classAiFree, classOpen, aiFree, setAiFree, publish]);

  const setAiFreeTask = useCallback((t: string) => {
    taskRef.current = t;
    setTaskState(t);
  }, []);

  const value = useMemo<TeacherClassCtx>(
    () => ({
      ...session,
      code,
      busy,
      actionError,
      aiFreeTask,
      start: (lessonId) =>
        run(async () => {
          adopted.current = null;
          setCode(await classroom.create(lessonId));
        }),
      end: () =>
        run(async () => {
          if (state?.open) await publish({ type: 'session.close' });
          if (aiFree) setAiFree(false);
          setCode(null);
        }),
      forget: () => setCode(null),
      launch: (activity) => run(() => publish({ type: 'activity.start', activity })),
      stop: () => run(() => publish({ type: 'activity.stop' })),
      reveal: (activityId, reveal) => run(() => publish({ type: 'poll.reveal', activityId, reveal })),
      setAiFreeTask,
      updateAiFreeTask: (task) =>
        run(async () => {
          setAiFreeTask(task);
          await publish({ type: 'aifree.set', on: true, task: task || undefined });
        }),
      review: (subs, status, comment) =>
        run(async () => {
          if (!subs.length) return;
          if (status === 'accepted') {
            const first = subs[0];
            const c = ARB_CASES.find((x) => x.id === first.caseId);
            await addBadcases([
              {
                question: c?.question ?? '课堂共建',
                model: `${first.model} · 学生共建 ×${subs.length}`,
                excerpt: first.excerpt,
                kind: majorityKind(subs),
              },
            ]);
          }
          await publish({ type: 'badcase.review', submissionIds: subs.map((s) => s.id), status, comment });
        }),
    }),
    [session, code, busy, actionError, aiFreeTask, run, classroom, setCode, state?.open, publish, aiFree, setAiFree, setAiFreeTask, addBadcases],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTeacherClass(): TeacherClassCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useTeacherClass must be used within TeacherClassProvider');
  return v;
}
