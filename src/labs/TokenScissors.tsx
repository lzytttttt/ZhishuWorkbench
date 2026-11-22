import { useMemo, useState } from 'react';
import { cv } from '../utils/css';

type Mode = 'char' | 'word' | 'model';
interface Tok {
  text: string;
  id: number;
  kind: 'zh' | 'en' | 'punct' | 'num' | 'byte';
}

const ZH_DICT = [
  '春天', '来了', '小朋友', '朋友', '一起', '森林', '运动会', '人工智能', '人工', '智能', '大模型', '模型', '认识', '汉字',
  '只', '积木', '我们', '学习', '故事', '今天', '天气', '明天', '因为', '所以', '什么', '为什么', '可以', '知道', '不知道',
  '老师', '同学', '学校', '世界', '床前', '明月', '明月光', '疑是', '地上', '地上霜', '举头', '望明月', '低头', '思故乡',
  '大餐', '让人', '垂涎三尺', '垂涎', '三尺', '计算机', '不认识', '文字', '乐高', '切碎', '句子', '提示词', '温度', '概率',
];
const EN_WHOLE = ['the', 'a', 'an', 'is', 'are', 'i', 'you', 'we', 'ai', 'and', 'of', 'to', 'in', 'it', 'how', 'many', 'what', 'hello', 'world', 'model', 'cat', 'dog'];
const EN_PIECES = ['straw', 'berry', 'token', 'ization', 'ize', 'intel', 'ligence', 'art', 'ificial', 'tion', 'ing', 'ment', 'ness', 'able', 'er', 'ed', 'ly', 'un', 're', 'pre', 'lang', 'uage', 'learn', 'gen', 'erat', 'ive'];
const RARE = ['饕', '餮', '龘', '魑', '魅', '魍', '魉', '彧', '翀', '犇', '鑫', '淼'];

const PRESETS = ['春天来了，小朋友们一起去森林运动会。', 'How many r in strawberry?', '饕餮大餐让人垂涎三尺。', '计算机不认识汉字，只认识切碎的文字乐高积木。'];

function hash(s: string) {
  let h = 2166136261;
  for (const ch of s) {
    h ^= ch.codePointAt(0) ?? 0;
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h) % 50257;
}

const isCJK = (c: string) => /[\u4e00-\u9fff]/.test(c);
const isPunct = (c: string) => /[，。！？、；：“”‘’（）《》,.!?;:'"()\-—…]/.test(c);

function splitEn(word: string, mode: Mode): string[] {
  if (mode !== 'model') return [word];
  const lw = word.toLowerCase();
  if (EN_WHOLE.includes(lw) || word.length <= 3) return [word];
  const out: string[] = [];
  let i = 0;
  while (i < word.length) {
    let matched = '';
    for (const p of EN_PIECES) if (lw.startsWith(p, i) && p.length > matched.length) matched = p;
    if (!matched) matched = lw.slice(i, i + Math.min(3, word.length - i));
    out.push(word.slice(i, i + matched.length));
    i += matched.length;
  }
  return out;
}

function toBytes(c: string): string[] {
  const bytes = Array.from(new TextEncoder().encode(c)).map((b) => b.toString(16).toUpperCase().padStart(2, '0'));
  return [`‹${bytes[0]}›`, `‹${bytes.slice(1).join(' ')}›`];
}

export function tokenize(text: string, mode: Mode): Tok[] {
  const chars = Array.from(text);
  const toks: Tok[] = [];
  let i = 0;
  while (i < chars.length) {
    const c = chars[i];
    if (/\s/.test(c)) {
      i++;
      continue;
    }
    if (isPunct(c)) {
      toks.push({ text: c, id: hash(c), kind: 'punct' });
      i++;
      continue;
    }
    if (/[0-9]/.test(c)) {
      let j = i;
      while (j < chars.length && /[0-9]/.test(chars[j])) j++;
      const num = chars.slice(i, j).join('');
      const parts = mode === 'char' ? num.split('') : num.match(/.{1,3}/g) ?? [num];
      parts.forEach((p) => toks.push({ text: p, id: hash(p), kind: 'num' }));
      i = j;
      continue;
    }
    if (/[A-Za-z]/.test(c)) {
      let j = i;
      while (j < chars.length && /[A-Za-z']/.test(chars[j])) j++;
      const w = chars.slice(i, j).join('');
      const parts = mode === 'char' ? w.split('') : splitEn(w, mode);
      parts.forEach((p) => toks.push({ text: p, id: hash(p), kind: 'en' }));
      i = j;
      continue;
    }
    if (isCJK(c)) {
      if (mode === 'char') {
        toks.push({ text: c, id: hash(c), kind: 'zh' });
        i++;
        continue;
      }
      if (mode === 'model' && RARE.includes(c)) {
        toBytes(c).forEach((b) => toks.push({ text: b, id: hash(b), kind: 'byte' }));
        i++;
        continue;
      }
      let matched = c;
      for (let L = 4; L >= 2; L--) {
        const slice = chars.slice(i, i + L);
        if (slice.length === L && ZH_DICT.includes(slice.join(''))) {
          matched = slice.join('');
          break;
        }
      }
      toks.push({ text: matched, id: hash(matched), kind: 'zh' });
      i += Array.from(matched).length;
      continue;
    }
    toks.push({ text: c, id: hash(c), kind: 'punct' });
    i++;
  }
  return toks;
}

const MODES: { id: Mode; label: string; desc: string }[] = [
  { id: 'char', label: '按字剪', desc: '一个字 / 字母一块' },
  { id: 'word', label: '按词剪', desc: '常见词语打包成一块' },
  { id: 'model', label: '模型视角', desc: '子词积木 + 生僻字拆字节' },
];

export default function TokenScissors() {
  const [text, setText] = useState(PRESETS[0]);
  const [mode, setMode] = useState<Mode>('model');
  const [showId, setShowId] = useState(true);
  const toks = useMemo(() => tokenize(text, mode), [text, mode]);
  const charCount = Array.from(text.replace(/\s/g, '')).length;
  const hasBerry = /strawberry/i.test(text);
  const hasRare = Array.from(text).some((c) => RARE.includes(c));

  return (
    <div className="lab tok-lab">
      <div className="lab-controls">
        <div className="presets">
          {PRESETS.map((p) => (
            <button key={p} className={`chip ${text === p ? 'on' : ''}`} onClick={() => setText(p)}>
              {p.length > 14 ? p.slice(0, 14) + '…' : p}
            </button>
          ))}
        </div>
        <textarea className="tok-input" value={text} onChange={(e) => setText(e.target.value)} rows={2} placeholder="输入一句话，看看 AI 会怎么剪…" />
        <div className="row">
          <div className="segmented">
            {MODES.map((m) => (
              <button key={m.id} className={mode === m.id ? 'on' : ''} onClick={() => setMode(m.id)} title={m.desc}>
                ✂ {m.label}
              </button>
            ))}
          </div>
          <label className="toggle inline">
            <input type="checkbox" checked={showId} onChange={(e) => setShowId(e.target.checked)} />
            <span className="tg" />
            <span>显示 Token 编号</span>
          </label>
          <div className="spacer" />
          <div className="tok-stats mono">
            <span>
              字符 <b>{charCount}</b>
            </span>
            <span>
              Token <b>{toks.length}</b>
            </span>
            <span>
              压缩比 <b>{toks.length ? (charCount / toks.length).toFixed(2) : '—'}</b>
            </span>
          </div>
        </div>
      </div>

      <div className="tok-tray" key={mode + text}>
        {toks.map((t, i) => (
          <div key={i} className="tok-wrap" style={{ animationDelay: `${Math.min(i, 40) * 35}ms` }}>
            {i > 0 && <span className="cut" aria-hidden />}
            <div className={`lego k-${t.kind}`} style={cv({ '--h': String(t.id % 360) })}>
              <span className="studs">
                <i />
                <i />
              </span>
              <span className="lego-text">{t.text}</span>
            </div>
            {showId && <span className="tok-id mono">#{t.id}</span>}
          </div>
        ))}
      </div>

      <div className="insight-row">
        <div className="insight">
          <b>🧱 模型真正看到的</b>
          <p className="mono small">[{toks.map((t) => t.id).join(', ')}]</p>
        </div>
        {hasBerry && (
          <div className="insight warn">
            <b>为什么 AI 数不清 strawberry 里的 r？</b>
            <p>在模型视角下，它被打包成「straw」「berry」等积木。模型感知的是积木编号，而不是一个个字母——所以“数字母”“倒背如流”这类任务容易出错。</p>
          </div>
        )}
        {hasRare && mode === 'model' && (
          <div className="insight warn">
            <b>生僻字被拆成了“字节碎片”</b>
            <p>词表里没有的生僻字，只能被拆成 UTF-8 字节碎片拼凑表示，这正是大模型在生僻字、拆字游戏上常常出错的原因。</p>
          </div>
        )}
        {!hasBerry && !(hasRare && mode === 'model') && (
          <div className="insight">
            <b>✂ 试一试</b>
            <p>切换“按字剪 / 按词剪 / 模型视角”，比较 Token 数量的变化；再试试 strawberry 和“饕餮”。</p>
          </div>
        )}
      </div>
    </div>
  );
}
