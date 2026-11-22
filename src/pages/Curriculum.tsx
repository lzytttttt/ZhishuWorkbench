import { useEffect, useMemo, useState, type DragEvent, type MouseEvent } from 'react';
import { EmptyState } from '../fun/LineArt';
import { MARK_META, useLessonMarks, type MarkKind } from '../fun/marks';
import { pressable } from '../fun/pressable';
import { play } from '../fun/sound';
import { Seal, useStamp } from '../fun/Stamp';
import { LABS, LESSONS, PART_MAP, PARTS, PHASE_MAP, PHASES, PROJECTS, TRACKS, type Lesson } from '../data/curriculum';
import type { PartId } from '../data/types';
import { navigate } from '../hooks/useHashRoute';
import { useApp } from '../store/AppContext';
import { cv } from '../utils/css';

export default function Curriculum({ sub }: { sub?: string }) {
  const [part, setPart] = useState<PartId | 'all'>('all');
  const [view, setView] = useState<'matrix' | 'spiral' | 'list'>('matrix');
  const [query, setQuery] = useState('');
  const open = LESSONS.find((l) => l.id === sub);

  const lessons = useMemo(
    () =>
      LESSONS.filter((l) => (part === 'all' || l.part === part) && (!query || `${l.title}${l.hook}${l.concepts.join('')}`.includes(query))),
    [part, query],
  );

  return (
    <div className="page curriculum">
      <header className="page-head">
        <div>
          <div className="eyebrow">SPIRAL CURRICULUM MATRIX</div>
          <h1 className="display sm">
            课程螺旋矩阵 <em>不按年级，按认知深度</em>
          </h1>
          <p className="lead">纵轴是“感知体验 → 提示词工程 → 上下文工程 → 工作流工程”的范式演进，横轴是“提问 → 探究 → 判断 → 创造”的螺旋认知环。</p>
        </div>
        <div className="head-tools">
          <input className="search" placeholder="搜索课程 / 概念…" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="segmented">
            <button className={view === 'matrix' ? 'on' : ''} onClick={() => setView('matrix')}>
              矩阵
            </button>
            <button className={view === 'spiral' ? 'on' : ''} onClick={() => setView('spiral')} title="把四条范式轨道卷成一条认知螺旋">
              螺旋
            </button>
            <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}>
              列表
            </button>
          </div>
        </div>
      </header>

      <div className="filters">
        <button className={`chip ${part === 'all' ? 'on' : ''}`} onClick={() => setPart('all')}>
          全部零件
        </button>
        {PARTS.map((p) => (
          <button key={p.id} className={`chip marker ${part === p.id ? 'on' : ''}`} style={cv({ '--c': p.color })} onClick={() => setPart(p.id)}>
            <i />
            {p.name} <small>{p.en}</small>
          </button>
        ))}
      </div>

      <RouteTray />

      {view === 'matrix' ? (
        <div className="matrix panel">
          <div className="m-corner">
            <span>范式轨道 ↓</span>
            <span>螺旋阶段 →</span>
          </div>
          {PHASES.map((ph, i) => (
            <div key={ph.id} className="m-head" style={cv({ '--c': ph.color })}>
              <span className="idx">0{i + 1}</span>
              <b>{ph.name}</b>
              <small>
                {ph.en} · {ph.role}
              </small>
            </div>
          ))}
          {TRACKS.map((tr, ti) => (
            <MatrixRow key={tr.id} trackIndex={ti} lessons={lessons} />
          ))}
        </div>
      ) : view === 'spiral' ? (
        <SpiralView visible={new Set(lessons.map((l) => l.id))} />
      ) : (
        <div className="lesson-list">
          {lessons.map((l) => (
            <LessonCard key={l.id} lesson={l} wide />
          ))}
          {!lessons.length && <EmptyState kind="magnifier" title="放大镜下什么也没找到" hint="换个关键词，或者清空零件筛选。" />}
        </div>
      )}

      <section className="projects">
        <div className="section-title">
          <span className="eyebrow">PROJECT-BASED LEARNING · 8 课时拓展</span>
          <h3>跨学科项目：先跑起来，再回头学走路</h3>
        </div>
        <div className="project-grid">
          {PROJECTS.map((p) => (
            <article key={p.id} className="project panel" style={cv({ '--c': PART_MAP[p.part].color })}>
              <header>
                <h4>{p.title}</h4>
                <div className="disc">
                  {p.disciplines.map((d) => (
                    <span key={d} className="tag">
                      {d}
                    </span>
                  ))}
                </div>
              </header>
              <ol className="steps">
                {p.steps.map((s, i) => (
                  <li key={i} className={`step ${s.aiFree ? 'aifree' : ''}`} style={cv({ '--c': PHASE_MAP[s.phase].color })}>
                    <span className="step-phase">{PHASE_MAP[s.phase].name}</span>
                    <span className="step-label">{s.label}</span>
                    {s.aiFree && <span className="aifree-badge">AI-Free</span>}
                  </li>
                ))}
              </ol>
              <footer>
                <div>
                  <small>交付物</small>
                  {p.deliverable}
                </div>
                <div>
                  <small>防退化硬约束</small>
                  {p.guard}
                </div>
              </footer>
            </article>
          ))}
        </div>
      </section>

      {open && <LessonDrawer lesson={open} onClose={() => navigate('curriculum')} />}
    </div>
  );
}

function MatrixRow({ trackIndex, lessons }: { trackIndex: number; lessons: Lesson[] }) {
  const tr = TRACKS[trackIndex];
  return (
    <>
      <div className="m-track">
        <span className="lvl">L{trackIndex + 1}</span>
        <b>{tr.name}</b>
        <small>{tr.en}</small>
        <p>{tr.desc}</p>
      </div>
      {PHASES.map((ph) => {
        const cell = lessons.filter((l) => l.track === tr.id && l.phase === ph.id);
        return (
          <div key={ph.id} className="m-cell">
            {cell.map((l) => (
              <LessonCard key={l.id} lesson={l} />
            ))}
          </div>
        );
      })}
    </>
  );
}

/* 螺旋图：四条范式轨道（L1→L4）由内向外卷成一条螺旋，每一圈依次经过“提问 → 探究 → 判断 → 创造”四个象限 */
const SP = { size: 760, c: 380, r0: 92, r1: 336 };
const QUARTERS = TRACKS.length * PHASES.length;
const spR = (u: number) => SP.r0 + ((SP.r1 - SP.r0) * u) / QUARTERS;
const spXY = (u: number, r = spR(u)) => {
  const a = (u * Math.PI) / 2 - Math.PI / 2;
  return { x: SP.c + Math.cos(a) * r, y: SP.c + Math.sin(a) * r, a };
};

function SpiralView({ visible }: { visible: Set<string> }) {
  const marks = useLessonMarks();
  const [hover, setHover] = useState<string | null>(null);
  const stations = TRACKS.flatMap((tr, ti) =>
    PHASES.flatMap((ph, pi) => {
      const cell = LESSONS.filter((l) => l.track === tr.id && l.phase === ph.id);
      return cell.map((l, k) => ({ l, u: ti * PHASES.length + pi + (k + 0.5) / cell.length }));
    }),
  );
  const segs = Array.from({ length: QUARTERS }, (_, q) => {
    const pts: string[] = [];
    for (let u = q; u <= q + 1.0001; u += 0.05) {
      const p = spXY(u);
      pts.push(`${p.x.toFixed(1)},${p.y.toFixed(1)}`);
    }
    return { q, d: `M${pts.join(' L')}`, color: PHASES[q % PHASES.length].color };
  });
  const hovered = stations.find((s) => s.l.id === hover);

  return (
    <section className="spiral panel">
      <svg viewBox={`0 0 ${SP.size} ${SP.size}`} className="spiral-svg" role="img" aria-label="课程螺旋图：由内向外依次是感知体验、提示词工程、上下文工程、工作流工程四条轨道">
        {PHASES.map((ph, pi) => {
          const a = (pi * Math.PI) / 2 - Math.PI / 2;
          const mid = a + Math.PI / 4;
          return (
            <g key={ph.id}>
              <line x1={SP.c} y1={SP.c} x2={SP.c + Math.cos(a) * (SP.r1 + 24)} y2={SP.c + Math.sin(a) * (SP.r1 + 24)} className="sp-axis" />
              <text x={SP.c + Math.cos(mid) * (SP.r1 + 30)} y={SP.c + Math.sin(mid) * (SP.r1 + 30)} textAnchor="middle" dominantBaseline="middle" className="sp-phase" style={{ fill: ph.color }}>
                {ph.name}
                <tspan x={SP.c + Math.cos(mid) * (SP.r1 + 30)} dy="16" className="sp-phase-en">
                  {ph.role}
                </tspan>
              </text>
            </g>
          );
        })}
        {segs.map((s) => (
          <path key={s.q} d={s.d} className="sp-track" style={{ stroke: s.color }} />
        ))}
        {TRACKS.map((tr, ti) => {
          const p = spXY(ti * PHASES.length);
          return (
            <text key={tr.id} x={p.x - 8} y={p.y - 8} textAnchor="end" className="sp-ring">
              L{ti + 1} {tr.name}
            </text>
          );
        })}
        <g className="sp-core">
          <circle cx={SP.c} cy={SP.c} r={46} />
          <text x={SP.c} y={SP.c - 4} textAnchor="middle">
            认知心脏
          </text>
          <text x={SP.c} y={SP.c + 14} textAnchor="middle" className="sp-core-en">
            LLM
          </text>
        </g>
        {stations.map(({ l, u }) => {
          const p = spXY(u);
          const lp = spXY(u, spR(u) + 20);
          const right = Math.cos(p.a) >= 0;
          const on = visible.has(l.id);
          const seals = (['taught', 'verified', 'badcase'] as MarkKind[]).filter((k) => marks[k].includes(l.id));
          return (
            <g
              key={l.id}
              className={`sp-station ${on ? '' : 'dim'} ${hover === l.id ? 'hover' : ''}`}
              transform={`translate(${p.x} ${p.y})`}
              style={cv({ '--c': PART_MAP[l.part].color })}
              {...pressable(() => navigate(`curriculum/${l.id}`))}
              aria-label={`${l.title}（${PHASE_MAP[l.phase].name}）`}
              onMouseEnter={() => setHover(l.id)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(l.id)}
              onBlur={() => setHover(null)}
            >
              <circle r={8} className="sp-dot" />
              {seals.length > 0 && <circle r={12} className="sp-sealed" />}
              <text x={lp.x - p.x} y={lp.y - p.y} textAnchor={right ? 'start' : 'end'} dominantBaseline="middle" className="sp-label">
                {Array.from(l.title).length > 9 ? `${Array.from(l.title).slice(0, 9).join('')}…` : l.title}
              </text>
            </g>
          );
        })}
      </svg>
      <aside className="sp-side">
        {hovered ? (
          <div className="sp-card" style={cv({ '--c': PART_MAP[hovered.l.part].color })}>
            <small>
              {PART_MAP[hovered.l.part].name} · {PHASE_MAP[hovered.l.phase].name} · {TRACKS.find((t) => t.id === hovered.l.track)?.name}
            </small>
            <b>{hovered.l.title}</b>
            <p>“{hovered.l.hook}”</p>
            <span className="muted small">{hovered.l.hours} 课时 · 点击站点查看详情</span>
          </div>
        ) : (
          <div className="sp-card idle">
            <b>沿着螺旋走</b>
            <p>由内向外，每一圈都把“提问 → 探究 → 判断 → 创造”再走一遍，只是认知更深一层。</p>
            <span className="muted small">悬停站点看钩子；带朱砂圈的站点已盖过章。矩阵仍是默认视图。</span>
          </div>
        )}
      </aside>
    </section>
  );
}

const MARK_KINDS: MarkKind[] = ['taught', 'verified', 'badcase'];
const ROUTE_KEY = 'zhishu.v1.unitRoute';
const ROUTE_EVENT = 'zhishu:route';

function readRoute(): string[] {
  try {
    const raw = localStorage.getItem(ROUTE_KEY);
    const v = raw ? (JSON.parse(raw) as string[]) : [];
    return Array.isArray(v) ? v.filter((id) => LESSONS.some((l) => l.id === id)).slice(0, 4) : [];
  } catch {
    return [];
  }
}
function writeRoute(ids: string[]) {
  try {
    localStorage.setItem(ROUTE_KEY, JSON.stringify(ids.slice(0, 4)));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(ROUTE_EVENT));
}
function useRoute(): [string[], (ids: string[]) => void] {
  const [ids, setIds] = useState<string[]>(readRoute);
  useEffect(() => {
    const f = () => setIds(readRoute());
    window.addEventListener(ROUTE_EVENT, f);
    return () => window.removeEventListener(ROUTE_EVENT, f);
  }, []);
  return [ids, writeRoute];
}

/* 课卡：正面看课题，翻面看钩子；可以拖进“本单元路线”托盘 */
function LessonCard({ lesson, wide = false }: { lesson: Lesson; wide?: boolean }) {
  const part = PART_MAP[lesson.part];
  const marks = useLessonMarks();
  const [route, setRoute] = useRoute();
  const inRoute = route.includes(lesson.id);
  const seals = MARK_KINDS.filter((k) => marks[k].includes(lesson.id));
  const addToRoute = (e: MouseEvent) => {
    e.stopPropagation();
    if (inRoute || route.length >= 4) return;
    play('paper');
    setRoute([...route, lesson.id]);
  };

  return (
    <div
      className={`lesson-card-wrap ${wide ? 'wide' : ''} ${inRoute ? 'in-route' : ''}`}
      draggable
      onDragStart={(e: DragEvent<HTMLDivElement>) => {
        e.dataTransfer.setData('application/x-zhishu-lesson', lesson.id);
        e.dataTransfer.setData('text/plain', lesson.title);
        e.dataTransfer.effectAllowed = 'copy';
      }}
    >
      <div className={`lesson-card flip ${wide ? 'wide' : ''}`} style={cv({ '--c': part.color })} {...pressable(() => navigate(`curriculum/${lesson.id}`))} aria-label={`${lesson.title}：${lesson.hook}`}>
        <span className="lc-inner">
          <span className="lc-face front">
            <span className="lc-part">{part.name}</span>
            <span className="lc-title">{lesson.title}</span>
            {wide && <span className="lc-hook">“{lesson.hook}”</span>}
            <span className="lc-meta">
              <span>{lesson.hours} 课时</span>
              {lesson.lab && <span className="lab-flag">⚗ 实验</span>}
              {wide && <span>{PHASE_MAP[lesson.phase].name}</span>}
            </span>
          </span>
          {!wide && (
            <span className="lc-face back" aria-hidden>
              <small>钩子</small>
              <span className="lc-hook">“{lesson.hook}”</span>
            </span>
          )}
        </span>
        {seals.length > 0 && (
          <span className="lc-seals" aria-label={seals.map((k) => MARK_META[k].label).join('、')}>
            {seals.map((k) => (
              <span key={k} title={MARK_META[k].label}>
                <Seal label={MARK_META[k].seal} size="xs" tone={k === 'badcase' ? 'ink' : 'cinnabar'} />
              </span>
            ))}
          </span>
        )}
      </div>
      <button className="lc-add" onClick={addToRoute} disabled={inRoute || route.length >= 4} title={inRoute ? '已在本单元路线中' : '加入本单元路线（也可以直接拖过去）'} aria-label={`把「${lesson.title}」加入本单元路线`}>
        {inRoute ? '✓' : '+'}
      </button>
    </div>
  );
}

/* 本单元路线：拖 3–4 张课卡进来，像地铁线一样串起来，直接进入备课 */
function RouteTray() {
  const [route, setRoute] = useRoute();
  const [over, setOver] = useState(false);
  const { choosePlanLesson } = useApp();
  const { stamp } = useStamp();
  const lessons = route.map((id) => LESSONS.find((l) => l.id === id)).filter((l): l is Lesson => Boolean(l));

  const drop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setOver(false);
    const id = e.dataTransfer.getData('application/x-zhishu-lesson');
    if (!id || route.includes(id) || route.length >= 4) return;
    play('paper');
    setRoute([...route, id]);
  };
  const remove = (id: string) => setRoute(route.filter((x) => x !== id));
  const go = (e: MouseEvent<HTMLButtonElement>) => {
    if (!lessons.length) return;
    stamp({ label: '定线', target: `本单元路线：${lessons.map((l) => l.title).join(' → ')}`, at: e.currentTarget });
    choosePlanLesson(lessons[0].id);
    window.setTimeout(() => navigate('composer'), 450);
  };

  return (
    <section
      className={`route-tray panel ${over ? 'over' : ''} ${lessons.length ? 'filled' : ''}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes('application/x-zhishu-lesson')) {
          e.preventDefault();
          setOver(true);
        }
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
    >
      <div className="rt-head">
        <span className="eyebrow">UNIT ROUTE · 备课篮</span>
        <b>本单元路线</b>
        <small className="muted">把 3–4 张课卡拖进来（或点卡片右上角的 +），串成一条线，直接生成备课计划。</small>
      </div>
      <ol className="rt-line">
        {Array.from({ length: 4 }, (_, i) => {
          const l = lessons[i];
          return (
            <li key={l?.id ?? `slot-${i}`} className={`rt-stop ${l ? 'on' : ''}`} style={l ? cv({ '--c': PART_MAP[l.part].color }) : undefined}>
              <i className="rt-dot" aria-hidden />
              {l ? (
                <span className="rt-card">
                  <small className="mono">第 {i + 1} 站</small>
                  <b>{l.title}</b>
                  <button onClick={() => remove(l.id)} aria-label={`从路线中移除「${l.title}」`}>
                    ×
                  </button>
                </span>
              ) : (
                <span className="rt-empty">空站</span>
              )}
            </li>
          );
        })}
      </ol>
      <div className="rt-actions">
        <span className="mono muted small">{lessons.reduce((a, l) => a + l.hours, 0)} 课时</span>
        <button className="btn primary sm" onClick={go} disabled={lessons.length < 3}>
          {lessons.length < 3 ? `再拖 ${3 - lessons.length} 张` : '定线 · 从第 1 站开始备课 →'}
        </button>
      </div>
    </section>
  );
}

function LessonDrawer({ lesson, onClose }: { lesson: Lesson; onClose: () => void }) {
  const { choosePlanLesson } = useApp();
  const part = PART_MAP[lesson.part];
  const phase = PHASE_MAP[lesson.phase];
  const lab = LABS.find((l) => l.id === lesson.lab);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="drawer-mask" onClick={onClose}>
      <aside className="drawer" style={cv({ '--c': part.color })} onClick={(e) => e.stopPropagation()}>
        <button className="drawer-close" onClick={onClose} aria-label="关闭">
          ×
        </button>
        <div className="eyebrow">
          {part.name} · {phase.name} · {TRACKS.find((t) => t.id === lesson.track)?.name}
        </div>
        <h2 className="drawer-title">{lesson.title}</h2>
        <p className="drawer-hook">“{lesson.hook}”</p>

        <div className="drawer-block metaphor">
          <small>教学化降维隐喻</small>
          <p>{lesson.metaphor}</p>
        </div>

        <div className="drawer-grid">
          <div className="drawer-block">
            <small>无插电活动</small>
            <p>{lesson.unplugged}</p>
          </div>
          <div className="drawer-block aifree">
            <small>AI-Free 能力锚点</small>
            <p>{lesson.aiFreeHint}</p>
          </div>
        </div>

        <div className="drawer-block">
          <small>核心概念</small>
          <div className="concepts">
            {lesson.concepts.map((c) => (
              <span key={c} className="tag">
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="drawer-block">
          <small>学生角色</small>
          <p>
            <b style={{ color: phase.color }}>{phase.role}</b> · {phase.desc}
          </p>
        </div>

        <div className="drawer-actions">
          <button
            className="btn primary"
            onClick={() => {
              choosePlanLesson(lesson.id);
              navigate('composer');
            }}
          >
            以此课开始备课 →
          </button>
          {lab && (
            <button className="btn ghost" onClick={() => navigate(`labs/${lab.id}`)}>
              ⚗ 打开「{lab.name}」实验
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
