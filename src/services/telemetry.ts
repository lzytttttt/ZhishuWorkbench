/* 调用遥测：记录每一次 AI 调用的场景、模型、耗时与结果。
 * 既是调试工具，也是“AI 使用透明度”的课堂素材。 */
import { useEffect, useState } from 'react';
import { vitals } from '../fun/vitals';
import { toServiceError } from './errors';
import type { LLMProvider } from './types';

export type CallKind = 'llm.stream' | 'llm.chat' | 'rag.index' | 'rag.search' | 'verify' | 'rubric';
export type CallStatus = 'ok' | 'error' | 'aborted';

export interface CallRecord {
  id: number;
  at: number;
  kind: CallKind;
  scenario?: string;
  model?: string;
  latencyMs: number;
  status: CallStatus;
  tokens?: number;
  detail?: string;
}

type Listener = (records: CallRecord[]) => void;
const CAP = 60;

class Telemetry {
  private records: CallRecord[] = [];
  private listeners = new Set<Listener>();
  private seq = 0;

  record(r: Omit<CallRecord, 'id' | 'at'>) {
    this.records = [{ ...r, id: ++this.seq, at: Date.now() }, ...this.records].slice(0, CAP);
    vitals.note(r.status);
    this.emit();
  }

  clear() {
    this.records = [];
    this.emit();
  }

  subscribe(fn: Listener) {
    this.listeners.add(fn);
    fn(this.records);
    return () => {
      this.listeners.delete(fn);
    };
  }

  private emit() {
    const snapshot = [...this.records];
    this.listeners.forEach((l) => l(snapshot));
  }
}

export const telemetry = new Telemetry();

export function useTelemetry(): CallRecord[] {
  const [list, setList] = useState<CallRecord[]>([]);
  useEffect(() => telemetry.subscribe(setList), []);
  return list;
}

const since = (t0: number) => Math.round(performance.now() - t0);
const statusOf = (e: unknown): CallStatus => (toServiceError(e).code === 'aborted' ? 'aborted' : 'error');

export async function traced<T>(
  kind: CallKind,
  meta: { scenario?: string; model?: string; detail?: string },
  fn: () => Promise<T>,
  describe?: (r: T) => string,
): Promise<T> {
  const t0 = performance.now();
  vitals.begin();
  try {
    const r = await fn();
    telemetry.record({ kind, ...meta, latencyMs: since(t0), status: 'ok', detail: describe ? describe(r) : meta.detail });
    return r;
  } catch (e) {
    telemetry.record({ kind, ...meta, latencyMs: since(t0), status: statusOf(e), detail: toServiceError(e).message });
    throw e;
  } finally {
    vitals.end();
  }
}

export function withTelemetry(inner: LLMProvider): LLMProvider {
  return {
    kind: inner.kind,
    listModels: inner.listModels ? (signal) => inner.listModels!(signal) : undefined,
    async *stream(req) {
      const t0 = performance.now();
      let chars = 0;
      let tokens: number | undefined;
      vitals.begin();
      try {
        for await (const c of inner.stream(req)) {
          chars += c.delta.length;
          if (c.usage) tokens = c.usage.promptTokens + c.usage.completionTokens;
          yield c;
        }
        telemetry.record({ kind: 'llm.stream', scenario: req.scenario?.id, model: req.model, latencyMs: since(t0), status: 'ok', tokens, detail: `输出 ${chars} 字` });
      } catch (e) {
        telemetry.record({ kind: 'llm.stream', scenario: req.scenario?.id, model: req.model, latencyMs: since(t0), status: statusOf(e), detail: toServiceError(e).message });
        throw toServiceError(e);
      } finally {
        vitals.end();
      }
    },
    async chat(req) {
      const t0 = performance.now();
      vitals.begin();
      try {
        const r = await inner.chat(req);
        telemetry.record({
          kind: 'llm.chat',
          scenario: req.scenario?.id,
          model: r.model,
          latencyMs: since(t0),
          status: 'ok',
          tokens: r.usage ? r.usage.promptTokens + r.usage.completionTokens : undefined,
          detail: `输出 ${r.content.length} 字`,
        });
        return r;
      } catch (e) {
        telemetry.record({ kind: 'llm.chat', scenario: req.scenario?.id, model: req.model, latencyMs: since(t0), status: statusOf(e), detail: toServiceError(e).message });
        throw toServiceError(e);
      } finally {
        vitals.end();
      }
    },
  };
}
