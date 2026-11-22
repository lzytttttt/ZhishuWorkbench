import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';
import { LESSONS } from '../data/curriculum';
import { vitals } from '../fun/vitals';
import type { Badcase, BadcaseStatus, NewBadcase, Segment } from '../data/types';
import { describeError } from '../services/errors';
import { useServices } from '../services/ServiceContext';
import type { ProviderKind } from '../services/types';
import { defaultPlan } from '../utils/plan';

export const STATUS_FLOW: BadcaseStatus[] = ['found', 'attributed', 'fixed', 'regression'];

function usePersistent<T>(key: string, init: () => T): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : init();
    } catch {
      return init();
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* 存储不可用时静默降级 */
    }
  }, [key, value]);
  return [value, setValue];
}

interface AppCtx {
  aiFree: boolean;
  aiFreeSince: number | null;
  setAiFree: (v: boolean) => void;
  badcases: Badcase[];
  badcaseSource: ProviderKind;
  badcaseError: string | null;
  addBadcases: (items: NewBadcase[]) => Promise<void>;
  advanceBadcase: (id: string) => Promise<void>;
  removeBadcase: (id: string) => Promise<void>;
  planLessonId: string;
  plan: Segment[];
  setPlan: (s: Segment[]) => void;
  choosePlanLesson: (id: string) => void;
}

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const { badcases: repo } = useServices();
  const [aiFree, setAiFreeRaw] = useState(false);
  const [aiFreeSince, setAiFreeSince] = useState<number | null>(null);
  const [badcases, setBadcases] = useState<Badcase[]>([]);
  const [badcaseError, setBadcaseError] = useState<string | null>(null);
  const listRef = useRef<Badcase[]>([]);
  const [planLessonId, setPlanLessonId] = usePersistent<string>('zhishu.v1.planLesson', () => LESSONS[4].id);
  const [plan, setPlanState] = usePersistent<Segment[]>('zhishu.v1.plan', () => defaultPlan(LESSONS[4]));

  useEffect(() => {
    listRef.current = badcases;
  }, [badcases]);

  useEffect(() => {
    document.body.classList.toggle('ai-free-mode', aiFree);
    // AI-Free：认知心脏拉成平线；结束时“除颤”一次
    vitals.setFlat(aiFree);
  }, [aiFree]);

  // 仓库（本地 / 远程）切换时重新加载
  useEffect(() => {
    let alive = true;
    setBadcaseError(null);
    repo
      .list()
      .then((list) => {
        if (alive) setBadcases(list);
      })
      .catch((e: unknown) => {
        if (alive) setBadcaseError(describeError(e));
      });
    return () => {
      alive = false;
    };
  }, [repo]);

  const setAiFree = useCallback((v: boolean) => {
    setAiFreeRaw(v);
    setAiFreeSince(v ? Date.now() : null);
  }, []);

  const addBadcases = useCallback(
    async (items: NewBadcase[]) => {
      if (!items.length) return;
      try {
        const created = await repo.addMany(items);
        setBadcases((prev) => [...created, ...prev]);
        setBadcaseError(null);
      } catch (e) {
        setBadcaseError(describeError(e));
      }
    },
    [repo],
  );

  // 乐观更新 + 失败回滚
  const advanceBadcase = useCallback(
    async (id: string) => {
      const cur = listRef.current.find((b) => b.id === id);
      if (!cur) return;
      const next = STATUS_FLOW[Math.min(STATUS_FLOW.length - 1, STATUS_FLOW.indexOf(cur.status) + 1)];
      setBadcases((prev) => prev.map((b) => (b.id === id ? { ...b, status: next } : b)));
      try {
        await repo.updateStatus(id, next);
      } catch (e) {
        setBadcases((prev) => prev.map((b) => (b.id === id ? { ...b, status: cur.status } : b)));
        setBadcaseError(describeError(e));
      }
    },
    [repo],
  );

  const removeBadcase = useCallback(
    async (id: string) => {
      const snapshot = listRef.current;
      setBadcases((prev) => prev.filter((b) => b.id !== id));
      try {
        await repo.remove(id);
      } catch (e) {
        setBadcases(snapshot);
        setBadcaseError(describeError(e));
      }
    },
    [repo],
  );

  const setPlan = useCallback((s: Segment[]) => setPlanState(s), [setPlanState]);

  const choosePlanLesson = useCallback(
    (id: string) => {
      const lesson = LESSONS.find((l) => l.id === id);
      if (!lesson) return;
      setPlanLessonId(id);
      setPlanState(defaultPlan(lesson));
    },
    [setPlanLessonId, setPlanState],
  );

  const value = useMemo<AppCtx>(
    () => ({
      aiFree,
      aiFreeSince,
      setAiFree,
      badcases,
      badcaseSource: repo.kind,
      badcaseError,
      addBadcases,
      advanceBadcase,
      removeBadcase,
      planLessonId,
      plan,
      setPlan,
      choosePlanLesson,
    }),
    [aiFree, aiFreeSince, setAiFree, badcases, repo, badcaseError, addBadcases, advanceBadcase, removeBadcase, planLessonId, plan, setPlan, choosePlanLesson],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp(): AppCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useApp must be used within AppProvider');
  return v;
}
