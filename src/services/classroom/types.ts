/* ==========================================================================
 * 课堂实时同步：事件溯源（Event Sourcing）模型
 * 教师与学生只追加事件，课堂状态由 reducer 从事件日志推导——
 * 晚加入的学生、断线重连的设备都能得到一致的课堂状态。
 * ========================================================================== */
import type { PromptFunction } from '../../data/rubric';
import type { BadcaseKind } from '../../data/types';
import type { ProviderKind } from '../types';

export interface Participant {
  id: string;
  /** 只使用昵称，禁止真实姓名（红灯隐私） */
  nickname: string;
  avatar: string;
  joinedAt: number;
}

export interface PollActivity {
  kind: 'poll';
  id: string;
  question: string;
  options: string[];
  /** 有标准答案的知识投票；观点投票不设置 */
  answer?: number;
  startedAt: number;
}
export interface AuditActivity {
  kind: 'audit';
  id: string;
  caseId: string;
  startedAt: number;
}
export interface ChatActivity {
  kind: 'chat';
  id: string;
  lessonId: string;
  fn: PromptFunction['id'];
  startedAt: number;
}
export type Activity = PollActivity | AuditActivity | ChatActivity;

export interface Submission {
  id: string;
  studentId: string;
  nickname: string;
  caseId: string;
  modelIndex: number;
  sentenceIndex: number;
  model: string;
  excerpt: string;
  kind: BadcaseKind;
  /** 认知强化：学生必须写出核查依据 */
  reason: string;
  ts: number;
}

export type ReviewStatus = 'pending' | 'accepted' | 'rejected';
export interface Review {
  status: Exclude<ReviewStatus, 'pending'>;
  comment?: string;
  ts: number;
}

export type ClassEvent =
  | { type: 'session.open'; lessonId: string }
  | { type: 'session.close' }
  | { type: 'student.join'; student: Participant }
  | { type: 'activity.start'; activity: Activity }
  | { type: 'activity.stop' }
  | { type: 'poll.vote'; activityId: string; option: number }
  | { type: 'poll.reveal'; activityId: string; reveal: boolean }
  | { type: 'aifree.set'; on: boolean; task?: string }
  | { type: 'badcase.submit'; submission: Submission }
  | { type: 'badcase.review'; submissionIds: string[]; status: 'accepted' | 'rejected'; comment?: string }
  | { type: 'usage.report'; prompts: number; blocked: number };

export type ClassEventType = ClassEvent['type'];

/** 事件信封：actor 为 'teacher' 或学生 id。真实后端必须由服务端根据身份令牌填写 actor */
export interface Envelope {
  id: string;
  ts: number;
  actor: string;
  event: ClassEvent;
}

export interface ClassState {
  code: string;
  open: boolean;
  lessonId: string;
  openedAt: number;
  closedAt?: number;
  students: Participant[];
  activity: Activity | null;
  votes: Record<string, Record<string, number>>;
  revealed: Record<string, boolean>;
  aiFree: { on: boolean; task?: string; since?: number };
  submissions: Submission[];
  reviews: Record<string, Review>;
  usage: Record<string, { prompts: number; blocked: number }>;
  eventCount: number;
}

export type ChannelStatus = 'live' | 'reconnecting';

export interface ClassHandlers {
  onEvents(envs: Envelope[]): void;
  onPresence?(studentId: string, at: number): void;
  onStatus?(status: ChannelStatus): void;
}

export interface ClassroomService {
  readonly kind: ProviderKind;
  /** 教师开课，返回 6 位课堂码 */
  create(lessonId: string): Promise<string>;
  /** 读取完整事件日志；课堂不存在时返回 null */
  load(code: string, signal?: AbortSignal): Promise<Envelope[] | null>;
  publish(code: string, actor: string, event: ClassEvent): Promise<Envelope>;
  subscribe(code: string, handlers: ClassHandlers): () => void;
  /** 在线心跳：只广播、不入日志 */
  ping(code: string, studentId: string): Promise<void>;
}
