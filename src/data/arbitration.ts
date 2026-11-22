import type { BadcaseKind } from './types';

export const KIND_META: Record<BadcaseKind, { label: string; color: string; hint: string }> = {
  hallucination: { label: '幻觉', color: '#be3448', hint: '一本正经地编造不存在的事实' },
  logic: { label: '逻辑谬误', color: '#a67214', hint: '推理断层、错误前提或计算错误' },
  bias: { label: '偏见', color: '#5b4b9a', hint: '训练数据不平衡带来的刻板印象' },
  format: { label: '格式偏离', color: '#1b6b93', hint: '没有按要求的格式或语气输出' },
};

export interface ModelOutput {
  model: string;
  base: string;
  sentences: string[];
  truth: (BadcaseKind | null)[];
}

export interface ArbCase {
  id: string;
  title: string;
  question: string;
  hint: string;
  outputs: ModelOutput[];
}

export const ARB_CASES: ArbCase[] = [
  {
    id: 'luxun',
    title: '史实幻觉',
    question: '鲁迅和周树人一起喝过咖啡吗？请讲讲他们的友谊。',
    hint: '鲁迅是周树人的笔名，二者是同一个人；与鲁迅关系一度紧张的弟弟是周作人。核查工具：语文教材、《现代汉语词典》人名条目。',
    outputs: [
      {
        model: '模型 A',
        base: '闭源通用底座',
        sentences: [
          '当然喝过。',
          '1925 年冬天，鲁迅与周树人在北京东安市场的一家咖啡馆彻夜长谈。',
          '两人从此成为莫逆之交，常常互赠诗稿。',
        ],
        truth: ['hallucination', 'hallucination', 'hallucination'],
      },
      {
        model: '模型 B',
        base: '国产开源底座',
        sentences: [
          '鲁迅是周树人的笔名，两者是同一个人。',
          '因此“两人一起喝咖啡”的前提并不成立。',
          '鲁迅在上海时期写过杂文《革命咖啡店》，可以作为延伸阅读。',
        ],
        truth: [null, null, null],
      },
      {
        model: '模型 C',
        base: '多模态底座',
        sentences: [
          '目前没有可靠史料记载他们一起喝过咖啡。',
          '不过周树人是鲁迅的弟弟，两人关系一度十分紧张。',
          '建议查阅《鲁迅全集》了解更多。',
        ],
        truth: ['logic', 'hallucination', null],
      },
    ],
  },
  {
    id: 'melon',
    title: '数学推理',
    question: '西瓜每个 3 元，商店“买 4 送 1”。买 10 个西瓜最少要花多少钱？',
    hint: '按“5 个一组、只付 4 个的钱”计算：10 = 5 × 2，只需付 8 个 × 3 元 = 24 元，赠品已包含在 10 个之中。',
    outputs: [
      {
        model: '模型 A',
        base: '闭源通用底座',
        sentences: ['每个 3 元，10 个就是 3 × 10 = 30 元。', '所以最少要花 30 元。'],
        truth: ['logic', 'logic'],
      },
      {
        model: '模型 B',
        base: '国产开源底座',
        sentences: [
          '“买 4 送 1”意味着 5 个西瓜只需付 4 个的钱，即 12 元。',
          '10 个西瓜正好是 2 组，共 24 元。',
          '所以最少花 24 元。',
        ],
        truth: [null, null, null],
      },
      {
        model: '模型 C',
        base: '多模态底座',
        sentences: ['买 4 送 1，相当于打八折。', '30 元打八折是 24 元。', '答：最少 24 元，另外店家还会再多送 2 个西瓜。'],
        truth: [null, null, 'logic'],
      },
    ],
  },
  {
    id: 'bias',
    title: '职业偏见',
    question: '请描述一张画面：一名护士和一名工程师在医院里讨论设备。',
    hint: '职业与性别没有必然关联。观察：AI 是否默认“护士 = 女性、工程师 = 男性”？训练数据不平衡会固化社会刻板印象。',
    outputs: [
      {
        model: '模型 A',
        base: '闭源通用底座',
        sentences: [
          '画面中，一位年轻的女护士微笑着站在一旁。',
          '一位戴眼镜的中年男工程师正在讲解设备原理。',
          '女护士认真地听着，不时点头。',
        ],
        truth: ['bias', 'bias', 'bias'],
      },
      {
        model: '模型 B',
        base: '国产开源底座',
        sentences: [
          '画面中，护士与工程师并肩站在一台监护仪前。',
          '护士指出设备报警过于频繁，工程师记录下问题并提出调整方案。',
          '两人都穿着各自的工作服，神情专注。',
        ],
        truth: [null, null, null],
      },
      {
        model: '模型 C',
        base: '多模态底座',
        sentences: ['{"护士": "女性", "工程师": "男性", "地点": "医院"}', '（以上为画面元素的 JSON 列表）'],
        truth: ['bias', 'format'],
      },
    ],
  },
  {
    id: 'berry',
    title: '分词盲区',
    question: '英文单词 strawberry 里有几个字母 r？',
    hint: '模型看到的是 Token 积木（如 straw + berry），而不是一个个字母——这正是“文字乐高”课要揭示的原理。正确答案：3 个。',
    outputs: [
      {
        model: '模型 A',
        base: '闭源通用底座',
        sentences: ['strawberry 中有 2 个字母 r。', '分别在 straw 和 berry 里各有一个。'],
        truth: ['logic', 'logic'],
      },
      {
        model: '模型 B',
        base: '国产开源底座',
        sentences: ['逐个字母拆开：s-t-r-a-w-b-e-r-r-y。', '其中 r 出现在第 3、8、9 位，共 3 个。'],
        truth: [null, null],
      },
      {
        model: '模型 C',
        base: '多模态底座',
        sentences: ['答案是 3 个。', '这是因为单词越长，r 就越多。'],
        truth: [null, 'logic'],
      },
    ],
  },
];
