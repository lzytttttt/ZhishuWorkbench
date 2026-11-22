import { ServiceError } from '../errors';
import { requestJson, type HttpConfig } from '../http/client';
import type { KnowledgeChunk, RetrievalHit, RetrievalProvider } from '../types';

/* ---------------- 本地检索：中文二元组（bigram）重叠度 ----------------
 * 无需向量模型即可在浏览器中运行，用于教学演示“切块 → 入库 → 检索”的流程。 */
const STOP = new Set(['学校', '我们', '们的', '什么', '是什', '哪一', '一年', '有没', '没有', '是哪', '叫什', '的吉', '么？', '的？']);

function bigrams(s: string): string[] {
  const c = Array.from(s.replace(/[\s，。、“”？！?,.；：:]/g, ''));
  const out: string[] = [];
  for (let i = 0; i < c.length - 1; i++) {
    const b = c[i] + c[i + 1];
    if (!STOP.has(b)) out.push(b);
  }
  return out;
}

interface Indexed {
  chunk: KnowledgeChunk;
  grams: Set<string>;
}

export class LocalRetriever implements RetrievalProvider {
  readonly kind = 'mock' as const;
  private store = new Map<string, Indexed[]>();

  async index(collection: string, chunks: KnowledgeChunk[]) {
    this.store.set(
      collection,
      chunks.map((chunk) => ({ chunk, grams: new Set(bigrams(chunk.text)) })),
    );
  }

  async search(collection: string, query: string, k = 3): Promise<RetrievalHit[]> {
    const docs = this.store.get(collection) ?? [];
    const q = new Set(bigrams(query));
    return docs
      .map(({ chunk, grams }) => {
        let hit = 0;
        q.forEach((b) => {
          if (grams.has(b)) hit++;
        });
        return { chunk, hit, score: hit / Math.sqrt(Math.max(1, grams.size)) };
      })
      .filter((r) => r.hit > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k)
      .map(({ chunk, score }) => ({ chunk, score: Number(score.toFixed(3)) }));
  }
}

/* ---------------- 远程检索：校园 RAG 服务 ---------------- */
interface SearchResponse {
  hits?: { id: string | number; text: string; source?: string; score: number }[];
}

export class HttpRetriever implements RetrievalProvider {
  readonly kind = 'remote' as const;
  constructor(private readonly http: HttpConfig) {}

  async index(collection: string, chunks: KnowledgeChunk[], signal?: AbortSignal) {
    await requestJson(this.http, '/rag/index', { body: { collection, chunks }, signal }, 1);
  }

  async search(collection: string, query: string, k = 3, signal?: AbortSignal): Promise<RetrievalHit[]> {
    const res = await requestJson<SearchResponse>(this.http, '/rag/search', { body: { collection, query, k }, signal }, 1);
    if (!res || !Array.isArray(res.hits)) throw new ServiceError('invalid_response');
    return res.hits.map((h) => ({ chunk: { id: String(h.id), text: h.text, source: h.source }, score: Number(h.score) || 0 }));
  }
}
