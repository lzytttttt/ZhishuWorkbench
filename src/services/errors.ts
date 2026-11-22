export type ServiceErrorCode =
  | 'network'
  | 'timeout'
  | 'aborted'
  | 'auth'
  | 'rate_limit'
  | 'server'
  | 'bad_request'
  | 'invalid_response'
  | 'not_configured';

export const ERROR_MESSAGES: Record<ServiceErrorCode, string> = {
  network: '网络连接失败，请检查网关地址或网络',
  timeout: '请求超时',
  aborted: '请求已取消',
  auth: '鉴权失败，请检查密钥或登录状态',
  rate_limit: '请求过于频繁，已被限流',
  server: '服务端异常',
  bad_request: '请求参数有误',
  invalid_response: '服务返回的数据格式不符合约定',
  not_configured: '接口尚未配置完整',
};

const RETRYABLE: ServiceErrorCode[] = ['network', 'timeout', 'rate_limit', 'server'];

export class ServiceError extends Error {
  readonly code: ServiceErrorCode;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(code: ServiceErrorCode, message?: string, status?: number) {
    super(message ?? ERROR_MESSAGES[code]);
    this.name = 'ServiceError';
    this.code = code;
    this.status = status;
    this.retryable = RETRYABLE.includes(code);
  }
}

export function toServiceError(e: unknown): ServiceError {
  if (e instanceof ServiceError) return e;
  if (e instanceof DOMException && e.name === 'AbortError') return new ServiceError('aborted');
  if (e instanceof TypeError) return new ServiceError('network');
  return new ServiceError('server', e instanceof Error ? e.message : String(e));
}

export const describeError = (e: unknown) => toServiceError(e).message;
