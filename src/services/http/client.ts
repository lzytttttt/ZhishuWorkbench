import { ERROR_MESSAGES, ServiceError, toServiceError, type ServiceErrorCode } from '../errors';

export interface HttpConfig {
  baseUrl: string;
  apiKey?: string;
  timeoutMs: number;
}

export interface HttpInit {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  accept?: string;
}

export function joinUrl(base: string, path: string) {
  return base.replace(/\/+$/, '') + '/' + path.replace(/^\/+/, '');
}

/** 合并外部取消信号与超时；超时只约束“拿到响应头”之前的阶段（流式读取不受影响） */
function linkSignals(outer: AbortSignal | undefined, timeoutMs: number) {
  const ctrl = new AbortController();
  let timedOut = false;
  const timer = window.setTimeout(() => {
    timedOut = true;
    ctrl.abort();
  }, timeoutMs);
  const onAbort = () => ctrl.abort();
  if (outer) {
    if (outer.aborted) ctrl.abort();
    else outer.addEventListener('abort', onAbort, { once: true });
  }
  return {
    signal: ctrl.signal,
    isTimeout: () => timedOut,
    clearTimer: () => window.clearTimeout(timer),
    dispose: () => {
      window.clearTimeout(timer);
      outer?.removeEventListener('abort', onAbort);
    },
  };
}

function statusToCode(status: number): ServiceErrorCode {
  if (status === 401 || status === 403) return 'auth';
  if (status === 429) return 'rate_limit';
  if (status >= 500) return 'server';
  return 'bad_request';
}

export async function httpRequest(cfg: HttpConfig, path: string, init: HttpInit = {}): Promise<{ res: Response; dispose: () => void }> {
  if (!cfg.baseUrl) throw new ServiceError('not_configured', '未配置网关地址');
  const link = linkSignals(init.signal, cfg.timeoutMs);
  const headers: Record<string, string> = { Accept: init.accept ?? 'application/json', ...init.headers };
  if (init.body !== undefined) headers['Content-Type'] = 'application/json';
  if (cfg.apiKey) headers.Authorization = `Bearer ${cfg.apiKey}`;

  try {
    const res = await fetch(joinUrl(cfg.baseUrl, path), {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers,
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      signal: link.signal,
    });
    link.clearTimer();
    if (!res.ok) {
      let detail = '';
      try {
        detail = (await res.text()).slice(0, 240);
      } catch {
        /* ignore */
      }
      const code = statusToCode(res.status);
      throw new ServiceError(code, `${ERROR_MESSAGES[code]}（HTTP ${res.status}）${detail ? '：' + detail : ''}`, res.status);
    }
    return { res, dispose: link.dispose };
  } catch (e) {
    link.dispose();
    if (e instanceof ServiceError) throw e;
    if (link.isTimeout()) throw new ServiceError('timeout', `${ERROR_MESSAGES.timeout}（${Math.round(cfg.timeoutMs / 1000)} 秒）`);
    if (init.signal?.aborted) throw new ServiceError('aborted');
    throw toServiceError(e);
  }
}

/**
 * JSON 请求。默认只对 GET 做 1 次指数退避重试；
 * 非幂等请求（如新增 Badcase）不重试，以免重复写入。
 */
export async function requestJson<T = unknown>(cfg: HttpConfig, path: string, init: HttpInit = {}, retries?: number): Promise<T> {
  const method = init.method ?? (init.body !== undefined ? 'POST' : 'GET');
  const maxRetries = retries ?? (method === 'GET' ? 1 : 0);
  for (let attempt = 0; ; attempt++) {
    try {
      const { res, dispose } = await httpRequest(cfg, path, init);
      try {
        if (res.status === 204) return undefined as T;
        const text = await res.text();
        if (!text) return undefined as T;
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new ServiceError('invalid_response');
        }
      } finally {
        dispose();
      }
    } catch (e) {
      const err = toServiceError(e);
      if (!err.retryable || attempt >= maxRetries || init.signal?.aborted) throw err;
      await new Promise((r) => window.setTimeout(r, 400 * 2 ** attempt));
    }
  }
}

/** 解析 Server-Sent Events，逐条产出 data 字段 */
export async function* readSSE(res: Response): AsyncGenerator<string> {
  if (!res.body) throw new ServiceError('invalid_response', '响应不支持流式读取');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      let idx: number;
      while ((idx = buf.indexOf('\n\n')) >= 0) {
        const event = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        const data = event
          .split('\n')
          .filter((l) => l.startsWith('data:'))
          .map((l) => l.slice(5).trimStart())
          .join('\n');
        if (data) yield data;
      }
    }
  } finally {
    try {
      await reader.cancel();
    } catch {
      /* ignore */
    }
  }
}
