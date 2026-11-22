import { useState } from 'react';
import { TRANSPARENCY } from '../data/rubric';
import { Seal } from '../fun/Stamp';
import { useServices } from '../services/ServiceContext';
import { cv } from '../utils/css';
import type { LogEntry, Reflection } from './identity';

const OUTCOME: Record<LogEntry['outcome'], string> = {
  ok: '已回答',
  'blocked-input': '提问被拦截',
  'blocked-output': '回答被拦截',
  error: '未完成',
};

/** 我的 AI 协作日志 + 透明度声明生成器（对应“AI 使用透明度五级量表”） */
export default function MyLog({
  entries,
  reflection,
  setReflection,
  lessonTitle,
  nickname,
}: {
  entries: LogEntry[];
  reflection: Reflection;
  setReflection: (r: Reflection) => void;
  lessonTitle: string;
  nickname: string;
}) {
  const { config } = useServices();
  const [copied, setCopied] = useState(false);
  const tool = config.mode === 'mock' ? '知枢学习伙伴（Mock 模拟模型）' : `知枢学习伙伴（${config.defaultModel || '默认模型'}）`;
  const asked = entries.filter((e) => e.outcome !== 'blocked-input');
  const len = (s: string) => Array.from(s.trim()).length;

  const elements = [
    { label: '写明了使用的 AI 工具与模型', ok: entries.length > 0 },
    { label: '保留了提示词迭代记录', ok: asked.length > 0 },
    { label: '说明了如何核查与改写 AI 的输出', ok: len(reflection.checked) >= 15 && len(reflection.rewrote) >= 15 },
  ];
  const count = elements.filter((e) => e.ok).length;
  const deep = count === 3 && len(reflection.checked) + len(reflection.rewrote) >= 80;
  const level = TRANSPARENCY[deep ? 0 : count === 3 ? 1 : count === 2 ? 2 : count === 1 ? 3 : 4];
  const blocked = entries.filter((e) => e.outcome.startsWith('blocked')).length;
  const passport: { label: string; ok: boolean; weight: 'minor' | 'major'; done: string; todo: string; tip: string }[] = [
    { label: '提问', ok: entries.length > 0, weight: 'minor', done: '用过 AI', todo: '尚未提问', tip: '只要用过一次就盖章；多问不会多盖。' },
    { label: '拦截', ok: blocked > 0, weight: 'minor', done: '见过护栏', todo: '未遇拦截', tip: '被 Verifier 拦下过一次，说明你见过护栏长什么样。' },
    { label: '核查', ok: len(reflection.checked) >= 15, weight: 'major', done: '亲手核对', todo: '写 15 字核查', tip: '写清楚你用什么资料核对了 AI 的说法。' },
    { label: '改写', ok: len(reflection.rewrote) >= 15, weight: 'major', done: '亲手改写', todo: '写 15 字改写', tip: '写清楚你删改了 AI 的哪些内容、为什么。' },
  ];

  const declaration = [
    `【AI 使用透明度声明】`,
    `课程：${lessonTitle}　　声明人：${nickname}`,
    `1. 使用的 AI 工具：${tool}`,
    `2. 提示词迭代（共 ${asked.length} 次）：`,
    ...asked.map((e, i) => `   ${i + 1}) ${new Date(e.at).toLocaleTimeString('zh-CN', { hour12: false })} ${e.prompt}（${OUTCOME[e.outcome]}）`),
    `3. 我如何核查 AI 的回答：${reflection.checked.trim() || '（待填写）'}`,
    `4. 我改写 / 删除了哪些内容：${reflection.rewrote.trim() || '（待填写）'}`,
  ].join('\n');

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(declaration);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  return (
    <section className="s-card s-log">
      <div className="s-kicker">我的 AI 协作日志</div>
      <h2 className="s-q sm">诚实地写下：我用了什么、核查了什么、改了什么</h2>

      <div className="log-kpis">
        <div>
          <small>提问次数</small>
          <b className="mono">{entries.length}</b>
        </div>
        <div>
          <small>被安全复核拦截</small>
          <b className="mono">{entries.filter((e) => e.outcome.startsWith('blocked')).length}</b>
        </div>
      </div>

      <div className="passport" style={cv({ '--c': level.color })}>
        <div className="pp-head">
          <b>AI 协作护照</b>
          <small>「提问」只盖一次，多问不多盖；「核查」「改写」才是朱砂章。</small>
        </div>
        <div className="pp-stamps">
          {passport.map((p) => (
            <div key={p.label} className={`pp-stamp ${p.ok ? 'earned' : ''} ${p.weight}`} title={p.tip}>
              <Seal label={p.label} tone={p.weight === 'major' ? 'cinnabar' : 'ink'} size={p.weight === 'major' ? 'md' : 'sm'} ghost={!p.ok} />
              <small>{p.ok ? p.done : p.todo}</small>
            </div>
          ))}
          <div className={`pp-stamp level ${count > 0 ? 'earned' : ''}`} title="五级透明度自评（最终由老师评定）">
            <span className="pp-level" style={cv({ '--c': level.color })}>
              <b>{level.name}</b>
            </span>
            <small>透明度</small>
          </div>
        </div>
      </div>

      <div className="log-list">
        {entries.length ? (
          entries
            .slice()
            .reverse()
            .map((e) => (
              <div key={e.id} className={`log-item ${e.outcome}`}>
                <span className="mono">{new Date(e.at).toLocaleTimeString('zh-CN', { hour12: false })}</span>
                <span className="li-text">{e.prompt}</span>
                <span className="li-st">{OUTCOME[e.outcome]}</span>
              </div>
            ))
        ) : (
          <div className="td-empty">还没有使用过学习伙伴。</div>
        )}
      </div>

      <div className="decl-grid">
        <label className="reason">
          <span>我如何核查 AI 的回答？</span>
          <textarea rows={3} value={reflection.checked} onChange={(e) => setReflection({ ...reflection, checked: e.target.value })} placeholder="例如：用课本和字典核对了两个说法，发现其中一个是错的……" />
        </label>
        <label className="reason">
          <span>我改写 / 删除了哪些内容？为什么？</span>
          <textarea rows={3} value={reflection.rewrote} onChange={(e) => setReflection({ ...reflection, rewrote: e.target.value })} placeholder="例如：删掉了 AI 编造的年份，用自己的话重写了结论……" />
        </label>
      </div>

      <div className="self-check" style={cv({ '--c': level.color })}>
        <ul>
          {elements.map((e) => (
            <li key={e.label} className={e.ok ? 'ok' : ''}>
              {e.ok ? '✓' : '○'} {e.label}
            </li>
          ))}
        </ul>
        <div className="sc-level">
          <small>自评参考（最终由老师评定）</small>
          <b>{level.name}</b>
          <span>{level.role}</span>
        </div>
      </div>

      <pre className="decl-preview">{declaration}</pre>
      <button className="btn primary s-copy" onClick={copy}>
        {copied ? '已复制 ✓' : '复制透明度声明'}
      </button>
    </section>
  );
}
