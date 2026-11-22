import { ServiceError, toServiceError } from '../errors';
import { httpRequest, readSSE, requestJson, type HttpConfig } from '../http/client';
import { isEnvelope, normalizeCode } from './reducer';
import type { ClassEvent, ClassHandlers, ClassroomService, Envelope } from './types';

const path = (code: string, tail = '') => `/classroom/sessions/${encodeURIComponent(normalizeCode(code))}${tail}`;

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve) => {
    const t = window.setTimeout(resolve, ms);
    signal.addEventListener(
      'abort',
      () => {
        window.clearTimeout(t);
        resolve();
      },
      { once: true },
    );
  });
}

/**
 * 远程课堂：REST 追加事件 + SSE 推送。
 * 断线后以指数退避自动重连，并通过 since 参数补齐断线期间的事件。
 */
export class HttpClassroom implements ClassroomService {
  readonly kind = 'remote' as const;
  private local = new Map<string, Set<ClassHandlers>>();

  constructor(private readonly http: HttpConfig) {}

  async create(lessonId: string): Promise<string> {
    const r = await requestJson<{ code?: string }>(this.http, '/classroom/sessions', { body: { lessonId } });
    if (!r?.code) throw new ServiceError('invalid_response');
    return normalizeCode(r.code);
  }

  async load(code: string, signal?: AbortSignal): Promise<Envelope[] | null> {
    try {
      const r = await requestJson<{ events?: unknown }>(this.http, path(code, '/events'), { signal });
      if (!r || !Array.isArray(r.events)) throw new ServiceError('invalid_response');
      return r.events.filter(isEnvelope);
    } catch (e) {
      const err = toServiceError(e);
      if (err.status === 404) return null;
      throw err;
    }
  }

  async publish(code: string, actor: string, event: ClassEvent): Promise<Envelope> {
    const r = await requestJson<{ event?: unknown }>(this.http, path(code, '/events'), { body: { actor, event } });
    if (!r || !isEnvelope(r.event)) throw new ServiceError('invalid_response');
    const env = r.event;
    this.local.get(normalizeCode(code))?.forEach((h) => h.onEvents([env]));
    return env;
  }

  subscribe(rawCode: string, h: ClassHandlers): () => void {
    const code = normalizeCode(rawCode);
    const set = this.local.get(code) ?? new Set<ClassHandlers>();
    set.add(h);
    this.local.set(code, set);

    const ctrl = new AbortController();
    let since = 0;
    let attempt = 0;

    const loop = async () => {
      while (!ctrl.signal.aborted) {
        try {
          const { res, dispose } = await httpRequest(this.http, path(code, `/stream?since=${since}`), {
            signal: ctrl.signal,
            accept: 'text/event-stream',
          });
          try {
            h.onStatus?.('live');
            attempt = 0;
            for await (const data of readSSE(res)) {
              let msg: { type?: string; event?: unknown; studentId?: unknown; at?: unknown };
              try {
                msg = JSON.parse(data);
              } catch {
                continue;
              }
              if (msg.type === 'event' && isEnvelope(msg.event)) {
                since = Math.max(since, msg.event.ts);
                h.onEvents([msg.event]);
              } else if (msg.type === 'presence' && msg.studentId) {
                h.onPresence?.(String(msg.studentId), Number(msg.at) || Date.now());
              }
            }
          } finally {
            dispose();
          }
        } catch {
          /* 进入重连 */
        }
        if (ctrl.signal.aborted) return;
        h.onStatus?.('reconnecting');
        await sleep(Math.min(15000, 1000 * 2 ** attempt++), ctrl.signal);
      }
    };
    void loop();

    return () => {
      set.delete(h);
      ctrl.abort();
    };
  }

  async ping(code: string, studentId: string): Promise<void> {
    await requestJson(this.http, path(code, '/presence'), { body: { studentId } });
  }
}
