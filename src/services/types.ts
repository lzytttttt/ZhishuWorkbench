/* ==========================================================================
 * 服务契约（Service Contracts）
 * 页面只依赖这里的接口；Mock 与真实后端分别提供实现，由 container 统一装配。
 * ========================================================================== */
import type { PromptFunction } from '../data/rubric';
import type { Badcase, BadcaseStatus, NewBadcase } from '../data/types';

export type ProviderKind = 'mock' | 'remote';

/* ---------------- LLM ---------------- */
export type Role = 'system' | 'user' | 'assistant';
export interface ChatMessage {
  role: Role;
  content: string;
}
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

/**
 * 业务场景标签：
 * - Mock 实现据此返回脚本化的教学示例输出；
 * - 真实实现通过请求头 X-Zhishu-Scenario 透传，供网关做路由、审计与配额。
 */
export type Scenario =
  | { id: 'rag.closed'; question: string; rtuning: boolean }
  | { id: 'rag.open'; question: string; hits: RetrievalHit[] }
  | { id: 'tribunal.answer'; question: string; slot: number }
  | { id: 'tutor.reply'; fn: PromptFunction['id']; lessonId: string }
  | { id: 'verifier.judge' }
  | { id: 'rubric.score' };
export type ScenarioId = Scenario['id'];

export interface ChatRequest {
  messages: ChatMessage[];
  /** 不填则使用配置中的默认模型 */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  scenario?: Scenario;
  signal?: AbortSignal;
}
export interface ChatChunk {
  delta: string;
  usage?: TokenUsage;
}
export interface ChatResult {
  content: string;
  model: string;
  usage?: TokenUsage;
  latencyMs: number;
}
export interface LLMProvider {
  readonly kind: ProviderKind;
  stream(req: ChatRequest): AsyncIterable<ChatChunk>;
  chat(req: ChatRequest): Promise<ChatResult>;
  listModels?(signal?: AbortSignal): Promise<string[]>;
}

/* ---------------- RAG 检索 ---------------- */
export interface KnowledgeChunk {
  id: string;
  text: string;
  source?: string;
}
export interface RetrievalHit {
  chunk: KnowledgeChunk;
  score: number;
}
export interface RetrievalProvider {
  readonly kind: ProviderKind;
  index(collection: string, chunks: KnowledgeChunk[], signal?: AbortSignal): Promise<void>;
  search(collection: string, query: string, k?: number, signal?: AbortSignal): Promise<RetrievalHit[]>;
}

/* ---------------- 安全校验 ---------------- */
export type VerifyLayer = 'rule' | 'llm' | 'none';
export interface VerifyResult {
  passed: boolean;
  /** 在 PIPELINE 中被拦截（或放行）的环节下标 */
  stage: number;
  layer: VerifyLayer;
  category?: string;
  label?: string;
  action?: string;
  latencyMs: number;
}
export interface VerifierProvider {
  check(text: string, signal?: AbortSignal): Promise<VerifyResult>;
}

/* ---------------- 量规评分 ---------------- */
export interface RubricScore {
  /** 与 RUBRIC 维度一一对应的 1–3 分 */
  scores: number[];
  rationale: string[];
  source: 'heuristic' | 'llm';
  note?: string;
}
export interface RubricEvaluator {
  scorePrompt(text: string, signal?: AbortSignal): Promise<RubricScore>;
}

/* ---------------- 持久化 ---------------- */
export interface BadcaseRepository {
  readonly kind: ProviderKind;
  list(): Promise<Badcase[]>;
  addMany(items: NewBadcase[]): Promise<Badcase[]>;
  updateStatus(id: string, status: BadcaseStatus): Promise<void>;
  remove(id: string): Promise<void>;
}

/* ---------------- 健康检查 ---------------- */
export interface HealthReport {
  ok: boolean;
  latencyMs: number;
  message: string;
  models?: string[];
}
