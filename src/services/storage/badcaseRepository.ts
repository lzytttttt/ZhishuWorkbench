import type { Badcase, BadcaseStatus, NewBadcase } from '../../data/types';
import { uid } from '../../utils/plan';
import { ServiceError } from '../errors';
import { requestJson, type HttpConfig } from '../http/client';
import type { BadcaseRepository } from '../types';

const KEY = 'zhishu.v1.badcases';
const LEGACY_KEY = 'zhishu.badcases';

export const SEED_BADCASES: Badcase[] = [
  {
    id: 'seed-1',
    question: '“床前明月光”的作者是谁？他还写过哪些关于咖啡的诗？',
    model: '模型 A',
    excerpt: '李白曾写下《咖啡吟》，描绘长安酒肆的咖啡香气。',
    kind: 'hallucination',
    status: 'attributed',
    createdAt: Date.now() - 86400000 * 2,
  },
  {
    id: 'seed-2',
    question: '用表格列出三种可回收垃圾',
    model: '模型 C',
    excerpt: '可回收垃圾有塑料瓶、旧报纸和易拉罐，它们都很重要……（未按表格输出）',
    kind: 'format',
    status: 'regression',
    createdAt: Date.now() - 86400000,
  },
];

const KINDS = ['hallucination', 'logic', 'bias', 'format'];
const STATUSES = ['found', 'attributed', 'fixed', 'regression'];

export function isBadcase(x: unknown): x is Badcase {
  if (!x || typeof x !== 'object') return false;
  const b = x as Record<string, unknown>;
  return (
    typeof b.id === 'string' &&
    typeof b.excerpt === 'string' &&
    typeof b.question === 'string' &&
    typeof b.model === 'string' &&
    KINDS.includes(String(b.kind)) &&
    STATUSES.includes(String(b.status))
  );
}

function readLocal(): Badcase[] {
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY);
    if (!raw) return SEED_BADCASES;
    const list: unknown = JSON.parse(raw);
    return Array.isArray(list) ? list.filter(isBadcase) : SEED_BADCASES;
  } catch {
    return SEED_BADCASES;
  }
}

/** 浏览器本地持久化（带版本化键名，自动迁移旧版数据） */
export class LocalBadcaseRepository implements BadcaseRepository {
  readonly kind = 'mock' as const;
  private items: Badcase[] = readLocal();

  private persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(this.items));
      localStorage.removeItem(LEGACY_KEY);
    } catch {
      /* ignore */
    }
  }

  async list() {
    return [...this.items];
  }

  async addMany(news: NewBadcase[]) {
    const created: Badcase[] = news.map((n) => ({ ...n, id: uid(), status: 'found' as const, createdAt: Date.now() }));
    this.items = [...created, ...this.items];
    this.persist();
    return created;
  }

  async updateStatus(id: string, status: BadcaseStatus) {
    this.items = this.items.map((b) => (b.id === id ? { ...b, status } : b));
    this.persist();
  }

  async remove(id: string) {
    this.items = this.items.filter((b) => b.id !== id);
    this.persist();
  }
}

/** 远程持久化：班级 / 教研组共享的 Badcase 评估集 */
export class HttpBadcaseRepository implements BadcaseRepository {
  readonly kind = 'remote' as const;
  constructor(private readonly http: HttpConfig) {}

  async list() {
    const r = await requestJson<{ items?: unknown }>(this.http, '/badcases');
    if (!r || !Array.isArray(r.items)) throw new ServiceError('invalid_response');
    return r.items.filter(isBadcase);
  }

  async addMany(items: NewBadcase[]) {
    const r = await requestJson<{ items?: unknown }>(this.http, '/badcases', { body: { items } });
    if (!r || !Array.isArray(r.items)) throw new ServiceError('invalid_response');
    return r.items.filter(isBadcase);
  }

  async updateStatus(id: string, status: BadcaseStatus) {
    await requestJson(this.http, `/badcases/${encodeURIComponent(id)}`, { method: 'PATCH', body: { status } });
  }

  async remove(id: string) {
    await requestJson(this.http, `/badcases/${encodeURIComponent(id)}`, { method: 'DELETE' });
  }
}
