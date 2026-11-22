import { RUBRIC } from '../../data/rubric';
import { ServiceError, toServiceError } from '../errors';
import { buildRubricMessages, extractJson } from '../prompts';
import type { LLMProvider, RubricEvaluator, RubricScore } from '../types';

const mark = (ok: boolean) => (ok ? '✓' : '✗');

/** 规则启发式预评：完全离线、可解释，作为大模型评分失败时的兜底 */
export function heuristicScore(text: string): RubricScore {
  const t = text.trim();
  if (t.length < 15) {
    return { scores: [1, 1, 1, 1, 1], rationale: RUBRIC.map(() => '✗ 指令过短，无法体现结构'), source: 'heuristic' };
  }
  const role = /(你是|扮演|化身|作为一名|角色)/.test(t);
  const constraint = /(不要|必须|只能|限制|不超过|以内|禁止)/.test(t);
  const A = 1 + (role ? 1 : 0) + (constraint ? 1 : 0);

  const headings = (t.match(/^#{1,3}\s+\S+/gm) ?? []).length;
  const lists = /^\s*([-*]|\d+[.、)])\s+/m.test(t);
  const B = headings >= 3 ? 3 : headings >= 1 || lists ? 2 : 1;

  const sep = /("""|```|<context>|<\/\w+>|^---$)/m.test(t);
  const ctx = /(背景|资料|材料|上下文|参考)/.test(t);
  const C = sep && ctx ? 3 : ctx || sep ? 2 : 1;

  const par = /(Plan|计划|规划)[\s\S]*(Act|执行|写作)[\s\S]*(Reflect|反思|检查)/i.test(t);
  const steps = /(分步骤|一步一步|逐步|step by step|步骤)/i.test(t);
  const D = par ? 3 : steps ? 2 : 1;

  const example = /(示例|例如|比如|例子|正例|Example)/i.test(t);
  const negative = /(反例|错误示例|不要这样)/.test(t);
  const format = /(JSON|表格|格式|字数|Markdown|标题)/i.test(t);
  const E = example && negative && format ? 3 : example || format ? 2 : 1;

  return {
    scores: [A, B, C, D, E],
    rationale: [
      `${mark(role)} 角色设定 · ${mark(constraint)} 边界约束`,
      `检测到 ${headings} 个 Markdown 标题${lists ? '，含列表' : ''}`,
      `${mark(sep)} 分隔符隔离 · ${mark(ctx)} 背景资料`,
      par ? '✓ 含 Plan-Act-Reflect 推理路径' : steps ? '△ 仅笼统提示分步骤' : '✗ 无推理路径引导',
      `${mark(example)} 示例 · ${mark(negative)} 反例 · ${mark(format)} 输出格式`,
    ],
    source: 'heuristic',
  };
}

export class HeuristicEvaluator implements RubricEvaluator {
  async scorePrompt(text: string) {
    return heuristicScore(text);
  }
}

/** 大模型预评：严格校验返回结构，任何异常都回退到规则预评，并说明原因 */
export class LLMRubricEvaluator implements RubricEvaluator {
  constructor(
    private readonly llm: LLMProvider,
    private readonly model?: string,
  ) {}

  async scorePrompt(text: string, signal?: AbortSignal): Promise<RubricScore> {
    try {
      const res = await this.llm.chat({
        messages: buildRubricMessages(text),
        model: this.model || undefined,
        temperature: 0,
        maxTokens: 600,
        scenario: { id: 'rubric.score' },
        signal,
      });
      const parsed = extractJson<{ scores?: unknown; rationale?: unknown }>(res.content);
      const scores = parsed && Array.isArray(parsed.scores) ? parsed.scores.map((v) => Math.round(Number(v))) : [];
      if (scores.length !== RUBRIC.length || scores.some((v) => !(v >= 1 && v <= 3))) {
        throw new ServiceError('invalid_response', '量规评分格式不符合约定');
      }
      const rationale = parsed && Array.isArray(parsed.rationale) ? parsed.rationale.map(String) : [];
      return { scores, rationale: RUBRIC.map((_, i) => rationale[i] ?? ''), source: 'llm' };
    } catch (e) {
      const err = toServiceError(e);
      if (err.code === 'aborted') throw err;
      return { ...heuristicScore(text), note: `大模型评分失败，已回退到规则预评：${err.message}` };
    }
  }
}
