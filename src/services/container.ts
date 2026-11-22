/* 依赖装配：根据配置选择 Mock / 真实实现，并统一挂上遥测 */
import { HttpClassroom } from './classroom/HttpClassroom';
import { LocalClassroom } from './classroom/LocalClassroom';
import type { ClassroomService } from './classroom/types';
import type { ServiceConfig } from './config';
import { describeError } from './errors';
import { HeuristicEvaluator, LLMRubricEvaluator } from './evaluator/rubricEvaluators';
import type { HttpConfig } from './http/client';
import { MockLLM } from './llm/MockLLM';
import { OpenAICompatibleLLM } from './llm/OpenAICompatibleLLM';
import { HttpRetriever, LocalRetriever } from './retrieval/retrievers';
import { HttpBadcaseRepository, LocalBadcaseRepository } from './storage/badcaseRepository';
import { vitals } from '../fun/vitals';
import { traced, withTelemetry } from './telemetry';
import type {
  BadcaseRepository,
  HealthReport,
  LLMProvider,
  RetrievalProvider,
  RubricEvaluator,
  VerifierProvider,
} from './types';
import { LayeredVerifier } from './verifier/LayeredVerifier';

export interface Services {
  config: ServiceConfig;
  llm: LLMProvider;
  rag: RetrievalProvider;
  verifier: VerifierProvider;
  evaluator: RubricEvaluator;
  badcases: BadcaseRepository;
  classroom: ClassroomService;
  health(signal?: AbortSignal): Promise<HealthReport>;
}

function tracedRetriever(inner: RetrievalProvider): RetrievalProvider {
  return {
    kind: inner.kind,
    index: (collection, chunks, signal) =>
      traced('rag.index', { detail: `${collection} · ${chunks.length} 个片段` }, () => inner.index(collection, chunks, signal)),
    search: (collection, query, k, signal) =>
      traced('rag.search', {}, () => inner.search(collection, query, k, signal), (hits) => `命中 ${hits.length} 个片段`),
  };
}

function tracedVerifier(inner: VerifierProvider): VerifierProvider {
  return {
    check: async (text, signal) => {
      const r = await traced('verify', {}, () => inner.check(text, signal), (v) => (v.passed ? '放行' : `拦截 · ${v.label ?? ''}`));
      // 被拦截：认知心率出现一次不规则心律
      if (!r.passed) vitals.intercept();
      return r;
    },
  };
}

function tracedEvaluator(inner: RubricEvaluator): RubricEvaluator {
  return {
    scorePrompt: (text, signal) =>
      traced('rubric', {}, () => inner.scorePrompt(text, signal), (r) => `${r.source === 'llm' ? '大模型' : '规则'}评分 ${r.scores.reduce((a, b) => a + b, 0)}/15`),
  };
}

export function createServices(config: ServiceConfig): Services {
  const remote = config.mode === 'remote';
  const http: HttpConfig = { baseUrl: config.baseUrl.trim(), apiKey: config.apiKey.trim() || undefined, timeoutMs: config.timeoutMs };

  const baseLLM: LLMProvider = remote ? new OpenAICompatibleLLM(http, config.defaultModel.trim(), config.scenarioHeader) : new MockLLM();
  const llm = withTelemetry(baseLLM);

  const rag = tracedRetriever(remote && config.ragBackend === 'remote' ? new HttpRetriever(http) : new LocalRetriever());
  const verifier = tracedVerifier(remote ? new LayeredVerifier(llm, config.verifierModel.trim() || undefined) : new LayeredVerifier());
  const evaluator = tracedEvaluator(remote ? new LLMRubricEvaluator(llm) : new HeuristicEvaluator());
  const badcases: BadcaseRepository = remote && config.persistence === 'remote' ? new HttpBadcaseRepository(http) : new LocalBadcaseRepository();
  const classroom: ClassroomService = remote && config.classroom === 'remote' ? new HttpClassroom(http) : new LocalClassroom();

  const health = async (signal?: AbortSignal): Promise<HealthReport> => {
    if (!remote) return { ok: true, latencyMs: 0, message: 'Mock 模式：全部能力由浏览器内的模拟服务提供，无需网络。', models: ['mock-llm'] };
    const t0 = performance.now();
    try {
      const models = (await baseLLM.listModels?.(signal)) ?? [];
      return { ok: true, latencyMs: Math.round(performance.now() - t0), models, message: `网关连通，发现 ${models.length} 个可用模型` };
    } catch (e) {
      return { ok: false, latencyMs: Math.round(performance.now() - t0), message: describeError(e) };
    }
  };

  return { config, llm, rag, verifier, evaluator, badcases, classroom, health };
}
