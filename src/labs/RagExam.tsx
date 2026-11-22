import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useStream } from '../hooks/useStream';
import { describeError } from '../services/errors';
import { buildClosedBookMessages, buildOpenBookMessages } from '../services/prompts';
import { useServices } from '../services/ServiceContext';
import type { KnowledgeChunk, RetrievalHit } from '../services/types';

const COLLECTION = 'school-history';

const DEFAULT_KB = [
  '知枢实验学校创办于 1956 年，最初只有 3 间平房和 87 名学生。',
  '学校图书馆“澄怀楼”于 2003 年落成，藏书约 12 万册，顶层设有天文观测台。',
  '校训为“问之、探之、断之、创之”，取自首任校长林砚秋先生的手书。',
  '2019 年，学校在操场东侧种下 56 棵银杏树，纪念建校 63 周年。',
  '学校的吉祥物是一只名叫“枢枢”的猫头鹰，寓意夜里也不停止思考。',
  '每年 4 月举办“无 AI 思考日”，全体师生当天只用纸笔完成探究任务。',
].join('\n\n');

const QUESTIONS = ['学校图书馆是哪一年建成的？', '我们的校训是什么？', '学校的吉祥物叫什么？', '学校有没有游泳馆？'];
const PIPE = ['文档切块', '向量化入库', '语义检索匹配', '注入上下文窗口', '生成带引用回答'];
const HONEST_RE = /不知道|不确定|无法确定|没有找到/;
const pace = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));

/* 首屏演示：上一节课的一次提问（静态示例，不调用模型） */
const DEMO = {
  question: QUESTIONS[0],
  closed: '知枢实验学校的图书馆建于 1998 年，是一座五层的现代化建筑，由著名建筑师设计，藏书超过 30 万册。',
  open: '学校图书馆“澄怀楼”于 2003 年落成，藏书约 12 万册【片段 2】。',
  hit: '2',
};

function renderCited(text: string): ReactNode[] {
  return text.split(/(【片段\s*\d+】)/).map((part, i) =>
    /^【片段\s*\d+】$/.test(part) ? (
      <b key={i} className="cite">
        {part}
      </b>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}

export default function RagExam() {
  const { llm, rag, config } = useServices();
  const [kb, setKb] = useState(DEFAULT_KB);
  const [editing, setEditing] = useState(false);
  const [q, setQ] = useState(QUESTIONS[0]);
  const [rtuning, setRtuning] = useState(false);
  const [step, setStep] = useState(-1);
  const [asked, setAsked] = useState('');
  const [hits, setHits] = useState<RetrievalHit[]>([]);
  const [ragError, setRagError] = useState<string | null>(null);
  const closed = useStream();
  const open = useStream();
  const runRef = useRef(0);
  const indexed = useRef<Promise<void>>(Promise.resolve());

  const chunks = useMemo<KnowledgeChunk[]>(
    () =>
      kb
        .split(/\n\s*\n/)
        .map((s) => s.trim())
        .filter(Boolean)
        .map((text, i) => ({ id: String(i + 1), text, source: '校史馆档案' })),
    [kb],
  );

  // 编辑结束后再入库，避免逐字触发远程索引
  useEffect(() => {
    if (editing) return;
    indexed.current = rag.index(COLLECTION, chunks).catch((e: unknown) => {
      setRagError(`知识库入库失败：${describeError(e)}`);
    });
  }, [rag, chunks, editing]);

  const ask = async () => {
    const question = q.trim();
    if (!question) return;
    const id = ++runRef.current;
    const alive = () => runRef.current === id;
    setAsked(question);
    setHits([]);
    setRagError(null);
    open.reset();

    // 闭卷考生：与开卷流程并行
    void closed.run((signal) =>
      llm.stream({
        messages: buildClosedBookMessages(question, rtuning),
        temperature: rtuning ? 0.2 : 0.9,
        scenario: { id: 'rag.closed', question, rtuning },
        signal,
      }),
    );

    // 开卷考生：切块 → 入库 → 检索 → 注入上下文 → 生成
    try {
      setStep(0);
      await pace(360);
      if (!alive()) return;
      setStep(1);
      await indexed.current;
      await pace(360);
      if (!alive()) return;
      setStep(2);
      const found = await rag.search(COLLECTION, question, 2);
      if (!alive()) return;
      setHits(found);
      await pace(360);
      setStep(3);
      const messages = buildOpenBookMessages(question, found);
      await pace(300);
      if (!alive()) return;
      setStep(4);
      await open.run((signal) =>
        llm.stream({ messages, temperature: 0.1, scenario: { id: 'rag.open', question, hits: found }, signal }),
      );
      if (alive()) setStep(PIPE.length);
    } catch (e) {
      if (alive()) {
        setRagError(describeError(e));
        setStep(-1);
      }
    }
  };

  const demo = !asked;
  const hitMap = new Map(hits.map((h) => [h.chunk.id, h.score]));
  const closedHonest = HONEST_RE.test(closed.text);
  const openGrounded = hits.length > 0 && !HONEST_RE.test(open.text);
  const modeLabel = config.mode === 'mock' ? 'Mock 模拟' : config.defaultModel || '未配置模型';

  return (
    <div className="lab rag-lab">
      <div className="rag-ask">
        <div className="row">
          {QUESTIONS.map((x) => (
            <button key={x} className={`chip ${q === x ? 'on' : ''}`} onClick={() => setQ(x)}>
              {x}
            </button>
          ))}
          <div className="spacer" />
          <span className={`mode-tag ${config.mode}`}>{modeLabel}</span>
        </div>
        <div className="row">
          <input
            className="search grow"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && ask()}
            placeholder="向模型提一个关于校史的问题…"
          />
          <button className="btn primary" onClick={ask} disabled={!q.trim() || editing}>
            同时提问两位考生
          </button>
        </div>
      </div>

      <div className="rag-grid">
        <section className="exam closed">
          <header>
            <span className="exam-tag">闭卷裸考</span>
            <b>预训练模型 · 只凭参数记忆</b>
            <label className="toggle inline">
              <input type="checkbox" checked={rtuning} onChange={(e) => setRtuning(e.target.checked)} />
              <span className="tg" />
              <span>R-tuning 拒答训练</span>
            </label>
          </header>
          {demo ? (
            <div className="answer fake demo">
              <span className="demo-ribbon">示例 · 上节课的提问：{DEMO.question}</span>
              <p>{DEMO.closed}</p>
              <span className="stamp">⚠ 未经核查的闭卷回答</span>
            </div>
          ) : asked ? (
            <div className={`answer ${closed.status === 'done' ? (closedHonest ? 'honest' : 'fake') : ''}`}>
              {closed.status === 'error' ? (
                <p className="err">{closed.error}</p>
              ) : (
                <p>
                  {closed.text}
                  {closed.status === 'streaming' && <span className="stream-caret" />}
                </p>
              )}
              {closed.status === 'done' && <span className="stamp">{closedHonest ? '诚实 · 我不知道' : '⚠ 未经核查的闭卷回答'}</span>}
            </div>
          ) : (
            <div className="answer empty">等待提问…</div>
          )}
          <p className="muted small">
            没有挂载资料时，模型为了完成“接龙”任务可能强行编造答案；R-tuning 让它学会在盲区诚实地说“我不知道”。
            {config.mode === 'remote' && '（真实模式下以系统提示词近似模拟拒答训练。）'}
          </p>
        </section>

        <section className="exam open">
          <header>
            <span className="exam-tag">开卷翻书</span>
            <b>RAG 2.0 · 挂载校史馆真实文档</b>
            <span className="muted small">检索：{rag.kind === 'mock' ? '浏览器本地' : '远程 RAG 服务'}</span>
          </header>
          <div className="pipeline">
            {PIPE.map((p, i) => (
              <div key={p} className={`pipe-step ${step === i ? 'active' : ''} ${step > i || demo ? 'pass' : ''}`}>
                <span className="mono">{i + 1}</span>
                {p}
              </div>
            ))}
          </div>
          {demo ? (
            <div className="answer cited demo">
              <span className="demo-ribbon">示例 · 点上方「同时提问两位考生」重演一遍</span>
              <p>{renderCited(DEMO.open)}</p>
              <span className="stamp ok">✓ 有据可查</span>
            </div>
          ) : step >= 0 && step < 4 ? (
            <div className="answer empty">正在翻书…</div>
          ) : (
            <div className={`answer ${open.status === 'done' ? (openGrounded ? 'cited' : 'honest') : ''}`}>
              {open.status === 'error' ? (
                <p className="err">{open.error}</p>
              ) : (
                <p>
                  {renderCited(open.text)}
                  {open.status === 'streaming' && <span className="stream-caret" />}
                </p>
              )}
              {open.status === 'done' && (openGrounded ? <span className="stamp ok">✓ 有据可查</span> : <span className="stamp">诚实 · 资料不足</span>)}
            </div>
          )}
          {ragError && <p className="err small">{ragError}</p>}
        </section>
      </div>

      <section className="kb">
        <div className="kb-head">
          <b>📚 校史馆知识库 · {chunks.length} 个片段</b>
          <button className="btn ghost sm" onClick={() => setEditing((e) => !e)}>
            {editing ? '完成编辑并入库' : '编辑知识库（空行分隔片段）'}
          </button>
        </div>
        {editing ? (
          <textarea className="kb-edit" value={kb} onChange={(e) => setKb(e.target.value)} rows={8} />
        ) : (
          <div className="kb-chunks">
            {chunks.map((c) => {
              const score = demo && c.id === DEMO.hit ? 0.86 : hitMap.get(c.id);
              const hot = (demo || step >= 3) && score !== undefined;
              return (
                <div key={c.id} className={`chunk ${hot ? 'hot' : ''}`}>
                  <span className="chunk-no mono">片段 {c.id}</span>
                  <p>{c.text}</p>
                  {hot && score !== undefined && <span className="chunk-score mono">相似度 {score.toFixed(2)}</span>}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
