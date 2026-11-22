/* 双量规与教育提示词四大功能 */

export interface RubricDim {
  id: string;
  name: string;
  en: string;
  levels: [string, string, string]; // 1 分 / 2 分 / 3 分
  observe: string;
}

export const RUBRIC: RubricDim[] = [
  {
    id: 'A',
    name: '目标清晰度与特异性',
    en: 'Clarity & Specificity',
    levels: [
      '指令极其宽泛笼统（如“帮我写篇报告”），完全依赖 AI 自行猜测意图。',
      '任务目标基本清楚，但存在局部表述模糊或约束条件遗漏。',
      '核心任务、角色设定与边界约束极其明确，无任何语义歧义。',
    ],
    observe: '学生作为“问题定义者”将模糊直觉转化为精确问题的能力',
  },
  {
    id: 'B',
    name: '结构化组织与格式分层',
    en: 'Structural Organization',
    levels: [
      '所有要求混杂在一段毫无结构的长文本中，模型极易遗漏关键指令。',
      '存在基本的分段或列表，但未形成清晰的模块化结构层次。',
      '规范使用 Markdown 层级标题（# Rules、# Context、# Output Format）构建逻辑分层。',
    ],
    observe: '编写系统级提示词（System Prompt）的工程规范性',
  },
  {
    id: 'C',
    name: '上下文管理与位置编排',
    en: 'Context Management',
    levels: [
      '缺乏必要的背景上下文供给，或直接倾倒无关长文本导致注意力分散。',
      '提供了背景材料，但指令与参考材料混排，存在上下文污染风险。',
      '严格将“执行指令”与“背景数据 / RAG 检索片段”用分隔符清晰隔离。',
    ],
    observe: '“上下文工程（Context Engineering）”素养',
  },
  {
    id: 'D',
    name: '推理路径与工具引导',
    en: 'Reasoning & Tool Guidance',
    levels: [
      '未提供任何推理路径引导，直接索要最终结果。',
      '简单提示模型“分步骤思考”，但未规定推理检查点或工具选择逻辑。',
      '显式嵌入 Plan-Act-Reflect 或思维链步骤，明确何时调用何种工具。',
    ],
    observe: '引导模型跨越逻辑断层及编排 Agent 工作流的能力',
  },
  {
    id: 'E',
    name: '示例供给与输出控制',
    en: 'Examples & Output Control',
    levels: [
      '无任何示例参照，也未指定输出格式与边界兜底规则（Fallback）。',
      '仅提供单一正向示例或笼统描述输出格式，偶发格式漂移。',
      '提供涵盖正反例的少样本示例（Few-shot），并严格限定输出格式。',
    ],
    observe: '通过少样本示范控制生成质量的“标准制定者”能力',
  },
];

export interface TransparencyLevel {
  name: string;
  en: string;
  min: number;
  max: number;
  color: string;
  criteria: string;
  role: string;
}

export const TRANSPARENCY: TransparencyLevel[] = [
  {
    name: '卓越',
    en: 'High Distinction',
    min: 80,
    max: 100,
    color: '#1d7453',
    criteria: '详尽透明地披露所用模型 / 软件、完整的提示词迭代序列，并深刻阐述如何批判性审阅、核查纠错、删改与重构 AI 原始输出。',
    role: 'AI 系统导演：人类完全主导质量标准与架构决策',
  },
  {
    name: '优秀',
    en: 'Distinction',
    min: 70,
    max: 79,
    color: '#1b6b93',
    criteria: '清晰说明所用 AI 工具、关键提示词以及筛选与人工改写的具体过程，事实核查记录完整。',
    role: '深度协同者：有效利用 AI 外骨骼，保留独立判断与整合能力',
  },
  {
    name: '良好',
    en: 'Credit',
    min: 60,
    max: 69,
    color: '#5b4b9a',
    criteria: '基本合理地说明了 AI 使用，但“模型版本”“提示词迭代过程”“如何改编输出”三要素中有一项细节不足。',
    role: '初级使用者：具备合规披露意识，但批判性改造深度不足',
  },
  {
    name: '及格',
    en: 'Pass',
    min: 50,
    max: 59,
    color: '#a67214',
    criteria: '仅笼统提及使用了 AI 辅助，三项核心要素缺失多项细节，人工改写与核查痕迹薄弱。',
    role: '被动依赖边缘：存在轻度认知外包倾向，需教师元认知辅导',
  },
  {
    name: '不及格',
    en: 'Fail',
    min: 0,
    max: 49,
    color: '#c83e2b',
    criteria: '隐瞒或几乎没有说明 AI 使用情况，把 AI 生成的“预制内容”及其中的幻觉当作个人原创提交。',
    role: '认知失守：构成学术不端与完全的思维替代',
  },
];

export interface PromptFunction {
  id: 'scaffolding' | 'socratic' | 'enforcement' | 'metacognitive';
  name: string;
  en: string;
  color: string;
  desc: string;
  rules: string[];
  caution?: string;
}

export const PROMPT_FUNCTIONS: PromptFunction[] = [
  {
    id: 'scaffolding',
    name: '脚手架型',
    en: 'Scaffolding',
    color: '#1b6b93',
    desc: '提供步骤框架、思维模板或渐进式线索，但把核心推理严格留给学生完成。',
    rules: [
      '先给出解决问题的步骤框架或思维模板，不给出最终答案。',
      '每次只提供下一步所需的一条线索。',
      '学生连续求助时可逐步加大提示粒度，但核心推理仍由学生完成。',
    ],
    caution: '若 AI 连续提问只是为了收集完成任务所需的信息，属于脚手架型而非苏格拉底型。',
  },
  {
    id: 'socratic',
    name: '苏格拉底型',
    en: 'Socratic',
    color: '#1d7453',
    desc: '扣留直接答案，以直击本质的反问引出、澄清或挑战学生的推理假设。',
    rules: [
      '明确扣留直接答案（withhold the direct answer）。',
      '每轮只提出 1 个直击本质的问题，引出、澄清或挑战学生的推理假设。',
      '当学生得出结论时，追问“你是怎么知道的？”',
    ],
  },
  {
    id: 'enforcement',
    name: '认知强化型',
    en: 'Cognitive Enforcement',
    color: '#a67214',
    desc: '强制施加需要深度思考的认知操作：理由阐述、认知冲突与结构化核查。',
    rules: [
      '要求学生为每个结论写出理由（Prompted-justification）。',
      '适时故意提供一个似是而非的反方观点，供学生驳斥（Cognitive-conflict）。',
      '引导学生执行“来源—证据—结论”的结构化核查程序。',
    ],
  },
  {
    id: 'metacognitive',
    name: '元认知型',
    en: 'Metacognitive',
    color: '#9a386c',
    desc: 'AI 作为一面“思维镜子”，引导学生观察、解释并评估自己的解题思路与提示词修改轨迹。',
    rules: [
      '不评价答案对错，而是请学生复述自己的思考路径。',
      '对比学生前后两版提示词，提问“你改了什么？为什么？”',
      '每轮结束请学生用一句话评估：哪一步最不确定？',
    ],
  },
];
