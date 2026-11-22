import { useCallback, useEffect, useRef, useState } from 'react';
import { VERIFIER_RULES } from '../data/governance';
import { uid } from '../utils/plan';

/* ---------------- 学生身份（每个标签页独立，便于本机多开演示） ---------------- */
export interface StudentIdentity {
  id: string;
  nickname: string;
  avatar: string;
  code: string;
  joinedAt: number;
}

const ID_KEY = 'zhishu.v1.student';

export function loadIdentity(): StudentIdentity | null {
  try {
    const raw = sessionStorage.getItem(ID_KEY);
    const v = raw ? (JSON.parse(raw) as StudentIdentity) : null;
    return v && typeof v.id === 'string' && typeof v.code === 'string' ? v : null;
  } catch {
    return null;
  }
}

export function saveIdentity(v: StudentIdentity | null) {
  try {
    if (v) sessionStorage.setItem(ID_KEY, JSON.stringify(v));
    else sessionStorage.removeItem(ID_KEY);
  } catch {
    /* ignore */
  }
}

export const newStudentId = () => `stu_${uid()}${uid()}`;

const AVATARS = ['🦉', '🐼', '🦊', '🐬', '🐢', '🦁', '🐧', '🐝', '🦄', '🐙', '🐿️', '🦋'];
const ANIMALS = ['猫头鹰', '熊猫', '狐狸', '海豚', '乌龟', '狮子', '企鹅', '蜜蜂', '独角兽', '章鱼', '松鼠', '蝴蝶'];
const ADJ = ['勇敢的', '好奇的', '安静的', '机智的', '耐心的', '闪亮的', '认真的', '爱问的', '细心的', '会想的'];

export interface NameOption {
  nickname: string;
  avatar: string;
}

export function suggestNames(n = 4): NameOption[] {
  const picks = new Set<number>();
  while (picks.size < n) picks.add(Math.floor(Math.random() * ANIMALS.length));
  return [...picks].map((i) => ({ nickname: ADJ[Math.floor(Math.random() * ADJ.length)] + ANIMALS[i], avatar: AVATARS[i] }));
}

export function validateNickname(name: string): string | null {
  const n = name.trim();
  if (!n) return '请给自己起一个昵称';
  if (Array.from(n).length > 12) return '昵称最多 12 个字';
  const privacy = VERIFIER_RULES.find((r) => r.id === 'privacy');
  if (/\d{5,}/.test(n) || privacy?.pattern.test(n)) return '昵称里不要出现电话、证件号等红灯隐私哦';
  return null;
}

/* ---------------- 我的 AI 协作日志 ---------------- */
export type LogOutcome = 'ok' | 'blocked-input' | 'blocked-output' | 'error';

export interface LogEntry {
  id: string;
  at: number;
  prompt: string;
  model: string;
  outcome: LogOutcome;
}

export interface Reflection {
  checked: string;
  rewrote: string;
}

interface LogData {
  /** 归属的学生 id：切换身份时防止把旧数据写进新身份 */
  owner: string | null;
  entries: LogEntry[];
  reflection: Reflection;
}

function readLog(studentId: string | null): LogData {
  const empty: LogData = { owner: studentId, entries: [], reflection: { checked: '', rewrote: '' } };
  if (!studentId) return empty;
  try {
    const raw = sessionStorage.getItem(`zhishu.v1.slog.${studentId}`);
    if (!raw) return empty;
    const saved = JSON.parse(raw) as Partial<LogData>;
    return { ...empty, entries: Array.isArray(saved.entries) ? saved.entries : [], reflection: { ...empty.reflection, ...(saved.reflection ?? {}) } };
  } catch {
    return empty;
  }
}

export function useStudentLog(studentId: string | null) {
  const [data, setData] = useState<LogData>(() => readLog(studentId));
  const ref = useRef(data);
  ref.current = data;

  useEffect(() => {
    if (data.owner !== studentId) {
      setData(readLog(studentId));
      return;
    }
    if (!studentId) return;
    try {
      sessionStorage.setItem(`zhishu.v1.slog.${studentId}`, JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }, [studentId, data]);

  /** 追加一条记录，并同步返回最新的完整列表（用于立即上报用量） */
  const add = useCallback((e: Omit<LogEntry, 'id' | 'at'>): LogEntry[] => {
    const entry: LogEntry = { ...e, id: uid(), at: Date.now() };
    const next = { ...ref.current, entries: [...ref.current.entries, entry] };
    ref.current = next;
    setData(next);
    return next.entries;
  }, []);

  const setReflection = useCallback((r: Reflection) => {
    ref.current = { ...ref.current, reflection: r };
    setData(ref.current);
  }, []);

  const totals = {
    prompts: data.entries.length,
    blocked: data.entries.filter((e) => e.outcome === 'blocked-input' || e.outcome === 'blocked-output').length,
  };

  return { entries: data.entries, reflection: data.reflection, totals, add, setReflection };
}
