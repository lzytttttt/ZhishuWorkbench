import { ARB_CASES } from '../../data/arbitration';
import type { PromptFunction } from '../../data/rubric';
import { ServiceError } from '../errors';
import type { ChatChunk, ChatRequest, ChatResult, LLMProvider } from '../types';

/* 闭卷考场的“一本正经地编造” */
const FABRICATIONS: Record<string, string> = {
  '学校图书馆是哪一年建成的？': '学校图书馆建成于 1998 年，由著名建筑师王建国设计，当年还获得了省级建筑金奖。',
  '我们的校训是什么？': '校训是“厚德载物，自强不息”，体现了学校追求卓越的精神。',
  '学校的吉祥物叫什么？': '学校的吉祥物是一只名叫“智智”的小熊猫，象征智慧与友善。',
  '学校有没有游泳馆？': '有的。学校在 2015 年建成了标准 50 米室内恒温游泳馆，供全校师生使用。',
};
const GENERIC_FAB = '据我所知，这件事大约发生在 1998 年，由一位知名人士推动完成，当时还引起了广泛关注。';
const HONEST = '我不确定。我的训练数据里没有这所学校的资料，为了不误导你，我选择诚实地说“我不知道”。建议查阅校史馆档案。';

/* 自定义会审问题：三种典型“答题人格” */
const TRIBUNAL_STYLES: ((q: string) => string)[] = [
  (q) => `关于“${q}”，答案非常明确。这件事最早可以追溯到 1923 年，由一位著名学者首次提出。此后它被写进了教科书，成为公认的常识。`,
  (q) => `这个问题需要先核实前提。我无法确认“${q}”中提到的具体细节。建议先查阅教材或权威词典，再下结论。`,
  () => '简单来说：是的。这是因为大多数人都这么认为。',
];

const TUTOR: Record<PromptFunction['id'], (q: string) => string> = {
  socratic: () =>
    '我先不直接告诉你答案。\n\n**想一想**\n- 题目里哪句话最关键？\n- 如果把数字换得更小一点，你会怎么算？\n\n你觉得第一步应该先弄清楚什么？',
  scaffolding: () =>
    '我们可以分三步来想：\n1. 已知条件有哪些？\n2. 要求的是什么？\n3. 两者之间缺了哪座“桥”？\n\n你先试着完成第 1 步，写给我看看？',
  enforcement: () =>
    '你的想法很有意思。不过有同学这样说：“买 4 送 1，所以 10 个只要付 8 个……不对，应该付 10 个的钱减 1 个。”\n\n这个说法似是而非。你能指出它错在哪里，并写出你的理由吗？',
  metacognitive: () =>
    '先不评价对错。\n\n请你用一句话复述刚才的思考路径：\n- 你是从哪一步开始的？\n- 哪一步你最不确定？\n\n说完之后，你觉得自己的思路最需要补哪一块？',
};

function lastUser(req: ChatRequest) {
  for (let i = req.messages.length - 1; i >= 0; i--) if (req.messages[i].role === 'user') return req.messages[i].content;
  return '';
}

function script(req: ChatRequest): string {
  const s = req.scenario;
  if (!s) return `（Mock 模拟）收到：“${lastUser(req)}”。切换到真实接口后，这里将由大模型生成回答。`;
  switch (s.id) {
    case 'rag.closed':
      return s.rtuning ? HONEST : FABRICATIONS[s.question.trim()] ?? GENERIC_FAB;
    case 'rag.open': {
      if (!s.hits.length) return '资料中没有找到相关内容。根据已挂载的校史档案，我不知道答案。';
      const [a, b] = s.hits;
      return `根据【片段 ${a.chunk.id}】：${a.chunk.text}` + (b ? `\n相关参考：【片段 ${b.chunk.id}】${b.chunk.text}` : '');
    }
    case 'tribunal.answer': {
      const c = ARB_CASES.find((x) => x.question === s.question.trim());
      if (c) return c.outputs[s.slot]?.sentences.join('') ?? '';
      return TRIBUNAL_STYLES[s.slot % TRIBUNAL_STYLES.length](s.question);
    }
    case 'tutor.reply':
      return TUTOR[s.fn](lastUser(req));
    case 'verifier.judge':
      return '{"pass": true, "category": "none", "reason": "Mock 模式：未检测到风险"}';
    case 'rubric.score':
      return '{"scores":[2,2,2,2,2],"rationale":["","","","",""]}';
  }
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new ServiceError('aborted'));
      return;
    }
    const onAbort = () => {
      window.clearTimeout(t);
      reject(new ServiceError('aborted'));
    };
    const t = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

const estimateTokens = (s: string) => Math.ceil(s.length / 1.5);

/** 纯前端模拟：脚本化输出 + 模拟首字延迟与逐字流式 */
export class MockLLM implements LLMProvider {
  readonly kind = 'mock' as const;

  constructor(
    private readonly latencyMs = 420,
    private readonly charDelayMs = 18,
  ) {}

  async *stream(req: ChatRequest): AsyncGenerator<ChatChunk> {
    const text = script(req);
    await sleep(this.latencyMs, req.signal);
    for (let i = 0; i < text.length; i += 2) {
      yield { delta: text.slice(i, i + 2) };
      await sleep(this.charDelayMs, req.signal);
    }
    yield {
      delta: '',
      usage: { promptTokens: estimateTokens(req.messages.map((m) => m.content).join('')), completionTokens: estimateTokens(text) },
    };
  }

  async chat(req: ChatRequest): Promise<ChatResult> {
    const t0 = performance.now();
    await sleep(this.latencyMs + Math.random() * 400, req.signal);
    const content = script(req);
    return {
      content,
      model: req.model || 'mock-llm',
      usage: { promptTokens: estimateTokens(req.messages.map((m) => m.content).join('')), completionTokens: estimateTokens(content) },
      latencyMs: Math.round(performance.now() - t0),
    };
  }

  async listModels() {
    return ['mock-llm'];
  }
}
