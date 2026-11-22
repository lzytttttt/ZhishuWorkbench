import type { ReactElement } from 'react';
import { LABS, LESSONS, PART_MAP } from '../data/curriculum';
import type { LabId } from '../data/types';
import PageHeader from '../components/PageHeader';
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
  const tabs = LABS.map((l) => ({ id: l.id, label: l.name, hint: `${l.concept} · ${l.metaphor}`, color: PART_MAP[l.part].color }));

  return (
    <div className="page labs wide">
      <PageHeader
        route="labs"
        title="降维实验室"
        desc={
          <>
            <span className="lab-metaphor" style={cv({ '--c': part.color })}>
              “{meta.metaphor}”
            </span>
            {meta.desc}
          </>
        }
        tabs={tabs}
        active={meta.id}
        tools={
          usedBy.length > 0 && (
            <div className="used-by">
              <small>用于课程</small>
              {usedBy.map((l) => (
                <button key={l.id} className="chip" onClick={() => navigate(`curriculum/${l.id}`)}>
                  {l.title}
                </button>
              ))}
            </div>
          )
        }
      />

      <section className="lab-body panel" key={meta.id}>
        {RENDER[meta.id]()}
      </section>
    </div>
  );
}
