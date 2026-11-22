import { uid } from '../../utils/plan';
import { ServiceError } from '../errors';
import { isEnvelope, normalizeCode, TEACHER } from './reducer';
import type { ClassEvent, ClassHandlers, ClassroomService, Envelope } from './types';

/* ---------------------------------------------------------------------------
 * 本机课堂：localStorage 事件日志 + BroadcastChannel 实时广播
 * 适用于“同一浏览器多个标签页”的备课预演与产品演示（一个老师标签页 + 若干学生标签页）。
 * 跨设备的真实课堂请切换到远程后端（HttpClassroom）。
 * ------------------------------------------------------------------------- */

const PREFIX = 'zhishu.v1.class.';
const CAP = 3000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 去掉易混淆的 I / O / 0 / 1

type Wire = { kind: 'event'; env: Envelope } | { kind: 'presence'; studentId: string; at: number };

const keyOf = (code: string) => PREFIX + code;
const hasBC = typeof BroadcastChannel !== 'undefined';

function read(code: string): Envelope[] | null {
  try {
    const raw = localStorage.getItem(keyOf(code));
    if (raw === null) return null;
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(isEnvelope) : [];
  } catch {
    return [];
  }
}

function write(code: string, list: Envelope[]) {
  try {
    localStorage.setItem(keyOf(code), JSON.stringify(list.slice(-CAP)));
  } catch {
    throw new ServiceError('server', '本机存储空间不足，无法记录课堂事件');
  }
}

function genCode() {
  const buf = new Uint32Array(6);
  crypto.getRandomValues(buf);
  return Array.from(buf, (n) => ALPHABET[n % ALPHABET.length]).join('');
}

/** 发送端通道按课堂码复用，避免服务重建时泄漏 */
const senders = new Map<string, BroadcastChannel>();
function sender(code: string): BroadcastChannel | null {
  if (!hasBC) return null;
  let ch = senders.get(code);
  if (!ch) {
    ch = new BroadcastChannel(keyOf(code));
    senders.set(code, ch);
  }
  return ch;
}

export class LocalClassroom implements ClassroomService {
  readonly kind = 'mock' as const;
  private local = new Map<string, Set<ClassHandlers>>();

  private emit(code: string, w: Wire) {
    this.local.get(code)?.forEach((h) => (w.kind === 'event' ? h.onEvents([w.env]) : h.onPresence?.(w.studentId, w.at)));
    sender(code)?.postMessage(w);
  }

  async create(lessonId: string): Promise<string> {
    let code = genCode();
    for (let i = 0; i < 5 && read(code) !== null; i++) code = genCode();
    write(code, []);
    await this.publish(code, TEACHER, { type: 'session.open', lessonId });
    return code;
  }

  async load(code: string): Promise<Envelope[] | null> {
    return read(normalizeCode(code));
  }

  async publish(rawCode: string, actor: string, event: ClassEvent): Promise<Envelope> {
    const code = normalizeCode(rawCode);
    const list = read(code);
    if (list === null) throw new ServiceError('bad_request', '课堂不存在或已被清除');
    const env: Envelope = { id: `${Date.now().toString(36)}-${uid()}`, ts: Date.now(), actor, event };
    list.push(env);
    write(code, list);
    this.emit(code, { kind: 'event', env });
    return env;
  }

  subscribe(rawCode: string, h: ClassHandlers): () => void {
    const code = normalizeCode(rawCode);
    const set = this.local.get(code) ?? new Set<ClassHandlers>();
    set.add(h);
    this.local.set(code, set);

    const bc = hasBC ? new BroadcastChannel(keyOf(code)) : null;
    if (bc) {
      bc.onmessage = (m: MessageEvent<Wire>) => {
        const w = m.data;
        if (w?.kind === 'event' && isEnvelope(w.env)) h.onEvents([w.env]);
        else if (w?.kind === 'presence') h.onPresence?.(String(w.studentId), Number(w.at) || Date.now());
      };
    }
    // 兜底：不支持 BroadcastChannel 的环境依靠 storage 事件同步（仅其他标签页触发）
    const onStorage = (e: StorageEvent) => {
      if (e.key !== keyOf(code) || !e.newValue) return;
      try {
        const list: unknown = JSON.parse(e.newValue);
        if (Array.isArray(list)) h.onEvents(list.filter(isEnvelope));
      } catch {
        /* ignore */
      }
    };
    window.addEventListener('storage', onStorage);
    h.onStatus?.('live');

    return () => {
      set.delete(h);
      bc?.close();
      window.removeEventListener('storage', onStorage);
    };
  }

  async ping(rawCode: string, studentId: string): Promise<void> {
    this.emit(normalizeCode(rawCode), { kind: 'presence', studentId, at: Date.now() });
  }
}
