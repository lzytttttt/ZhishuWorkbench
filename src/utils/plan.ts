import type { Lesson } from '../data/curriculum';
import type { Segment, SegmentType } from '../data/types';

export const uid = () => Math.random().toString(36).slice(2, 10);

export const SEGMENT_META: Record<SegmentType, { label: string; short: string; color: string; desc: string; free: boolean }> = {
  intro: { label: '情境导入', short: '导入', color: '#6e6e73', desc: '提出真实问题，激活已有经验', free: false },
  aifree: { label: 'AI-Free 独立推演', short: 'AI-Free', color: '#c83e2b', desc: '关闭一切生成式工具，仅凭纸笔完成问题定义与逻辑草图', free: true },
  unplugged: { label: '无插电降维活动', short: '无插电', color: '#8c6d3f', desc: '物理隐喻 + 博弈游戏，可触摸的具身认知体验', free: true },
  ai: { label: 'AI 原生协作', short: 'AI 协作', color: '#1b6b93', desc: '以“AI 系统导演”身份进行目标委托与上下文供给', free: false },
  judge: { label: '质量仲裁与核查', short: '仲裁', color: '#a67214', desc: '多模型交叉核查、事实核查与 Badcase 归档', free: false },
};

export function defaultPlan(lesson: Lesson): Segment[] {
  return [
    { id: uid(), type: 'intro', minutes: 5, title: `情境导入：${lesson.hook}` },
    { id: uid(), type: 'aifree', minutes: 8, title: lesson.aiFreeHint },
    { id: uid(), type: 'unplugged', minutes: 10, title: lesson.unplugged },
    { id: uid(), type: 'ai', minutes: 10, title: '以导演身份委托目标，供给上下文与约束' },
    { id: uid(), type: 'judge', minutes: 7, title: '交叉核查输出，归档 Badcase 并撰写透明度声明' },
  ];
}

export function aiFreeRatio(plan: Segment[]): number {
  const total = plan.reduce((s, x) => s + x.minutes, 0);
  if (!total) return 0;
  const free = plan.filter((x) => SEGMENT_META[x.type].free).reduce((s, x) => s + x.minutes, 0);
  return free / total;
}
