import { useCallback, useEffect, useRef, useState } from 'react';
import { toServiceError } from '../services/errors';
import type { ChatChunk, TokenUsage } from '../services/types';

export type StreamStatus = 'idle' | 'streaming' | 'done' | 'error';

/**
 * 统一管理一次流式生成：逐字累积、可中途停止、新请求自动取消旧请求、组件卸载时自动取消。
 */
export function useStream() {
  const [text, setText] = useState('');
  const [status, setStatus] = useState<StreamStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<TokenUsage | null>(null);
  const ctrl = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      ctrl.current?.abort();
    },
    [],
  );

  const run = useCallback(async (factory: (signal: AbortSignal) => AsyncIterable<ChatChunk>): Promise<string | null> => {
    ctrl.current?.abort();
    const c = new AbortController();
    ctrl.current = c;
    setText('');
    setError(null);
    setUsage(null);
    setStatus('streaming');
    let acc = '';
    try {
      for await (const chunk of factory(c.signal)) {
        if (c.signal.aborted) break;
        if (chunk.delta) {
          acc += chunk.delta;
          setText(acc);
        }
        if (chunk.usage) setUsage(chunk.usage);
      }
      if (ctrl.current !== c) return null;
      setStatus(acc || !c.signal.aborted ? 'done' : 'idle');
      return c.signal.aborted ? null : acc;
    } catch (e) {
      if (ctrl.current !== c) return null;
      const err = toServiceError(e);
      if (err.code === 'aborted') {
        setStatus(acc ? 'done' : 'idle');
        return null;
      }
      setError(err.message);
      setStatus('error');
      return null;
    }
  }, []);

  const stop = useCallback(() => ctrl.current?.abort(), []);

  const reset = useCallback(() => {
    ctrl.current?.abort();
    ctrl.current = null;
    setText('');
    setError(null);
    setUsage(null);
    setStatus('idle');
  }, []);

  return { text, status, error, usage, run, stop, reset };
}
