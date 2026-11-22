export type PartId = 'heart' | 'senses' | 'fuel' | 'limbs' | 'brake';
export type PhaseId = 'question' | 'inquiry' | 'judgment' | 'creation';
export type TrackId = 'perceive' | 'prompt' | 'context' | 'flow';
export type LabId = 'tokenizer' | 'dice' | 'attention' | 'embedding' | 'diffusion' | 'rag';

export type SegmentType = 'intro' | 'aifree' | 'unplugged' | 'ai' | 'judge';
export interface Segment {
  id: string;
  title: string;
  minutes: number;
  type: SegmentType;
}

export type BadcaseKind = 'hallucination' | 'logic' | 'bias' | 'format';
export type BadcaseStatus = 'found' | 'attributed' | 'fixed' | 'regression';
export interface Badcase {
  id: string;
  question: string;
  model: string;
  excerpt: string;
  kind: BadcaseKind;
  status: BadcaseStatus;
  createdAt: number;
}
export type NewBadcase = Omit<Badcase, 'id' | 'createdAt' | 'status'>;

export interface WordVec {
  name: string;
  v: [number, number, number];
  custom?: boolean;
}
