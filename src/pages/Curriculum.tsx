import { useEffect, useMemo, useState } from 'react';
import { LABS, LESSONS, PART_MAP, PARTS, PHASE_MAP, PHASES, PROJECTS, TRACKS, type Lesson } from '../data/curriculum';
import type { PartId } from '../data/types';
import { navigate } from '../hooks/useHashRoute';
import { useApp } from '../store/AppContext';
import { cv } from '../utils/css';

export default function Curriculum({ sub }: { sub?: string }) {
  const [part, setPart] = useState<PartId | 'all'>('all');
  const [view, setView] = useState<'matrix' | 'list'>('matrix');
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
      ) : (
        <div className="lesson-list">
          {lessons.map((l) => (
            <LessonCard key={l.id} lesson={l} wide />
          ))}
          {!lessons.length && <div className="empty">没有符合条件的课程</div>}
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

function LessonCard({ lesson, wide = false }: { lesson: Lesson; wide?: boolean }) {
  const part = PART_MAP[lesson.part];
  return (
    <button className={`lesson-card ${wide ? 'wide' : ''}`} style={cv({ '--c': part.color })} onClick={() => navigate(`curriculum/${lesson.id}`)}>
      <span className="lc-part">{part.name}</span>
      <span className="lc-title">{lesson.title}</span>
      <span className="lc-hook">“{lesson.hook}”</span>
      <span className="lc-meta">
        <span>{lesson.hours} 课时</span>
        {lesson.lab && <span className="lab-flag">⚗ 实验</span>}
        {wide && <span>{PHASE_MAP[lesson.phase].name}</span>}
      </span>
    </button>
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
