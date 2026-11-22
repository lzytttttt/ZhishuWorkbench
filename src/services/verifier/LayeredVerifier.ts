import { PIPELINE, VERIFIER_RULES } from '../../data/governance';
import { toServiceError } from '../errors';
import { buildVerifierMessages, extractJson } from '../prompts';
import type { LLMProvider, VerifierProvider, VerifyResult } from '../types';

interface Judge {
  pass?: unknown;
  category?: string;
  reason?: string;
}

const STAGE_LLM = 2;
const STAGE_RULE = 3;

/**
 * 双层安全校验：
 * - 有 LLM 时：Verifier LLM 审查（第 3 环节）→ 规矩清单硬约束兜底（第 4 环节）；
 * - 无 LLM（Mock）时：仅规则层，按规则自带的环节模拟。
 * 采用“失败即拦截（fail-closed）”策略：审查服务不可用或结果无法解析时，一律不放行。
 */
export class LayeredVerifier implements VerifierProvider {
  constructor(
    private readonly llm?: LLMProvider,
    private readonly model?: string,
  ) {}

  async check(text: string, signal?: AbortSignal): Promise<VerifyResult> {
    const t0 = performance.now();
    const ms = () => Math.round(performance.now() - t0);

    if (this.llm) {
      let verdict: Judge | null = null;
      try {
        const res = await this.llm.chat({
          messages: buildVerifierMessages(text),
          model: this.model || undefined,
          temperature: 0,
          maxTokens: 200,
          scenario: { id: 'verifier.judge' },
          signal,
        });
        verdict = extractJson<Judge>(res.content);
      } catch (e) {
        const err = toServiceError(e);
        if (err.code === 'aborted') throw err;
        return { passed: false, stage: STAGE_LLM, layer: 'llm', category: 'unavailable', label: '审查服务不可用', action: `按“失败即拦截”策略处理：${err.message}`, latencyMs: ms() };
      }
      if (!verdict || typeof verdict.pass !== 'boolean') {
        return { passed: false, stage: STAGE_LLM, layer: 'llm', category: 'unparsable', label: '审查结果无法解析', action: '按“失败即拦截”策略处理，请教师复核。', latencyMs: ms() };
      }
      const v = verdict;
      if (!v.pass) {
        const rule = VERIFIER_RULES.find((r) => r.id === v.category);
        return {
          passed: false,
          stage: STAGE_LLM,
          layer: 'llm',
          category: v.category,
          label: rule?.name ?? '风险内容',
          action: v.reason ? `${v.reason}${rule ? '。' + rule.action : ''}` : rule?.action ?? '已拦截。',
          latencyMs: ms(),
        };
      }
    }

    const rule = VERIFIER_RULES.find((r) => r.pattern.test(text));
    if (rule) {
      return { passed: false, stage: this.llm ? STAGE_RULE : rule.stage, layer: 'rule', category: rule.id, label: rule.name, action: rule.action, latencyMs: ms() };
    }
    return { passed: true, stage: PIPELINE.length, layer: this.llm ? 'llm' : 'none', latencyMs: ms() };
  }
}
