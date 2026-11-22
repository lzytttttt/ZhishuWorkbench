/* 课程卡上的三种小印章：已授课 / 已验证（备课定稿）/ 有 Badcase——只记在本机 */
import { useEffect, useState } from 'react';

export type MarkKind = 'taught' | 'verified' | 'badcase';
type Marks = Record<MarkKind, string[]>;

const KEY = 'zhishu.v1.lessonMarks';
const EVENT = 'zhishu:marks';

function read(): Marks {
  const empty: Marks = { taught: [], verified: [], badcase: [] };
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...empty, ...(JSON.parse(raw) as Partial<Marks>) } : empty;
  } catch {
    return empty;
  }
}

export function addMark(kind: MarkKind, lessonId: string) {
  if (!lessonId) return;
  const m = read();
  if (m[kind].includes(lessonId)) return;
  m[kind] = [...m[kind], lessonId];
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useLessonMarks(): Marks {
  const [m, setM] = useState<Marks>(read);
  useEffect(() => {
    const f = () => setM(read());
    window.addEventListener(EVENT, f);
    window.addEventListener('storage', f);
    return () => {
      window.removeEventListener(EVENT, f);
      window.removeEventListener('storage', f);
    };
  }, []);
  return m;
}

export const MARK_META: Record<MarkKind, { seal: string; label: string }> = {
  taught: { seal: '授', label: '已授课' },
  verified: { seal: '验', label: '已验证 · 备课定稿' },
  badcase: { seal: '案', label: '课上采纳过 Badcase' },
};
