/* 治理：三条铁律、四级风险、隐私红绿灯、Verifier 规矩清单 */

export const THREE_LAWS = [
  {
    no: '壹',
    title: '建立不可替代的能力锚点',
    en: 'Capability Anchors',
    desc: '在跨学科项目中深扎底层学科原理与人际沟通，让 AI 成为认知结构的加速器而非替代品。',
  },
  {
    no: '贰',
    title: '刻意练习无 AI 思考',
    en: 'AI-Free Thinking',
    desc: '每个教学单元保留不少于 25% 的断网独立推演时段，防止独立思考的“肌肉”萎缩。',
  },
  {
    no: '叁',
    title: '鉴赏力优先于生产力',
    en: 'Connoisseurship',
    desc: '就同一问题交叉比对多个大模型的输出差异，识别逻辑谬误并确立质量标杆。',
  },
];

export interface RiskLevel {
  id: 'unacceptable' | 'high' | 'limited' | 'minimal';
  name: string;
  en: string;
  color: string;
  policy: string;
  examples: string[];
}

export const RISK_LEVELS: RiskLevel[] = [
  {
    id: 'unacceptable',
    name: '不可接受风险',
    en: 'Unacceptable',
    color: '#c83e2b',
    policy: '全面禁止进校。',
    examples: ['学生社会信用评分', '课堂无感监控微表情 / 情绪 / 注意力的面部识别'],
  },
  {
    id: 'high',
    name: '高风险',
    en: 'High Risk',
    color: '#b85319',
    policy: '接受严格的算法偏见审计与人工终审；通用 LLM 仅可用于形成性评估，严禁无教师监督的高利害总结性评分。',
    examples: ['升学招生录取筛选', '高利害考试智能监考', '学业总结性评定'],
  },
  {
    id: 'limited',
    name: '有限风险',
    en: 'Limited Risk',
    color: '#a67214',
    policy: '履行强制透明度义务：向师生披露 AI 属性、知识截止日期及潜在误差率。',
    examples: ['学科辅导聊天机器人', 'AI 写作反馈助手', 'AIGC 检测器'],
  },
  {
    id: 'minimal',
    name: '极低风险',
    en: 'Minimal Risk',
    color: '#1d7453',
    policy: '遵循自愿伦理准则，开放给学生自由探索与二次创作。',
    examples: ['AI 编程闯关游戏', '无插电模拟沙盒', '垃圾邮件过滤器'],
  },
];

export interface PrivacyCard {
  id: string;
  text: string;
  emoji: string;
  red: boolean;
  why: string;
}

export const PRIVACY_CARDS: PrivacyCard[] = [
  { id: 'name', text: '我的真实姓名 + 班级', emoji: '🪪', red: true, why: '组合起来就能定位到你本人。' },
  { id: 'addr', text: '家庭住址', emoji: '🏠', red: true, why: '陌生人可能据此找到你家。' },
  { id: 'pwd', text: '爸爸妈妈的手机密码', emoji: '🔐', red: true, why: '密码只属于主人自己。' },
  { id: 'phone', text: '家里人的手机号', emoji: '📱', red: true, why: '可能被用于诈骗。' },
  { id: 'idcard', text: '身份证号码', emoji: '🆔', red: true, why: '它是独一无二的身份钥匙。' },
  { id: 'color', text: '我最喜欢的颜色', emoji: '🎨', red: false, why: '分享兴趣不会暴露你是谁。' },
  { id: 'animal', text: '我喜欢的小动物', emoji: '🐼', red: false, why: '可以放心聊。' },
  { id: 'mood', text: '今天的心情', emoji: '🌤️', red: false, why: '表达感受是安全的。' },
  { id: 'story', text: '想听的故事主题', emoji: '📚', red: false, why: '这正是和 AI 共创的好起点。' },
  { id: 'sport', text: '喜欢的运动', emoji: '⚽', red: false, why: '兴趣爱好可以分享。' },
];

export interface VerifierRule {
  id: string;
  name: string;
  stage: 2 | 3;
  pattern: RegExp;
  action: string;
}

export const VERIFIER_RULES: VerifierRule[] = [
  {
    id: 'ghost',
    name: '代写替考',
    stage: 2,
    pattern: /(帮我|替我|给我)(直接)?(写|完成|做)(一篇|整篇|完|全部|作文|作业)|代写|直接交给老师/,
    action: '拦截直接代写，转为脚手架式引导：先请学生给出提纲与第一句。',
  },
  {
    id: 'bias',
    name: '歧视与偏见',
    stage: 2,
    pattern: /(女生|男生|女孩|男孩|女性|男性).{0,6}(天生|不适合|学不好|就是不行)|(农村|外地|老年)人.{0,4}(素质|都不|就是)/,
    action: '拦截含年龄 / 性别 / 地域歧视的前提，回应以事实与反刻板印象案例。',
  },
  {
    id: 'medical',
    name: '越界医疗建议',
    stage: 3,
    pattern: /(吃什么药|吃多少|处方|剂量|药量|开点药)/,
    action: '拒绝给出处方或剂量，建议告诉家长并就医。',
  },
  {
    id: 'privacy',
    name: '红灯隐私',
    stage: 3,
    pattern: /1[3-9]\d{9}|身份证|家住在|家庭住址|密码是/,
    action: '屏蔽并提醒：这是红灯隐私，不要告诉聊天机器人。',
  },
  {
    id: 'illegal',
    name: '违法不当内容',
    stage: 3,
    pattern: /(破解|盗号|作弊器|外挂|入侵)/,
    action: '拒绝提供违法或不当操作方法。',
  },
];

export const PIPELINE = ['意图识别', '主模型生成', 'Verifier LLM 审查', '规矩清单校验', '抵达学生终端'];
