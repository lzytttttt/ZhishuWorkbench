import type { RouteId } from '../hooks/useHashRoute';

export type NavGroupId = 'home' | 'understand' | 'teach' | 'explore' | 'govern' | 'system';

/** 页面内的二级分区（对应 #/route/tab） */
export interface NavTab {
  id: string;
  label: string;
  /** 该分区的一句话说明，显示在页头 */
  desc: string;
}

export interface NavItem {
  id: RouteId;
  label: string;
  short: string;
  en: string;
  desc: string;
  group: NavGroupId;
  tabs?: NavTab[];
}

export interface NavGroup {
  id: NavGroupId;
  label: string;
  en: string;
  desc: string;
}

/** 侧栏与首页的四个功能分组（home 固定在顶部、system 固定在底部，不在此列出） */
export const NAV_GROUPS: NavGroup[] = [
  { id: 'understand', label: '认识', en: 'Understand', desc: '看清 AI Native 课程的骨架' },
  { id: 'teach', label: '教学', en: 'Teach', desc: '从一节课的编排到课堂现场' },
  { id: 'explore', label: '探究', en: 'Explore', desc: '把 LLM 机制变成可触摸的实验' },
  { id: 'govern', label: '治理', en: 'Govern', desc: '评价学习过程，守住安全边界' },
];

export const NAV: NavItem[] = [
  { id: 'home', group: 'home', label: '首页', short: '首页', en: 'Home', desc: '导航与上手引导' },

  {
    id: 'cockpit',
    group: 'understand',
    label: '认知架构',
    short: '架构',
    en: 'Cognitive Anatomy',
    desc: 'AI Native 五件套与螺旋认知环',
    tabs: [
      { id: 'anatomy', label: '五件套架构', desc: '拖动旋转“认知心脏”，点击零件或螺旋阶段，查看关联课程。' },
      { id: 'laws', label: '三大铁律', desc: '捍卫人类认知主权的三条课堂硬约束。' },
      { id: 'judge', label: '30 秒判定', desc: '把 LLM 从课程体系中抽离——它还能照常运转吗？' },
    ],
  },
  {
    id: 'curriculum',
    group: 'understand',
    label: '课程图谱',
    short: '课程',
    en: 'Spiral Curriculum',
    desc: '四条范式轨道 × 四个螺旋阶段',
    tabs: [
      { id: 'matrix', label: '矩阵', desc: '纵轴是范式演进，横轴是“提问 → 探究 → 判断 → 创造”的螺旋认知环。' },
      { id: 'spiral', label: '螺旋', desc: '把四条范式轨道卷成一条认知螺旋：不按年级，按认知深度。' },
      { id: 'list', label: '列表', desc: '按零件筛选、按关键词检索全部课程单元。' },
      { id: 'projects', label: '跨学科项目', desc: '8 课时 PBL 拓展：先跑起来，再回头学走路。' },
    ],
  },

  {
    id: 'composer',
    group: 'teach',
    label: '备课编排',
    short: '备课',
    en: 'Lesson Composer',
    desc: '课时结构、AI-Free 占比与教学提示词',
    tabs: [
      { id: 'timeline', label: '课时编排', desc: '拖动木块右边缘调整时长，实时校验 AI-Free 占比不低于 25%。' },
      { id: 'prompt', label: '提示词生成', desc: '按“教育提示词四大功能”，生成课堂教学智能体的系统提示词。' },
      { id: 'trial', label: '试运行', desc: '以学生身份与刚生成的提示词对话，检验“外骨骼”的实际边界。' },
    ],
  },
  {
    id: 'classroom',
    group: 'teach',
    label: '课堂直播',
    short: '课堂',
    en: 'Classroom Live',
    desc: '开课、投票、共建 Badcase 与全班 AI-Free',
    tabs: [
      { id: 'stage', label: '讲台', desc: '发起活动，实时查看全班的响应。' },
      { id: 'script', label: '剧本', desc: '按今日课堂剧本一幕一幕推进。' },
      { id: 'review', label: '线索审阅', desc: '审阅学生提交的 Badcase 线索，采纳后进入 Badcase 库。' },
      { id: 'seats', label: '座位图', desc: '在线状态、投票与提问情况一览。' },
    ],
  },

  { id: 'labs', group: 'explore', label: '降维实验室', short: '实验室', en: 'Unplugged Labs', desc: '把 LLM 机制变成可触摸的交互沙盒' },
  {
    id: 'arbitration',
    group: 'explore',
    label: '三堂会审',
    short: '会审',
    en: 'Model Tribunal',
    desc: '多模型交叉审计与 Badcase 数据飞轮',
    tabs: [
      { id: 'tribunal', label: '会审庭', desc: '同一问题问三个模型，用审计画笔标出幻觉、逻辑谬误、偏见与格式偏离。' },
      { id: 'flywheel', label: '数据飞轮', desc: '每一个被标出的错误，都会被推进为修正提示词、知识库或回归评估集。' },
    ],
  },

  {
    id: 'assessment',
    group: 'govern',
    label: '双量规评价',
    short: '评价',
    en: 'Dual Rubrics',
    desc: '提示词 15 分量规与 AI 透明度五级量表',
    tabs: [
      { id: 'submit', label: '提交与预评', desc: 'AI 预评仅用于形成性反馈，总结性评分必须由教师终审。' },
      { id: 'rubric', label: '量规终审', desc: '逐项点选评分格完成终审；AI 预评建议以“幽灵章”标示。' },
      { id: 'transparency', label: '透明度量表', desc: '评价《AI 协作日志与人工重构说明》：看披露了什么、核查了什么、重构了什么。' },
    ],
  },
  {
    id: 'guardrails',
    group: 'govern',
    label: '安全护栏',
    short: '护栏',
    en: 'Guardrails',
    desc: '风险准入、隐私启蒙、Verifier 校验与灰度回滚',
    tabs: [
      { id: 'risk', label: '风险准入', desc: '校园 AI 四级风险准入清单：把伦理变成架构中的硬约束。' },
      { id: 'privacy', label: '隐私红绿灯', desc: '哪些信息绝不告诉 AI？用红绿灯卡片做隐私启蒙。' },
      { id: 'verifier', label: 'Verifier 校验', desc: '每一句话都是一个包裹：抵达学生终端前，要过五道闸。' },
      { id: 'release', label: '灰度发布', desc: '教学提示词灰度发布与 30 分钟紧急回滚窗口。' },
    ],
  },

  {
    id: 'settings',
    group: 'system',
    label: '数据与接口',
    short: '接口',
    en: 'Data & API',
    desc: 'Mock / 真实接口切换、模型席位与调用日志',
    tabs: [
      { id: 'gateway', label: '接口模式', desc: '在 Mock 与真实接口之间切换，页面代码无需任何改动。' },
      { id: 'seats', label: '席位与检索', desc: '三堂会审的模型席位，以及检索、持久化与课堂同步后端。' },
      { id: 'log', label: '调用日志', desc: '本次会话中每一次 AI 调用的场景、模型、耗时与结果。' },
      { id: 'contract', label: '接口契约', desc: '后端需要实现的接口清单（详见 docs/API.md）。' },
    ],
  },
];

export const NAV_MAP = Object.fromEntries(NAV.map((n) => [n.id, n])) as Record<RouteId, NavItem>;

/** 解析当前页面与分区：sub 不匹配任何分区时回落到第一个分区 */
export function pageMeta(route: RouteId, sub?: string): { item: NavItem; tab: NavTab; tabs: NavTab[] } {
  const item = NAV_MAP[route] ?? NAV[0];
  const tabs = item.tabs ?? [];
  const tab = tabs.find((t) => t.id === sub) ?? tabs[0] ?? { id: '', label: '', desc: item.desc };
  return { item, tab, tabs };
}
