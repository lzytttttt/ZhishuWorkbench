import type { ReactElement } from 'react';
import { LABS, LESSONS, PART_MAP } from '../data/curriculum';
import type { LabId } from '../data/types';
import { navigate } from '../hooks/useHashRoute';
import AttentionThreads from '../labs/AttentionThreads';
import DiffusionCanvas from '../labs/DiffusionCanvas';
import EmbeddingLab from '../labs/EmbeddingLab';
import RagExam from '../labs/RagExam';
import TemperatureDice from '../labs/TemperatureDice';
import TokenScissors from '../labs/TokenScissors';
import { cv } from '../utils/css';

const RENDER: Record<LabId, () => ReactElement> = {
  tokenizer: () => <TokenScissors />,
  dice: () => <TemperatureDice />,
  attention: () => <AttentionThreads />,
  embedding: () => <EmbeddingLab />,
  diffusion: () => <DiffusionCanvas />,
  rag: () => <RagExam />,
};

export default function Labs({ sub }: { sub?: string }) {
  const meta = LABS.find((l) => l.id === sub) ?? LABS[0];
  const part = PART_MAP[meta.part];
  const usedBy = LESSONS.filter((l) => l.lab === meta.id || (meta.id === 'attention' && l.id === 'vector'));

  return (
    <div className="page labs wide">
      <nav className="lab-tabs">
        {LABS.map((l, i) => (
          <a key={l.id} href={`#/labs/${l.id}`} className={`lab-tab ${meta.id === l.id ? 'on' : ''}`} title={`${l.name} · ${l.concept}`} aria-current={meta.id === l.id ? 'page' : undefined} style={cv({ '--c': PART_MAP[l.part].color })}>
            <span className="no mono">{String(i + 1).padStart(2, '0')}</span>
            <b>{l.name}</b>
            <small>{l.concept}</small>
          </a>
        ))}
      </nav>

      <section className="lab-head" style={cv({ '--c': part.color })}>
        <div>
          <div className="eyebrow">PEDAGOGICAL REDUCTION · 物理隐喻 → 无插电博弈 → 可视化沙盒</div>
          <h1 className="display sm">
            {meta.name} <em>“{meta.metaphor}”</em>
          </h1>
          <p className="lead">{meta.desc}</p>
        </div>
        {usedBy.length > 0 && (
          <div className="used-by">
            <small>用于课程</small>
            {usedBy.map((l) => (
              <button key={l.id} className="chip" onClick={() => navigate(`curriculum/${l.id}`)}>
                {l.title}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="lab-body panel" key={meta.id}>
        {RENDER[meta.id]()}
      </section>
    </div>
  );
}
