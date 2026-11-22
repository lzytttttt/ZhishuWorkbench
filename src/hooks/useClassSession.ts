import { useCallback, useEffect, useMemo, useState } from 'react';
import { mergeEnvs, reduceClass, TEACHER } from '../services/classroom/reducer';
import type { ClassEvent, ClassState, Envelope } from '../services/classroom/types';
import { describeError, ServiceError } from '../services/errors';
import { useServices } from '../services/ServiceContext';

export type ConnStatus = 'idle' | 'loading' | 'live' | 'reconnecting' | 'missing' | 'error';

export interface ClassSession {
  state: ClassState | null;
  status: ConnStatus;
  error: string | null;
  /** 每位学生最近一次活跃时间（心跳 ∪ 最近事件） */
  lastSeen: Record<string, number>;
  publish: (event: ClassEvent) => Promise<Envelope>;
}

/** 订阅一个课堂：加载完整事件日志 + 实时增量，推导出一致的课堂状态 */
export function useClassSession(code: string | null, actor: string | null): ClassSession {
  const { classroom } = useServices();
  const [envs, setEnvs] = useState<Envelope[]>([]);
  const [status, setStatus] = useState<ConnStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [presence, setPresence] = useState<Record<string, number>>({});

  useEffect(() => {
    setEnvs([]);
    setPresence({});
    setError(null);
    if (!code) {
      setStatus('idle');
      return;
    }
    let alive = true;
    const ctrl = new AbortController();
    setStatus('loading');

    const unsubscribe = classroom.subscribe(code, {
      onEvents: (list) => {
        if (alive) setEnvs((prev) => mergeEnvs(prev, list));
      },
      onPresence: (id, at) => {
        if (alive) setPresence((p) => (p[id] && p[id] >= at ? p : { ...p, [id]: at }));
      },
      onStatus: (s) => {
        if (alive) setStatus((prev) => (prev === 'missing' || prev === 'loading' ? prev : s));
      },
    });

    classroom
      .load(code, ctrl.signal)
      .then((list) => {
        if (!alive) return;
        if (list === null) {
          setStatus('missing');
          return;
        }
        setEnvs((prev) => mergeEnvs(prev, list));
        setStatus('live');
      })
      .catch((e: unknown) => {
        if (!alive) return;
        setError(describeError(e));
        setStatus('error');
      });

    return () => {
      alive = false;
      ctrl.abort();
      unsubscribe();
    };
  }, [classroom, code]);

  const state = useMemo(() => (code && envs.length ? reduceClass(code, envs) : null), [code, envs]);

  const lastSeen = useMemo(() => {
    const m: Record<string, number> = { ...presence };
    for (const e of envs) if (e.actor !== TEACHER && (m[e.actor] ?? 0) < e.ts) m[e.actor] = e.ts;
    return m;
  }, [presence, envs]);

  const publish = useCallback(
    async (event: ClassEvent) => {
      if (!code || !actor) throw new ServiceError('not_configured', '尚未加入课堂');
      const env = await classroom.publish(code, actor, event);
      setEnvs((prev) => mergeEnvs(prev, [env]));
      return env;
    },
    [classroom, code, actor],
  );

  return { state, status, error, lastSeen, publish };
}
