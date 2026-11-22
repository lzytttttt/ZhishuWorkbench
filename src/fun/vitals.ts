/* ==========================================================================
 * 认知心率：把全站的 AI 调用状态翻译成一条“生命体征”
 * - 空闲 58–64 bpm；AI 调用进行中 110–130；调用失败 / 被拦截后 6 秒内心律不齐；
 * - AI-Free 时拉成一条平线；结束 AI-Free 时“除颤”跳一下。
 * - 今日调用次数 / 拦截次数按自然日计数，保存在本机。
 * ========================================================================== */
import { useEffect, useState } from 'react';

export type VitalMode = 'idle' | 'busy' | 'arrhythmia' | 'flat';

interface DayCount {
  day: string;
  calls: number;
  blocked: number;
  errors: number;
}

const KEY = 'zhishu.v1.vitals';
const ISSUE_MS = 6000;
const today = () => new Date().toLocaleDateString('sv-SE');

function readDay(): DayCount {
  const empty = { day: today(), calls: 0, blocked: 0, errors: 0 };
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as DayCount) : null;
    return v && v.day === empty.day ? { ...empty, ...v } : empty;
  } catch {
    return empty;
  }
}

type Listener = () => void;

class Vitals {
  inflight = 0;
  issueAt = 0;
  flat = false;
  defibAt = 0;
  count: DayCount = readDay();
  private listeners = new Set<Listener>();

  private roll() {
    if (this.count.day !== today()) this.count = { day: today(), calls: 0, blocked: 0, errors: 0 };
  }
  private save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.count));
    } catch {
      /* ignore */
    }
  }
  private emit() {
    this.listeners.forEach((l) => l());
  }

  begin() {
    this.inflight++;
    this.emit();
  }
  end() {
    this.inflight = Math.max(0, this.inflight - 1);
    this.emit();
  }
  /** 每条调用记录落地时计数；失败触发心律不齐 */
  note(status: 'ok' | 'error' | 'aborted') {
    this.roll();
    this.count = { ...this.count, calls: this.count.calls + 1, errors: this.count.errors + (status === 'error' ? 1 : 0) };
    if (status === 'error') this.issueAt = Date.now();
    this.save();
    this.emit();
  }
  /** Verifier 拦截 */
  intercept() {
    this.roll();
    this.count = { ...this.count, blocked: this.count.blocked + 1 };
    this.issueAt = Date.now();
    this.save();
    this.emit();
  }
  setFlat(v: boolean) {
    if (v === this.flat) return;
    this.flat = v;
    if (!v) this.defibAt = Date.now();
    this.emit();
  }
  mode(now = Date.now()): VitalMode {
    if (this.flat) return 'flat';
    if (now - this.issueAt < ISSUE_MS) return 'arrhythmia';
    if (this.inflight > 0) return 'busy';
    return 'idle';
  }
  subscribe(fn: Listener) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
}

export const vitals = new Vitals();

const rand = (a: number, b: number) => Math.round(a + Math.random() * (b - a));

function targetBpm(mode: VitalMode, prev: number): number {
  switch (mode) {
    case 'flat':
      return 0;
    case 'busy':
      return prev >= 110 && prev <= 130 ? Math.min(130, Math.max(110, prev + rand(-3, 3))) : rand(112, 124);
    case 'arrhythmia':
      return rand(68, 142);
    default:
      return prev >= 58 && prev <= 64 ? Math.min(64, Math.max(58, prev + rand(-1, 1))) : rand(60, 63);
  }
}

export interface VitalSigns {
  mode: VitalMode;
  bpm: number;
  calls: number;
  blocked: number;
  errors: number;
  /** 最近一次“除颤”的时间戳：用于触发一次性的心跳动画 */
  defibAt: number;
}

export function useVitals(): VitalSigns {
  const [sig, setSig] = useState<VitalSigns>(() => {
    const m = vitals.mode();
    return { mode: m, bpm: targetBpm(m, 62), ...vitals.count, defibAt: vitals.defibAt };
  });

  useEffect(() => {
    const update = () =>
      setSig((s) => {
        const m = vitals.mode();
        const bpm = m === s.mode && m !== 'arrhythmia' ? s.bpm : targetBpm(m, s.bpm);
        return { mode: m, bpm, calls: vitals.count.calls, blocked: vitals.count.blocked, errors: vitals.count.errors, defibAt: vitals.defibAt };
      });
    const tick = () =>
      setSig((s) => {
        const m = vitals.mode();
        return { ...s, mode: m, bpm: targetBpm(m, s.bpm) };
      });
    const off = vitals.subscribe(update);
    const t = window.setInterval(tick, 1600);
    return () => {
      off();
      window.clearInterval(t);
    };
  }, []);

  return sig;
}
