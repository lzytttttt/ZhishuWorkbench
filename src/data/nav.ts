import type { RouteId } from '../hooks/useHashRoute';

export type NavGroupId = 'teach' | 'lab' | 'govern' | 'system';

export interface NavItem {
  id: RouteId;
  label: string;
  short: string;
  en: string;
  desc: string;
  group: NavGroupId;
}

export interface NavGroup {
  id: NavGroupId;
  label: string;
}

/** 侧栏分组（system 组固定在侧栏底部，不在此列出） */
export const NAV_GROUPS: NavGroup[] = [
  { id: 'teach', label: '教学总览' },
  { id: 'lab', label: '认知实验' },
  { id: 'govern', label: '治理评价' },
];

export const NAV: NavItem[] = [
  { id: 'cockpit', group: 'teach', label: '认知心脏驾驶舱', short: '驾驶舱', en: 'Cockpit', desc: 'AI Native 五件套架构与螺旋认知环总览' },
  { id: 'curriculum', group: 'teach', label: '课程螺旋矩阵', short: '课程', en: 'Spiral Curriculum', desc: '以 LLM 为骨干的课程知识图谱' },
  { id: 'classroom', group: 'teach', label: '课堂直播', short: '课堂', en: 'Classroom Live', desc: '开课、投票、共建 Badcase、学习伙伴与全班 AI-Free' },
  { id: 'labs', group: 'lab', label: '降维实验室', short: '实验室', en: 'Unplugged Labs', desc: '把 LLM 机制变成可触摸的交互沙盒' },
  { id: 'composer', group: 'lab', label: '备课编排台', short: '备课', en: 'Lesson Composer', desc: '课时编排、AI-Free 占比与教育提示词生成' },
  { id: 'arbitration', group: 'lab', label: '三堂会审', short: '会审', en: 'Model Tribunal', desc: '多模型交叉审计与 Badcase 数据飞轮' },
  { id: 'assessment', group: 'govern', label: '双量规评价', short: '评价', en: 'Dual Rubrics', desc: '提示词工程 15 分量规与 AI 透明度五级量表' },
  { id: 'guardrails', group: 'govern', label: '安全护栏', short: '护栏', en: 'Guardrails', desc: '四级风险准入、隐私红绿灯与 Verifier 校验' },
  { id: 'settings', group: 'system', label: '数据与接口', short: '接口', en: 'Data & API', desc: 'Mock / 真实接口切换、模型席位配置与调用日志' },
];
