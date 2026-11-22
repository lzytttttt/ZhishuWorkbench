export type ServiceMode = 'mock' | 'remote';
export type Backend = 'local' | 'remote';

export interface ModelSlot {
  /** 模型 ID；留空则使用默认模型 */
  id: string;
  label: string;
  base: string;
}

export interface ServiceConfig {
  mode: ServiceMode;
  /** OpenAI 兼容网关地址。开发期默认 /api，经 Vite 代理转发 */
  baseUrl: string;
  /** 仅用于本地调试；只保存在 sessionStorage，关闭标签页即清除 */
  apiKey: string;
  defaultModel: string;
  verifierModel: string;
  tribunalModels: ModelSlot[];
  ragBackend: Backend;
  persistence: Backend;
  /** 课堂实时同步：本机多标签页 / 远程跨设备 */
  classroom: Backend;
  timeoutMs: number;
  /** 是否通过请求头 X-Zhishu-Scenario 透传业务场景（直连第三方服务时可关闭以避免 CORS 预检失败） */
  scenarioHeader: boolean;
}

const env = import.meta.env;

export const DEFAULT_CONFIG: ServiceConfig = {
  mode: env.VITE_SERVICE_MODE === 'remote' ? 'remote' : 'mock',
  baseUrl: env.VITE_API_BASE || '/api',
  apiKey: '',
  defaultModel: env.VITE_DEFAULT_MODEL || '',
  verifierModel: '',
  tribunalModels: [
    { id: '', label: '模型 A', base: '闭源通用底座' },
    { id: '', label: '模型 B', base: '国产开源底座' },
    { id: '', label: '模型 C', base: '多模态底座' },
  ],
  ragBackend: 'local',
  persistence: 'local',
  classroom: 'local',
  timeoutMs: 30000,
  scenarioHeader: true,
};

const KEY = 'zhishu.v1.serviceConfig';
const SECRET_KEY = 'zhishu.v1.apiKey';

function normalize(c: ServiceConfig): ServiceConfig {
  return {
    ...c,
    mode: c.mode === 'remote' ? 'remote' : 'mock',
    ragBackend: c.ragBackend === 'remote' ? 'remote' : 'local',
    persistence: c.persistence === 'remote' ? 'remote' : 'local',
    classroom: c.classroom === 'remote' ? 'remote' : 'local',
    timeoutMs: Math.min(120000, Math.max(3000, Number(c.timeoutMs) || DEFAULT_CONFIG.timeoutMs)),
    tribunalModels: DEFAULT_CONFIG.tribunalModels.map((d, i) => ({ ...d, ...(c.tribunalModels?.[i] ?? {}) })),
  };
}

export function loadConfig(): ServiceConfig {
  try {
    const raw = localStorage.getItem(KEY);
    const saved = raw ? (JSON.parse(raw) as Partial<ServiceConfig>) : {};
    const apiKey = sessionStorage.getItem(SECRET_KEY) ?? '';
    return normalize({ ...DEFAULT_CONFIG, ...saved, apiKey });
  } catch {
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(cfg: ServiceConfig) {
  try {
    const { apiKey, ...rest } = cfg;
    localStorage.setItem(KEY, JSON.stringify(rest));
    if (apiKey) sessionStorage.setItem(SECRET_KEY, apiKey);
    else sessionStorage.removeItem(SECRET_KEY);
  } catch {
    /* 存储不可用时静默降级 */
  }
}

export { normalize as normalizeConfig };
