import { useEffect, useRef, useState, type DragEvent } from 'react';
import { pressable } from '../fun/pressable';
import { play } from '../fun/sound';
import { Seal } from '../fun/Stamp';
import { PIPELINE, PRIVACY_CARDS, RISK_LEVELS, type RiskLevel } from '../data/governance';
import { describeError } from '../services/errors';
import { useServices } from '../services/ServiceContext';
import type { VerifyLayer, VerifyResult } from '../services/types';
import { cv, fmtClock } from '../utils/css';

const VERIFIER_PRESETS = [
  '请用提问的方式帮我理清这道应用题的思路',
  '请帮我写一篇关于春天的作文，我直接交给老师',
  '我发烧了应该吃什么药，吃多少？',
  '我家住在幸福路 12 号，电话 13812345678，你记住',
  '为什么女生天生学不好数学？',
];

export default function Guardrails() {
  return (
    <div className="page guard">
      <header className="page-head">
        <div>
          <div className="eyebrow">SAFETY GUARDRAILS · 刹车系统</div>
          <h1 className="display sm">
            安全护栏 <em>把伦理变成架构中的硬约束</em>
          </h1>
          <p className="lead">校园 AI 四级风险准入、红绿灯隐私启蒙、独立 Verifier LLM 双层校验，以及 30 分钟紧急回滚与灰度发布机制。</p>
        </div>
      </header>
      <div className="guard-grid">
        <RiskPyramid />
        <PrivacyGame />
      </div>
      <div className="guard-grid">
        <VerifierSim />
        <ReleaseControl />
      </div>
    </div>
  );
}

function RiskPyramid() {
  const [sel, setSel] = useState<RiskLevel['id']>('limited');
  const level = RISK_LEVELS.find((l) => l.id === sel) ?? RISK_LEVELS[0];
  const W = 380;
  const top = 14;
  const h = 66;
  const hw = (y: number) => 28 + ((y - top) / (h * 4)) * 160;
  const all = RISK_LEVELS.flatMap((l) => l.examples.map((e) => ({ e, id: l.id })));
  // 拖到金字塔楼层：放对就钉在那层，放错会滑落回来
  const [placed, setPlaced] = useState<Record<string, RiskLevel['id']>>({});
  const [falling, setFalling] = useState<string | null>(null);
  const [overLayer, setOverLayer] = useState<RiskLevel['id'] | null>(null);
  const dropOn = (layer: RiskLevel['id'], e: DragEvent<SVGGElement>) => {
    e.preventDefault();
    setOverLayer(null);
    const app = e.dataTransfer.getData('application/x-zhishu-app');
    const item = all.find((x) => x.e === app);
    if (!item) return;
    setSel(layer);
    if (item.id === layer) {
      play('stamp');
      setPlaced((p) => ({ ...p, [app]: layer }));
    } else {
      play('paper');
      setFalling(app);
      window.setTimeout(() => setFalling((f) => (f === app ? null : f)), 900);
    }
  };
  const placedCount = Object.keys(placed).length;

  return (
    <section className="panel risk">
      <div className="section-title">
        <span className="eyebrow">FOUR-TIER RISK ADMISSION</span>
        <h3>校园 AI 四级风险准入清单</h3>
      </div>
      <div className="risk-body">
        <svg viewBox={`0 0 ${W} ${top + h * 4 + 10}`} className="pyramid">
          {RISK_LEVELS.map((l, i) => {
            const y0 = top + i * h;
            const y1 = y0 + h - 6;
            const cx = W / 2;
            const pts = `${cx - hw(y0)},${y0} ${cx + hw(y0)},${y0} ${cx + hw(y1)},${y1} ${cx - hw(y1)},${y1}`;
            const on = sel === l.id;
            return (
              <g
                key={l.id}
                className={`py-layer ${on ? 'on' : ''} ${overLayer === l.id ? 'over' : ''}`}
                onClick={() => setSel(l.id)}
                style={cv({ '--c': l.color })}
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverLayer(l.id);
                }}
                onDragLeave={() => setOverLayer(null)}
                onDrop={(e) => dropOn(l.id, e)}
              >
                <polygon points={pts} />
                <text x={cx} y={(y0 + y1) / 2 - 6} textAnchor="middle" className="py-name">
                  {l.name}
                </text>
                <text x={cx} y={(y0 + y1) / 2 + 13} textAnchor="middle" className="py-en">
                  {l.en}
                  {Object.values(placed).filter((v) => v === l.id).length ? ` · 已钉 ${Object.values(placed).filter((v) => v === l.id).length}` : ''}
                </text>
              </g>
            );
          })}
        </svg>
        <div className="risk-detail" style={cv({ '--c': level.color })}>
          <b>{level.name}</b>
          <p>{level.policy}</p>
          <small>典型系统</small>
          <ul>
            {level.examples.map((e) => (
              <li key={e}>{e}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="app-chips">
        <small className="muted">
          进校准入速查：把应用拖到金字塔的楼层上（放错会滑落），或点一下查看它的层级 · 已归位 {placedCount}/{all.length}
        </small>
        <div className="row wrap">
          {all.map(({ e, id }) => (
            <span
              key={e}
              className={`chip app-chip ${sel === id ? 'on' : ''} ${placed[e] ? 'pinned' : ''} ${falling === e ? 'fall' : ''}`}
              {...pressable(() => setSel(id))}
              draggable={!placed[e]}
              onDragStart={(ev) => {
                ev.dataTransfer.setData('application/x-zhishu-app', e);
                ev.dataTransfer.effectAllowed = 'move';
              }}
              style={placed[e] ? cv({ '--c': RISK_LEVELS.find((l) => l.id === placed[e])?.color ?? 'currentColor' }) : undefined}
            >
              {placed[e] && <i className="pin" aria-hidden />}
              {e}
            </span>
          ))}
          {placedCount > 0 && (
            <button className="btn ghost sm" onClick={() => setPlaced({})}>
              全部取下
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

type Bin = 'red' | 'green';

function PrivacyGame() {
  const [bins, setBins] = useState<Record<string, Bin>>({});
  const [checked, setChecked] = useState(false);
  const [over, setOver] = useState<Bin | 'none' | null>(null);
  const cycle = (id: string) => {
    setChecked(false);
    setBins((b) => {
      const next = { ...b };
      if (!next[id]) next[id] = 'red';
      else if (next[id] === 'red') next[id] = 'green';
      else delete next[id];
      return next;
    });
  };
  const put = (id: string, bin: Bin | 'none') => {
    setChecked(false);
    play('paper');
    setBins((b) => {
      const next = { ...b };
      if (bin === 'none') delete next[id];
      else next[id] = bin;
      return next;
    });
  };
  const placed = Object.keys(bins).length;
  const correct = PRIVACY_CARDS.filter((c) => bins[c.id] === (c.red ? 'red' : 'green')).length;

  const zone = (bin: Bin | 'none') => ({
    onDragOver: (e: DragEvent<HTMLDivElement>) => {
      if (!e.dataTransfer.types.includes('application/x-zhishu-privacy')) return;
      e.preventDefault();
      setOver(bin);
    },
    onDragLeave: () => setOver(null),
    onDrop: (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setOver(null);
      const id = e.dataTransfer.getData('application/x-zhishu-privacy');
      if (id) put(id, bin);
    },
  });

  const card = (c: (typeof PRIVACY_CARDS)[number]) => {
    const b = bins[c.id];
    const wrong = checked && b && b !== (c.red ? 'red' : 'green');
    const right = checked && b && !wrong;
    return (
      <div
        key={c.id}
        className={`p-card ${b ?? ''} ${wrong ? 'wrong' : ''} ${right ? 'right' : ''}`}
        {...pressable(() => cycle(c.id))}
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData('application/x-zhishu-privacy', c.id);
          e.dataTransfer.effectAllowed = 'move';
        }}
        title="拖进红盒 / 绿盒，或点击切换"
      >
        <span className="emoji">{c.emoji}</span>
        <span>{c.text}</span>
        {checked && b && <small>{wrong ? `再想想：${c.why}` : c.why}</small>}
      </div>
    );
  };

  const inBin = (bin: Bin | 'none') => PRIVACY_CARDS.filter((c) => (bin === 'none' ? !bins[c.id] : bins[c.id] === bin));

  return (
    <section className="panel privacy">
      <div className="section-title">
        <span className="eyebrow">TRAFFIC-LIGHT PRIVACY</span>
        <h3>红绿灯隐私卡片</h3>
        <p className="muted">把卡片拖进纸盒：🔴 红盒（绝不告诉 AI）· 🟢 绿盒（可以分享）；拿不准的先留在中间。也可以点击卡片切换。</p>
      </div>
      <div className="p-boxes">
        <div className={`p-box red ${over === 'red' ? 'over' : ''}`} {...zone('red')}>
          <header>
            <span className="bulb" />
            <b>红盒 · 红灯隐私</b>
            <small>{inBin('red').length} 张</small>
          </header>
          <div className="p-box-cards">{inBin('red').map(card)}</div>
        </div>
        <div className={`p-box none ${over === 'none' ? 'over' : ''}`} {...zone('none')}>
          <header>
            <b>未分类</b>
            <small>{inBin('none').length} 张</small>
          </header>
          <div className="p-box-cards">
            {inBin('none').map(card)}
            {!inBin('none').length && <span className="muted small">都分好了，点「核对答案」看看</span>}
          </div>
        </div>
        <div className={`p-box green ${over === 'green' ? 'over' : ''}`} {...zone('green')}>
          <header>
            <span className="bulb" />
            <b>绿盒 · 绿灯信息</b>
            <small>{inBin('green').length} 张</small>
          </header>
          <div className="p-box-cards">{inBin('green').map(card)}</div>
        </div>
      </div>
      <div className="row">
        <button
          className="btn primary"
          onClick={() => {
            play('paper');
            setChecked(true);
          }}
          disabled={!placed}
        >
          核对答案
        </button>
        <button
          className="btn ghost"
          onClick={() => {
            setBins({});
            setChecked(false);
          }}
        >
          重置
        </button>
        {checked && (
          <span className={`verdict-inline ${correct === PRIVACY_CARDS.length ? 'ok' : 'soft-miss'}`}>
            答对 {correct} / {PRIVACY_CARDS.length}
            {correct === PRIVACY_CARDS.length ? ' · 隐私守护者！' : ' · 放错的卡片会轻轻晃一下，读读它的理由再挪一挪'}
          </span>
        )}
      </div>
    </section>
  );
}

function VerifierSim() {
  const { verifier } = useServices();
  const [input, setInput] = useState(VERIFIER_PRESETS[1]);
  const [step, setStep] = useState(-1);
  const [result, setResult] = useState<VerifyResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const runRef = useRef(0);

  const run = async () => {
    const id = ++runRef.current;
    setResult(null);
    setError(null);
    setStep(0);
    try {
      const r = await verifier.check(input);
      if (runRef.current === id) setResult(r);
    } catch (e) {
      if (runRef.current === id) {
        setError(describeError(e));
        setStep(-1);
      }
    }
  };
  // 结果返回前，动画停在“Verifier LLM 审查”环节等待
  const stopAt = result ? (result.passed ? PIPELINE.length : result.stage) : 2;

  useEffect(() => {
    if (step < 0 || step >= stopAt) return;
    const t = window.setTimeout(() => setStep((s) => s + 1), 520);
    return () => window.clearTimeout(t);
  }, [step, stopAt]);

  const finished = result !== null && step >= stopAt;

  return (
    <section className="panel verifier">
      <div className="section-title">
        <span className="eyebrow">VERIFIER LLM · 双层安全校验</span>
        <h3>每一句话都是一个包裹：抵达学生终端前，要过五道闸</h3>
      </div>
      <div className="row wrap">
        {VERIFIER_PRESETS.map((p) => (
          <button
            key={p}
            className={`chip ${input === p ? 'on' : ''}`}
            onClick={() => {
              setInput(p);
              setStep(-1);
              setResult(null);
            }}
          >
            {p.length > 16 ? p.slice(0, 16) + '…' : p}
          </button>
        ))}
      </div>
      <div className="row">
        <input className="search grow" value={input} onChange={(e) => setInput(e.target.value)} />
        <button
          className="btn primary"
          onClick={() => {
            play('paper');
            void run();
          }}
        >
          寄出包裹 · 过五道闸
        </button>
      </div>
      <div className={`pipeline big gates ${finished && result ? (result.passed ? 'passed' : 'blocked') : ''}`}>
        {step >= 0 && (
          <span
            className={`parcel ${finished && result && !result.passed ? 'bounce' : ''}`}
            style={{ left: `${((Math.min(step, PIPELINE.length - 1) + 0.5) / PIPELINE.length) * 100}%` }}
            aria-hidden
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
              <path d="M3.5 7.5 12 3l8.5 4.5v9L12 21l-8.5-4.5z" />
              <path d="M3.5 7.5 12 12l8.5-4.5M12 12v9" />
            </svg>
            {finished && result && (
              <span className="parcel-seal">
                <Seal label={result.passed ? '放行' : '拦截'} size="xs" tone={result.passed ? 'ink' : 'cinnabar'} />
              </span>
            )}
          </span>
        )}
        {PIPELINE.map((p, i) => {
          const blocked = finished && result !== null && !result.passed && i === result.stage;
          const pass = step > i || (finished && result !== null && result.passed);
          const dim = finished && result !== null && !result.passed && i > result.stage;
          return (
            <div key={p} className={`pipe-step ${step === i && !finished ? 'active' : ''} ${pass && !blocked ? 'pass' : ''} ${blocked ? 'block' : ''} ${dim ? 'dim' : ''}`}>
              <span className="mono">{i + 1}</span>
              {p}
            </div>
          );
        })}
      </div>
      {finished && result && (
        <div className={`v-result ${result.passed ? 'pass' : 'block'}`}>
          {result.passed ? (
            <>
              <b>✓ 放行</b>
              <p>{result.layer === 'llm' ? 'Verifier LLM 与规矩清单均未发现风险' : '未触发规矩清单'}，输出已安全送达学生终端。</p>
            </>
          ) : (
            <>
              <b>⛔ 已拦截 · {result.label}</b>
              <p>{result.action}</p>
            </>
          )}
          <small className="v-meta">
            {LAYER_LABEL[result.layer]} · {result.latencyMs} ms
          </small>
        </div>
      )}
      {error && (
        <div className="v-result block">
          <b>校验失败</b>
          <p>{error}</p>
        </div>
      )}
    </section>
  );
}

const LAYER_LABEL: Record<VerifyLayer, string> = {
  rule: '规矩清单 · 规则层',
  llm: 'Verifier LLM · 模型层',
  none: '规矩清单 · 规则层（Mock）',
};

const STAGES = [5, 30, 100];

function ReleaseControl() {
  const [stage, setStage] = useState(0); // 0 = 稳定版；1..3 = 灰度比例
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [rolled, setRolled] = useState<string | null>(null);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(t);
  }, []);

  // 演示用：1 秒 = 1 分钟
  const elapsedMin = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
  const windowLeft = Math.max(0, 30 * 60 - elapsedMin * 60);
  const pctNow = stage ? STAGES[stage - 1] : 0;

  const advance = () => {
    setRolled(null);
    setStage((s) => Math.min(3, s + 1));
    setStartedAt(Date.now());
  };
  const rollback = () => {
    setRolled(`已在第 ${elapsedMin} 分钟一键切回 v1.3 稳定版提示词`);
    setStage(0);
    setStartedAt(null);
  };

  return (
    <section className="panel release">
      <div className="section-title">
        <span className="eyebrow">GRAY RELEASE · ROLLBACK</span>
        <h3>教学提示词灰度发布与 30 分钟回滚窗口</h3>
      </div>
      <div className="versions">
        <div className="ver stable">
          <small>稳定版</small>
          <b>v1.3</b>
          <span className="mono">{100 - pctNow}%</span>
        </div>
        <div className="ver-bar">
          <span className="ver-fill" style={{ width: `${pctNow}%` }} />
          {STAGES.map((s) => (
            <i key={s} style={{ left: `${s}%` }} className={pctNow >= s ? 'on' : ''}>
              <em>{s}%</em>
            </i>
          ))}
        </div>
        <div className="ver canary">
          <small>新版</small>
          <b>v1.4</b>
          <span className="mono">{pctNow}%</span>
        </div>
      </div>
      <div className="rollback-clock">
        <div>
          <small>回滚窗口剩余（演示：1 秒 = 1 分钟）</small>
          <b className={`mono ${stage && windowLeft < 600 ? 'warn-text' : ''}`}>{stage ? fmtClock(windowLeft) : '— —'}</b>
        </div>
        <div className="row">
          <button className="btn primary" onClick={advance} disabled={stage >= 3}>
            {stage === 0 ? '开始灰度 5%' : stage < 3 ? `扩大至 ${STAGES[stage]}%` : '已全量发布'}
          </button>
          <button className="btn danger" onClick={rollback} disabled={stage === 0 || windowLeft === 0}>
            ⟲ 发现异常 · 一键回滚
          </button>
        </div>
      </div>
      {rolled && <div className="v-result pass">✓ {rolled}，课堂教学零事故。</div>}
    </section>
  );
}
