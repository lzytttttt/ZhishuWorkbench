import type { LabId, PartId, PhaseId, TrackId } from './types';

/* ------------------------------------------------------------------
 * 五大核心零件：以 LLM 为“认知心脏”的 AI Native 解剖学架构
 * ------------------------------------------------------------------ */
export interface Part {
  id: PartId;
  name: string;
  alias: string;
  en: string;
  color: string;
  reconstructs: string;
  summary: string;
  points: string[];
  position: [number, number, number];
}

export const PARTS: Part[] = [
  {
    id: 'heart',
    name: '认知心脏',
    alias: '认知心脏',
    en: 'LLM Cognitive Heart',
    color: '#be3448',
    reconstructs: '重构「学习」与「表征」',
    summary:
      '大语言模型通过海量语料预训练，把人类知识压缩为高维词向量与神经网络权重；云端大模型与端侧小模型经蒸馏协同工作。',
    points: [
      '上下文窗口长度：决定能记住多少对话',
      '推理延迟：决定交互反应快慢',
      'Token 算力成本：工程权衡的第三极',
      '大小模型协同：云端理解 + 端侧秒级意图识别',
    ],
    position: [0, 0, 0],
  },
  {
    id: 'senses',
    name: '全感官',
    alias: '全感官',
    en: 'Multimodal Senses',
    color: '#1b6b93',
    reconstructs: '重构「感知」',
    summary:
      '不再把 CV 与 ASR 当作孤立学科，而是揭示多模态大模型如何把像素块、声波频谱与文本统一编码为 Token 序列，放进同一个理解池。',
    points: ['像素 → 数字编码', '声波 → 文字卡片', '跨模态对齐与联合推理', '像人一样边看路标边听导航'],
    position: [0, 2.35, 0],
  },
  {
    id: 'fuel',
    name: '加油站',
    alias: '加油站',
    en: 'Data Flywheel & RAG',
    color: '#a67214',
    reconstructs: '重构「推理」与「系统进化」',
    summary:
      '显式反馈（保存、点赞、修改指令）与隐式反馈（停留、划走、反复修改）驱动闭环进化；RAG 2.0 与长期记忆弥补知识截止与事实幻觉。',
    points: ['显式 / 隐式反馈的 24 小时闭环', 'RAG 2.0：开卷考试', '长期记忆：智能体的“海马体”', 'Badcase → 评估集 → 持续生长'],
    position: [0, -2.35, 0],
  },
  {
    id: 'limbs',
    name: '手脚',
    alias: '手脚',
    en: 'Agent & MCP Tools',
    color: '#5b4b9a',
    reconstructs: '重构「自然交互」',
    summary:
      '人机交互从“点按钮调接口”升级为“事件驱动的任务派发”：LLM 负责意图识别与子任务拆解，通过 MCP 协议自主调用外部工具。',
    points: ['目标委托 Goal Delegation', '意图编程 Intent Programming', 'MCP：AI 的 USB-C 接口', '感知 → 规划 → 工具选择 → 汇总'],
    position: [2.55, 1.2, 0.6],
  },
  {
    id: 'brake',
    name: '刹车',
    alias: '刹车',
    en: 'Safety Guardrails',
    color: '#b85319',
    reconstructs: '重构「社会影响」',
    summary:
      '把伦理规范转化为系统架构中的硬性约束：防范歧视、禁止越界医疗与违法建议、注入独立 Verifier LLM，并建立回滚与灰度机制。',
    points: ['防范年龄 / 性别 / 地域歧视', '独立验证模型 Verifier LLM', '30 分钟错误回滚窗口', '5% → 30% → 100% 灰度发布'],
    position: [2.55, -1.2, 0.6],
  },
];

export const PART_MAP = Object.fromEntries(PARTS.map((p) => [p.id, p])) as Record<PartId, Part>;

/* ------------------------------------------------------------------
 * 四阶段上升螺旋认知引擎
 * ------------------------------------------------------------------ */
export interface Phase {
  id: PhaseId;
  name: string;
  en: string;
  verb: string;
  role: string;
  roleEn: string;
  color: string;
  desc: string;
}

export const PHASES: Phase[] = [
  {
    id: 'question',
    name: '提问',
    en: 'Questioning',
    verb: '表达意图',
    role: '问题定义者',
    roleEn: 'Problem Definer',
    color: '#1b6b93',
    desc: '把模糊直觉转化为精确问题：声明目标、上下文与约束条件，而不是背诵提示词咒语。',
  },
  {
    id: 'inquiry',
    name: '探究',
    en: 'Inquiry',
    verb: '构建上下文',
    role: 'AI 系统导演',
    roleEn: 'AI Director',
    color: '#1d7453',
    desc: '先借助 LLM “跑起来”，在真实实践中遭遇幻觉与瓶颈、暴露知识缺口，再带着问题意识回头“学走路”。',
  },
  {
    id: 'judgment',
    name: '判断',
    en: 'Judgment',
    verb: '质量仲裁',
    role: '质量仲裁者',
    roleEn: 'Quality Arbiter',
    color: '#a67214',
    desc: '就同一问题交叉比对多个模型的输出，识别逻辑谬误、幻觉与偏见，确立质量标杆——鉴赏力优先于生产力。',
  },
  {
    id: 'creation',
    name: '创造',
    en: 'Creation',
    verb: '系统编排',
    role: '标准制定者',
    roleEn: 'Standard Setter',
    color: '#9a386c',
    desc: '通过编排多模态上下文与工作流实现原创性系统合成，并把每一次 Badcase 转化为系统进化的燃料。',
  },
];

export const PHASE_MAP = Object.fromEntries(PHASES.map((p) => [p.id, p])) as Record<PhaseId, Phase>;

/* ------------------------------------------------------------------
 * 工程范式深度轨道（不按年级划分，按认知深度组织）
 * ------------------------------------------------------------------ */
export interface Track {
  id: TrackId;
  name: string;
  en: string;
  desc: string;
}

export const TRACKS: Track[] = [
  { id: 'perceive', name: '感知体验', en: 'Perception', desc: '多模态感知与自然交互启蒙' },
  { id: 'prompt', name: '提示词工程', en: 'Prompt Eng.', desc: '分词、概率生成与结构化指令' },
  { id: 'context', name: '上下文工程', en: 'Context Eng.', desc: '向量、注意力、扩散与 RAG' },
  { id: 'flow', name: '工作流工程', en: 'Flow Eng.', desc: 'Agent 编排、数据飞轮与治理' },
];

/* ------------------------------------------------------------------
 * 课程单元
 * ------------------------------------------------------------------ */
export interface Lesson {
  id: string;
  title: string;
  hook: string;
  part: PartId;
  phase: PhaseId;
  track: TrackId;
  hours: number;
  unplugged: string;
  metaphor: string;
  concepts: string[];
  aiFreeHint: string;
  lab?: LabId;
}

export const LESSONS: Lesson[] = [
  {
    id: 'spirit',
    title: '寻宝身边的 AI 精灵',
    hook: '上发条的玩具 vs 听懂话的伙伴',
    part: 'senses',
    phase: 'question',
    track: 'perceive',
    hours: 2,
    unplugged: '“我画你猜”多模态互动游戏',
    metaphor: '计算机从凌乱的视觉线条中提取特征，再猜出动物名称',
    concepts: ['传感器', '特征提取', '预测与回应'],
    aiFreeHint: '先凭自己观察，列出机械玩具与智能伙伴的三点不同',
  },
  {
    id: 'eyes',
    title: 'AI 的眼睛与耳朵是怎么工作的',
    hook: '图片其实是一格格数字',
    part: 'senses',
    phase: 'inquiry',
    track: 'perceive',
    hours: 2,
    unplugged: '蒙眼摸象与像素拼图：用方格涂色纸还原笑脸',
    metaphor: 'AI 看到的图片是一格格数字编码，声音会被转化为文字卡片',
    concepts: ['像素编码', '语音转文字', '多模态理解池'],
    aiFreeHint: '用方格纸独立还原一张笑脸，并给每一格写上数字',
    lab: 'diffusion',
  },
  {
    id: 'story',
    title: '跟绘本故事大王聊聊天',
    hook: '交代得越清楚，故事越精彩',
    part: 'senses',
    phase: 'creation',
    track: 'perceive',
    hours: 2,
    unplugged: '全班共编《森林运动会》角色卡',
    metaphor: '主角 + 地点 + 心情：意图表达的三块拼图',
    concepts: ['自然语言意图表达', '语音交互', '人机共创'],
    aiFreeHint: '先独立画出故事主角，并写下它此刻的心情',
  },
  {
    id: 'secret',
    title: 'AI 不是真人：守护我的小秘密',
    hook: '吉娃娃还是松饼？',
    part: 'brake',
    phase: 'judgment',
    track: 'perceive',
    hours: 2,
    unplugged: '红绿灯隐私卡片分类游戏',
    metaphor: '真实姓名、家庭住址、父母手机密码属于“红灯隐私”',
    concepts: ['AI 认知局限', '拟人化误区', '隐私红线'],
    aiFreeHint: '独立判断每张卡片是红灯还是绿灯，再与同桌比对理由',
  },
  {
    id: 'lego',
    title: '文字乐高：AI 是怎么读书的',
    hook: 'Strawberry 里有几个 r？',
    part: 'heart',
    phase: 'inquiry',
    track: 'prompt',
    hours: 2,
    unplugged: '剪刀切句子：把古诗与现代文剪成 Token 卡片并编号',
    metaphor: '计算机不认识汉字或单词，只认识被切碎的文字乐高积木',
    concepts: ['分词 Tokenization', 'Token ID', '字母计数偏差'],
    aiFreeHint: '先用剪刀亲手切分一句古诗，预测 AI 会怎么切',
    lab: 'tokenizer',
  },
  {
    id: 'relay',
    title: '超级词语接龙王',
    hook: '“春天来了，____”',
    part: 'heart',
    phase: 'inquiry',
    track: 'prompt',
    hours: 2,
    unplugged: '全班造句高频词统计表',
    metaphor: '大模型靠统计海量书籍里的词语共现规律，学会续写句子',
    concepts: ['词语共现', '统计规律', '续写'],
    aiFreeHint: '每人独立写下“春天来了，”后面的词，再全班计数',
    lab: 'dice',
  },
  {
    id: 'wand',
    title: '提示词魔法杖：把想法变成画与文',
    hook: '“画一只猫” vs “穿宇航服在月球看书的橘猫”',
    part: 'limbs',
    phase: 'question',
    track: 'prompt',
    hours: 2,
    unplugged: '角色 / 任务 / 约束 三色卡拼装指令',
    metaphor: '提示词黄金三要素：角色 Role + 任务 Task + 细节约束 Constraint',
    concepts: ['模糊指令 vs 结构化指令', 'Role-Task-Constraint'],
    aiFreeHint: '先在纸上写出你脑海中画面的 5 个细节',
  },
  {
    id: 'detective',
    title: '捉拿胡说八道先生：AI 幻觉大侦探',
    hook: '鲁迅和周树人一起喝咖啡？',
    part: 'fuel',
    phase: 'judgment',
    track: 'prompt',
    hours: 2,
    unplugged: '事实核查三步法：字典 + 教材 + 交叉询问',
    metaphor: '好学生遇到盲区会诚实地说“我不知道”（R-tuning）',
    concepts: ['幻觉', '拒答微调 R-tuning', '事实核查 Fact-Checking'],
    aiFreeHint: '不借助 AI，先用字典与教材核实三条“AI 说法”',
    lab: 'rag',
  },
  {
    id: 'markov',
    title: '掷骰子写小说：从马尔可夫链到大模型',
    hook: '科普文 × 武侠故事 混搭生成器',
    part: 'heart',
    phase: 'inquiry',
    track: 'prompt',
    hours: 2,
    unplugged: '人肉马尔可夫链：统计词频，制作配重骰子与概率转盘',
    metaphor: '大模型不是在思考客观事实，而是在玩一场超大规模的“猜下一个词”掷骰子游戏',
    concepts: ['马尔可夫链', 'Next-Token Prediction', '自回归采样'],
    aiFreeHint: '分组手工统计短文中每个词后面跟随的词',
    lab: 'dice',
  },
  {
    id: 'temperature',
    title: '调温实验室：控制 AI 的严谨与脑洞',
    hook: '同一道题，不同温度',
    part: 'heart',
    phase: 'judgment',
    track: 'prompt',
    hours: 2,
    unplugged: '低温只选最高频词 / 高温掷骰子选低频词',
    metaphor: '严谨求真任务用低温，创意头脑风暴用高温',
    concepts: ['Temperature', '采样随机性', '确定性 vs 多样性'],
    aiFreeHint: '先预测：温度调高后故事会怎样变化？写下理由',
    lab: 'dice',
  },
  {
    id: 'fewshot',
    title: '结构化提示工程：给 AI 立规矩、举例子',
    hook: '调教一位苏格拉底式数学陪练',
    part: 'limbs',
    phase: 'creation',
    track: 'prompt',
    hours: 2,
    unplugged: 'Markdown 标题卡片拼装：# 任务规则 / # 参考示例 / # 输出格式',
    metaphor: '零样本是口头吩咐，少样本是先做个示范',
    concepts: ['Zero-shot', 'Few-shot', '输出格式控制'],
    aiFreeHint: '先独立写出一个正例与一个反例',
  },
  {
    id: 'tribunal',
    title: '三堂会审：多模型交叉评估与数据偏见',
    hook: '让 AI 画一名护士和一名工程师',
    part: 'brake',
    phase: 'judgment',
    track: 'prompt',
    hours: 2,
    unplugged: '多模型对比审计表',
    metaphor: '在内容廉价的时代，区分好坏的能力比生产内容更有价值',
    concepts: ['多模型交叉验证', '训练数据偏差', '刻板印象'],
    aiFreeHint: '先独立写下你心目中“好答案”的三条标准',
  },
  {
    id: 'vector',
    title: '万物皆向量：语义空间与注意力连线',
    hook: '句子里的“它”指的是谁？',
    part: 'heart',
    phase: 'inquiry',
    track: 'context',
    hours: 2,
    unplugged: '词语坐标寻宝 + 用粗细不同的毛线连接句子卡片',
    metaphor: '多维语义空间中的座位坐标 & 阅读理解时的荧光笔重点连线',
    concepts: ['词向量 Embeddings', '余弦相似度', '自注意力 Self-Attention'],
    aiFreeHint: '用坐标纸标注动物的“体型 / 温顺”坐标并计算距离',
    lab: 'embedding',
  },
  {
    id: 'diffusion',
    title: '从噪声中雕刻画面：文生图扩散模型原理',
    hook: 'AI 画画不是在网上剪贴拼图',
    part: 'senses',
    phase: 'inquiry',
    track: 'context',
    hours: 2,
    unplugged: '雪花噪点逐步擦除游戏',
    metaphor: '前向加噪把画变成雪花，逆向去噪在文字引导下从噪声中雕刻画面',
    concepts: ['前向加噪', '逆向去噪', '文本语义引导'],
    aiFreeHint: '先猜测：AI 画画是“拼贴”还是“雕刻”？写下你的证据',
    lab: 'diffusion',
  },
  {
    id: 'rag',
    title: '告别闭卷幻觉：RAG 2.0 与上下文工程实战',
    hook: '闭卷裸考 vs 开卷翻书',
    part: 'fuel',
    phase: 'creation',
    track: 'context',
    hours: 2,
    unplugged: '校史馆档案切块与索引卡',
    metaphor: '挂载校史馆真实文档后再提问，回答带上引用标注',
    concepts: ['知识截止 Knowledge Cutoff', '文档切块 Chunking', '语义检索', '带引用回答'],
    aiFreeHint: '先用纸质档案独立考证一条校史事实',
    lab: 'rag',
  },
  {
    id: 'deepfake',
    title: '算法偏见审计、Deepfake 鉴别与反认知外包',
    hook: '一场模拟听证会',
    part: 'brake',
    phase: 'judgment',
    track: 'context',
    hours: 2,
    unplugged: 'UNESCO 四级风险框架模拟听证会辩论',
    metaphor: '作业必须附带 AI 使用透明度声明（披露提示词与修改比）',
    concepts: ['招聘算法歧视', '深度伪造', '信息茧房', '透明度声明'],
    aiFreeHint: '独立撰写一份 AI 使用透明度声明草稿',
  },
  {
    id: 'architecture',
    title: '生产级架构：微调、RAG 与长上下文的黄金组合',
    hook: '超长上下文能取代一切吗？',
    part: 'fuel',
    phase: 'inquiry',
    track: 'flow',
    hours: 2,
    unplugged: '架构积木选型卡：微调 / RAG / 长上下文 / 记忆',
    metaphor: '微调固化行为，RAG 供给事实，长上下文深读材料，记忆是智能体的“海马体”',
    concepts: ['Fine-tuning', 'RAG 2.0', 'Long Context', 'Memory', 'Token 成本'],
    aiFreeHint: '先独立画出你的系统架构草图，并标注成本与延迟',
  },
  {
    id: 'agent',
    title: '给大脑装上手脚：Agent 智能体与 MCP 协议编排',
    hook: 'MCP = AI 的 USB-C 接口',
    part: 'limbs',
    phase: 'creation',
    track: 'flow',
    hours: 2,
    unplugged: '人肉智能体角色扮演：规划者 / 工具人 / 验证者',
    metaphor: '意图识别 → 拆解子任务 → 调用工具 → Verifier 审查 → 汇总输出',
    concepts: ['Agentic Workflow', 'MCP', '规划与记忆', '多 Agent 状态机'],
    aiFreeHint: '先用纸笔画出智能体的状态图',
  },
  {
    id: 'flywheel',
    title: '意图编程与数据飞轮：让系统在 Badcase 中进化',
    hook: '每一个错误都是新的测试用例',
    part: 'fuel',
    phase: 'creation',
    track: 'flow',
    hours: 2,
    unplugged: 'Badcase 卡片墙与回归评估集',
    metaphor: '把“线上生产事故”转化为系统进化的燃料',
    concepts: ['意图编程', '评估集持续生长', '灰度发布', '30 分钟回滚'],
    aiFreeHint: '独立归因一个 Badcase：问题出在提示词、知识库还是评估集？',
  },
  {
    id: 'sovereign',
    title: '主权 AI、绿色算力与复杂伦理治理',
    hook: '一次提问的隐性环境成本',
    part: 'brake',
    phase: 'judgment',
    track: 'flow',
    hours: 2,
    unplugged: '算力碳足迹核算桌游',
    metaphor: '推理链可追溯、决策可解释；用深思熟虑的结构化提问替代试错式提问',
    concepts: ['算力能耗', '合规审计', '自主可控', '数字极简主义'],
    aiFreeHint: '先独立估算一节课全班提问的能耗规模',
  },
];

/* ------------------------------------------------------------------
 * 跨学科 PBL 项目（8 课时拓展深化）
 * ------------------------------------------------------------------ */
export interface ProjectStep {
  phase: PhaseId;
  label: string;
  aiFree?: boolean;
}
export interface Project {
  id: string;
  title: string;
  disciplines: string[];
  part: PartId;
  steps: ProjectStep[];
  deliverable: string;
  guard: string;
}

export const PROJECTS: Project[] = [
  {
    id: 'weather',
    title: '我和 AI 共绘班级情绪气象站',
    disciplines: ['美术', '语文', '心理健康'],
    part: 'senses',
    steps: [
      { phase: 'question', label: '用画笔画出今天的心情怪兽', aiFree: true },
      { phase: 'inquiry', label: '语音描述怪兽特征，生成安慰儿歌或故事' },
      { phase: 'judgment', label: '全班投票选出最贴切的作品' },
      { phase: 'creation', label: '讨论：AI 没有情感，为何能说出温暖的话' },
    ],
    deliverable: '班级情绪气象墙',
    guard: '区分真人与虚拟算法，守住红灯隐私',
  },
  {
    id: 'plant',
    title: '校园植物智能语音解说牌',
    disciplines: ['科学', '劳动', '信息科技'],
    part: 'fuel',
    steps: [
      { phase: 'question', label: '实地观察植物，手写观察笔记', aiFree: true },
      { phase: 'inquiry', label: '图像识别 + 大模型编写拟人化自述' },
      { phase: 'judgment', label: '逐句核查并纠正植物学常识错误' },
      { phase: 'creation', label: '配合声控模块制作互动科普展牌' },
    ],
    deliverable: '可互动的实体科普展牌',
    guard: '强制使用纸质工具书与教材核实 AI 输出',
  },
  {
    id: 'recycle',
    title: '校园垃圾分类与节能 AI 督导员',
    disciplines: ['综合实践', '科学', '数学'],
    part: 'limbs',
    steps: [
      { phase: 'question', label: '定义校园垃圾分类的真实痛点', aiFree: true },
      { phase: 'inquiry', label: '先跑：快速搭建识别 + 语音提醒原型' },
      { phase: 'judgment', label: '发现捏扁塑料瓶、逆光环境识别率骤降' },
      { phase: 'creation', label: '补走：扩充样本多样性与容错规则后迭代' },
    ],
    deliverable: '稳定可靠的校园环保小助手',
    guard: '强制对比 3 个不同模型的回答差异',
  },
  {
    id: 'curator',
    title: '本地历史文化 RAG 数字策展人',
    disciplines: ['历史', '语文', '地理'],
    part: 'fuel',
    steps: [
      { phase: 'question', label: '无 AI 独立史料考证', aiFree: true },
      { phase: 'inquiry', label: '清洗一手档案，构建结构化 RAG 知识库' },
      { phase: 'judgment', label: '多源交叉验证，撰写事实核查审计报告' },
      { phase: 'creation', label: 'LLM 辅助策展文稿，输出数字导览系统' },
    ],
    deliverable: '博物馆数字导览系统 +《AI 协作与事实核查审计报告》',
    guard: '作业附带 AI 使用透明度声明',
  },
  {
    id: 'agents',
    title: '面向社区真实痛点的多 Agent 协同系统',
    disciplines: ['通用技术', '社会学', '编程'],
    part: 'limbs',
    steps: [
      { phase: 'question', label: '调研社区痛点，独立定义问题', aiFree: true },
      { phase: 'inquiry', label: '设计数据流与 Agent 协作图' },
      { phase: 'judgment', label: 'Badcase 飞轮：错误转化为回归用例' },
      { phase: 'creation', label: '交付可运行系统与伦理安全白皮书' },
    ],
    deliverable: '可运行智能体系统 + Badcase 迭代日志 + 伦理安全白皮书',
    guard: '部署独立 Verifier LLM，落实每周无 AI 独立推演',
  },
];

/* ------------------------------------------------------------------
 * 降维实验室
 * ------------------------------------------------------------------ */
export interface LabMeta {
  id: LabId;
  name: string;
  metaphor: string;
  concept: string;
  part: PartId;
  desc: string;
}

export const LABS: LabMeta[] = [
  {
    id: 'tokenizer',
    name: '分词剪刀',
    metaphor: '文字乐高积木',
    concept: 'Tokenization',
    part: 'heart',
    desc: '计算机不认识汉字或单词，只认识被切碎并编号的 Token 积木。切一切，就知道它为什么数不清 strawberry 里的 r。',
  },
  {
    id: 'dice',
    name: '概率骰子',
    metaphor: '猜下一个词的掷骰子游戏',
    concept: 'Next-Token · Temperature',
    part: 'heart',
    desc: '统计“每个词后面跟着什么词”，制作配重骰子。调低温度，句子平稳但枯燥；调高温度，故事有创意但容易胡说八道。',
  },
  {
    id: 'attention',
    name: '注意力毛线',
    metaphor: '阅读理解时的荧光笔连线',
    concept: 'Self-Attention',
    part: 'heart',
    desc: '先用毛线猜一猜代词“它”连向谁，再揭晓模型的关联权重，看上下文如何消除自然语言歧义。',
  },
  {
    id: 'embedding',
    name: '语义星图',
    metaphor: '语义空间中的座位坐标',
    concept: 'Embeddings',
    part: 'heart',
    desc: '每个词都是空间中的一个点。离得越近，意思越像——这就是语义相似度搜索的数学本质。',
  },
  {
    id: 'diffusion',
    name: '噪声雕刻',
    metaphor: '从雪花噪点中雕刻画面',
    concept: 'Pixel · Diffusion',
    part: 'senses',
    desc: '图片是一格格数字；前向加噪把它变成雪花，逆向去噪在文字引导下把同一团噪声雕刻成不同的画面。',
  },
  {
    id: 'rag',
    name: '开卷考场',
    metaphor: '闭卷裸考 vs 开卷翻书',
    concept: 'RAG · R-tuning',
    part: 'fuel',
    desc: '同一个问题，闭卷的模型会一本正经地编造；挂载校史档案后，它会检索、引用，并在资料里没有时诚实地说“我不知道”。',
  },
];
