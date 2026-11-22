import { useState, type MouseEvent } from 'react';
import { play } from '../fun/sound';
import { Seal, useStamp } from '../fun/Stamp';
import PageHeader from '../components/PageHeader';
import RadarChart from '../components/RadarChart';
import { pageMeta } from '../data/nav';
import { RUBRIC, TRANSPARENCY } from '../data/rubric';
import { describeError } from '../services/errors';
import { heuristicScore } from '../services/evaluator/rubricEvaluators';
import { useServices } from '../services/ServiceContext';
import type { RubricScore } from '../services/types';
import { cv } from '../utils/css';

const SAMPLES = {
  weak: '帮我写篇关于垃圾分类的报告',
  strong: `# 角色
你是一名面向小学生的环保科普编辑。

# 任务规则
- 围绕“校园垃圾分类”写一篇 300 字以内的科普短文。
- 必须使用小学生能读懂的语言，不要出现专业术语。
- 不确定的数据请标注“待核实”，不要编造。

# 背景资料
"""
（此处粘贴：学校垃圾分类调查表与《生活垃圾分类标志》国家标准摘录）
"""

# 推理步骤
1. Plan：先列出提纲（问题—原因—做法）。
2. Act：按提纲逐段写作。
3. Reflect：检查是否有编造的数据，并说明你检查了什么。

# 参考示例
正例：“塑料瓶要先倒空、压扁，再放进蓝色的可回收物桶。”
反例：“塑料是高分子聚合物，降解周期很长。”（太专业，不要这样写）

# 输出格式
用 Markdown 输出：一个标题 + 三个小标题段落 + 末尾一个思考题。`,
};

const INITIAL = heuristicScore(SAMPLES.weak);

export default function Assessment({ sub }: { sub?: string }) {
  const { item, tab, tabs } = pageMeta('assessment', sub);
  const { evaluator, config } = useServices();
  const [text, setText] = useState(SAMPLES.weak);
  const [pre, setPre] = useState<RubricScore>(INITIAL);
  const [scores, setScores] = useState<number[]>(INITIAL.scores);
  const [teacherEdited, setTeacherEdited] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [trans, setTrans] = useState(72);
  // 每个维度是否已由教师“终审”（点过一次格子）
  const [final, setFinal] = useState<boolean[]>(() => RUBRIC.map(() => false));
  const { stamp } = useStamp();

  const total = scores.reduce((a, b) => a + b, 0);
  const band =
    total >= 13
      ? { name: '结构严谨', desc: '提示词结构严谨，跨轮次输出高度稳定可靠。', color: '#1d7453' }
      : total >= 9
        ? { name: '需迭代优化', desc: '基本达成意图，需针对薄弱维度进行迭代优化。', color: '#a67214' }
        : { name: '退回重构', desc: '指令存在严重结构缺陷，必须退回进行全面重构。', color: '#c83e2b' };
  const level = TRANSPARENCY.find((l) => trans >= l.min && trans <= l.max) ?? TRANSPARENCY[TRANSPARENCY.length - 1];

  const runPre = async () => {
    setEvaluating(true);
    setEvalError(null);
    try {
      const r = await evaluator.scorePrompt(text);
      setPre(r);
      setScores(r.scores);
      setTeacherEdited(false);
      setFinal(RUBRIC.map(() => false));
    } catch (e) {
      setEvalError(describeError(e));
    } finally {
      setEvaluating(false);
    }
  };

  const setCell = (i: number, v: number) => {
    setScores((s) => s.map((x, k) => (k === i ? v : x)));
    setFinal((f) => f.map((x, k) => (k === i ? true : x)));
    setTeacherEdited(true);
    play('stamp');
  };
  const confirmed = final.filter(Boolean).length;
  const seal = (e: MouseEvent<HTMLButtonElement>) => {
    setFinal(RUBRIC.map(() => true));
    setTeacherEdited(true);
    if (total <= 8) stamp({ label: '退回', tone: 'ink', target: `提示词量规 ${total}/15 · 退回重构`, at: e.currentTarget });
    else stamp({ label: '终审', target: `提示词量规 ${total}/15 · ${band.name}`, at: e.currentTarget });
  };

  const sourceLabel = pre.source === 'llm' ? '大模型预评' : '规则启发式预评';

  return (
    <div className="page assess">
      <PageHeader route="assessment" title={item.label} desc={tab.desc} tabs={tabs} active={tab.id} />

      <div className="tab-pane" key={tab.id}>
        {tab.id === 'submit' && (
          <div className="assess-grid">
            <section className="panel prompt-in">
              <div className="row">
                <b>学生提交的提示词</b>
                <div className="spacer" />
                <button className="chip" onClick={() => setText(SAMPLES.weak)}>
                  示例：笼统指令
                </button>
                <button className="chip" onClick={() => setText(SAMPLES.strong)}>
                  示例：结构化指令
                </button>
              </div>
              <textarea className="prompt-area mono" value={text} onChange={(e) => setText(e.target.value)} rows={16} />
              <div className="row">
                <button className="btn primary" onClick={runPre} disabled={evaluating}>
                  {evaluating ? '评估中…' : config.mode === 'remote' ? '⚡ 大模型形成性预评' : '⚡ 规则形成性预评'}
                </button>
                <span className="muted small">{teacherEdited ? '✎ 已由教师修订（终审）' : `${sourceLabel} · 请教师逐项确认（标 AI 的格子为预评建议）`}</span>
              </div>
              {pre.note && <p className="note">⚠ {pre.note}</p>}
              {evalError && <p className="err small">{evalError}</p>}
            </section>
            <section className="panel score-panel">
              <div className="radar-grow" key={scores.join('')}>
                <RadarChart labels={RUBRIC.map((r) => `${r.id} ${r.name.slice(0, 4)}`)} values={scores} max={3} size={300} color={band.color} />
              </div>
              <div className="score-big" style={{ color: band.color }}>
                <b className="mono">{total}</b>
                <span>/ 15</span>
              </div>
              <div className="band" style={cv({ '--c': band.color })}>
                <b>{band.name}</b>
                <p>{band.desc}</p>
              </div>
              <a className="btn primary seal-btn" href="#/assessment/rubric">
                进入量规终审 →
              </a>
              <div className="band-scale">
                <span className={total <= 8 ? 'on' : ''}>≤8 重构</span>
                <span className={total >= 9 && total <= 12 ? 'on' : ''}>9–12 迭代</span>
                <span className={total >= 13 ? 'on' : ''}>13–15 严谨</span>
              </div>
            </section>
          </div>
        )}

        {tab.id === 'rubric' && (
          <>
            <section className="panel rubric-summary" style={cv({ '--c': band.color })}>
              <div className="rs-score">
                <b className="mono">{total}</b>
                <span>/ 15</span>
              </div>
              <div className="rs-band">
                <b>{band.name}</b>
                <small>{teacherEdited ? '✎ 已由教师修订' : `${sourceLabel} · 点选格子逐项终审`}</small>
              </div>
              <div className="spacer" />
              <span className="muted small mono">
                已确认 {confirmed}/{RUBRIC.length}
              </span>
              <button className={`btn ${total <= 8 ? '' : 'primary'}`} onClick={seal}>
                {total <= 8 ? '退回重构 · 盖章' : '终审 · 盖章'}
              </button>
            </section>
            <section className="panel rubric">
              <div className="rubric-grid">
                <div className="rb-h">评估维度</div>
                <div className="rb-h">待重构（1 分）</div>
                <div className="rb-h">中等（2 分）</div>
                <div className="rb-h">高水平（3 分）</div>
                {RUBRIC.map((r, i) => (
                  <div key={r.id} className="rb-row" style={{ display: 'contents' }}>
                    <div className="rb-dim">
                      <span className="rb-id mono">{r.id}</span>
                      <b>{r.name}</b>
                      <small>{r.en}</small>
                      <p>{r.observe}</p>
                      {pre.rationale[i] && <p className="rb-why">预评依据：{pre.rationale[i]}</p>}
                    </div>
                    {r.levels.map((lv, k) => (
                      <button key={k} className={`rb-cell lv${k + 1} ${scores[i] === k + 1 ? 'on' : ''} ${final[i] && scores[i] === k + 1 ? 'final' : ''}`} onClick={() => setCell(i, k + 1)}>
                        {lv}
                        {pre.scores[i] === k + 1 && !(final[i] && scores[i] === k + 1) && (
                          <span className="ghost-seal" title="AI 预评建议（幽灵章）：点一下格子即由教师终审">
                            <Seal label="预评" size="xs" ghost />
                          </span>
                        )}
                        {final[i] && scores[i] === k + 1 && (
                          <span className="final-seal" title="教师终审">
                            <Seal label="终审" size="xs" />
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {tab.id === 'transparency' && (
          <section className="panel transparency">
            <div className="eyebrow pane-eyebrow">AI TRANSPARENCY · 百分制五级</div>
            <div className="tr-grid">
              <div className="thermo-h">
                <div className="tr-bar stairs">
                  {TRANSPARENCY.slice()
                    .reverse()
                    .map((l, si) => (
                      <div key={l.name} className={`tr-seg ${l === level ? 'on' : ''}`} style={{ flexGrow: l.max - l.min + 1, ...cv({ '--c': l.color, '--step': si }) }}>
                        <b>{l.name}</b>
                        <small>
                          {l.min}–{l.max}
                        </small>
                      </div>
                    ))}
                </div>
                <input type="range" min={0} max={100} value={trans} onChange={(e) => setTrans(Number(e.target.value))} className="tr-range" />
                <div className="tr-pointer mono" style={{ left: `${trans}%`, color: level.color }}>
                  {trans}
                </div>
              </div>
              <div className="tr-detail" style={cv({ '--c': level.color })}>
                <div className="tr-level">
                  <b>{level.name}</b>
                  <small>{level.en}</small>
                </div>
                <p>{level.criteria}</p>
                <div className="tr-role">
                  <small>对应认知主权层级</small>
                  <span>{level.role}</span>
                </div>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
