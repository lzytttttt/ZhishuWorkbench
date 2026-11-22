import { useEffect, useState } from 'react';
import type { Backend, ServiceConfig, ServiceMode } from '../services/config';
import { createServices } from '../services/container';
import { useServiceConfig } from '../services/ServiceContext';
import { telemetry, useTelemetry, type CallKind } from '../services/telemetry';
import type { HealthReport } from '../services/types';

const CONTRACT: { method: string; path: string; use: string; scenes: string }[] = [
  { method: 'POST', path: '/chat/completions', use: '对话生成（OpenAI 兼容，支持 SSE 流式）', scenes: '开卷考场 · 三堂会审 · 试运行 · Verifier · 量规预评' },
  { method: 'GET', path: '/models', use: '模型列表 / 连通性检测', scenes: '接口设置' },
  { method: 'POST', path: '/rag/index', use: '知识片段入库', scenes: '开卷考场' },
  { method: 'POST', path: '/rag/search', use: '语义检索', scenes: '开卷考场' },
  { method: 'GET', path: '/badcases', use: '读取 Badcase 评估集', scenes: '三堂会审 · 驾驶舱' },
  { method: 'POST', path: '/badcases', use: '批量归档 Badcase', scenes: '三堂会审' },
  { method: 'PATCH', path: '/badcases/:id', use: '推进飞轮状态', scenes: '三堂会审' },
  { method: 'DELETE', path: '/badcases/:id', use: '删除 Badcase', scenes: '三堂会审' },
  { method: 'POST', path: '/classroom/sessions', use: '开课，返回 6 位课堂码', scenes: '课堂直播' },
  { method: 'GET', path: '/classroom/sessions/:code/events', use: '读取课堂事件日志', scenes: '课堂直播 · 学生端' },
  { method: 'POST', path: '/classroom/sessions/:code/events', use: '追加课堂事件', scenes: '课堂直播 · 学生端' },
  { method: 'GET', path: '/classroom/sessions/:code/stream', use: 'SSE 实时推送（事件 + 在线心跳）', scenes: '课堂直播 · 学生端' },
  { method: 'POST', path: '/classroom/sessions/:code/presence', use: '学生在线心跳', scenes: '学生端' },
];

const KIND_LABEL: Record<CallKind, string> = {
  'llm.stream': '生成 · 流式',
  'llm.chat': '生成',
  'rag.index': '检索 · 入库',
  'rag.search': '检索',
  verify: '安全校验',
  rubric: '量规预评',
};

const MODES: { id: ServiceMode; title: string; sub: string; desc: string }[] = [
  { id: 'mock', title: 'Mock 模拟', sub: '纯前端 · 离线可用', desc: '脚本化教学示例 + 模拟流式输出，适合备课预演、无网络课堂与产品演示。' },
  { id: 'remote', title: '真实接口', sub: 'OpenAI 兼容网关', desc: '连接校内网关或本地开源模型服务（vLLM / Ollama 等），Verifier 与量规预评改由大模型执行。' },
];

export default function Settings() {
  const { config, updateConfig, resetConfig } = useServiceConfig();
  const records = useTelemetry();
  const [draft, setDraft] = useState<ServiceConfig>(config);
  const [health, setHealth] = useState<HealthReport | null>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    setDraft(config);
  }, [config]);

  const dirty = JSON.stringify(draft) !== JSON.stringify(config);
  const set = <K extends keyof ServiceConfig>(k: K, v: ServiceConfig[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const setSlot = (i: number, patch: Partial<ServiceConfig['tribunalModels'][number]>) =>
    set(
      'tribunalModels',
      draft.tribunalModels.map((s, j) => (j === i ? { ...s, ...patch } : s)),
    );

  const test = async () => {
    setTesting(true);
    setHealth(null);
    try {
      setHealth(await createServices(draft).health());
    } finally {
      setTesting(false);
    }
  };

  const mockMode = draft.mode === 'mock';

  return (
    <div className="page settings">
      <header className="page-head">
        <div>
          <div className="eyebrow">DATA & API LAYER · 契约优先</div>
          <h1 className="display sm">
            数据与接口 <em>同一套页面，可插拔的“认知心脏”</em>
          </h1>
          <p className="lead">页面只依赖服务契约（LLM / 检索 / 安全校验 / 量规评分 / 持久化）。在 Mock 与真实接口之间切换，无需修改任何页面代码。</p>
        </div>
        <div className="head-tools">
          <button className="btn ghost" onClick={resetConfig}>
            恢复默认
          </button>
          <button className="btn primary" onClick={() => updateConfig(draft)} disabled={!dirty}>
            {dirty ? '保存并应用' : '已应用 ✓'}
          </button>
        </div>
      </header>

      <section className="mode-cards">
        {MODES.map((m) => (
          <button key={m.id} className={`mode-card ${draft.mode === m.id ? 'on' : ''} ${m.id}`} onClick={() => set('mode', m.id)}>
            <span className="mc-dot" />
            <b>{m.title}</b>
            <small>{m.sub}</small>
            <p>{m.desc}</p>
          </button>
        ))}
      </section>

      <div className="set-grid">
        <section className="panel set-card">
          <div className="section-title">
            <span className="eyebrow">MODEL GATEWAY</span>
            <h3>模型网关</h3>
          </div>
          <fieldset className="set-fieldset" disabled={mockMode}>
            <label className="form-row">
              <span>网关地址 Base URL</span>
              <input className="search" value={draft.baseUrl} onChange={(e) => set('baseUrl', e.target.value)} placeholder="/api 或 https://ai-gateway.school.edu.cn/v1" />
            </label>
            <label className="form-row">
              <span>默认模型 ID</span>
              <input className="search" value={draft.defaultModel} onChange={(e) => set('defaultModel', e.target.value)} placeholder="例如 qwen2.5-7b-instruct" />
            </label>
            <label className="form-row">
              <span>Verifier 模型 ID</span>
              <input className="search" value={draft.verifierModel} onChange={(e) => set('verifierModel', e.target.value)} placeholder="留空则使用默认模型（建议使用独立模型）" />
            </label>
            <label className="form-row">
              <span>调试密钥</span>
              <input className="search" type="password" autoComplete="off" value={draft.apiKey} onChange={(e) => set('apiKey', e.target.value)} placeholder="仅本地调试；生产环境请由网关鉴权" />
            </label>
            <p className="note">🔐 密钥只保存在当前标签页的 sessionStorage，关闭即清除。生产环境请勿在浏览器中放置密钥——由校内网关统一鉴权，或使用开发代理注入（见 .env.example）。</p>
            <div className="form-inline">
              <label className="form-row">
                <span>超时（秒）</span>
                <input
                  className="search"
                  type="number"
                  min={3}
                  max={120}
                  value={Math.round(draft.timeoutMs / 1000)}
                  onChange={(e) => set('timeoutMs', Number(e.target.value) * 1000)}
                />
              </label>
              <label className="toggle">
                <input type="checkbox" checked={draft.scenarioHeader} onChange={(e) => set('scenarioHeader', e.target.checked)} />
                <span className="tg" />
                <span>
                  <b>透传业务场景</b>
                  <small>X-Zhishu-Scenario 请求头（直连第三方服务时可关闭）</small>
                </span>
              </label>
            </div>
          </fieldset>
          <div className="row">
            <button className="btn" onClick={test} disabled={testing}>
              {testing ? '检测中…' : '⚡ 测试连接'}
            </button>
            {health && (
              <span className={`verdict-inline ${health.ok ? 'ok' : 'bad'}`}>
                {health.ok ? '✓' : '✗'} {health.message}
                {health.ok && draft.mode === 'remote' ? ` · ${health.latencyMs} ms` : ''}
              </span>
            )}
          </div>
          {health?.models && health.models.length > 0 && draft.mode === 'remote' && (
            <div className="model-list">
              {health.models.slice(0, 18).map((m) => (
                <button key={m} className="chip" onClick={() => set('defaultModel', m)} title="设为默认模型">
                  {m}
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="panel set-card">
          <div className="section-title">
            <span className="eyebrow">TRIBUNAL SEATS</span>
            <h3>三堂会审 · 模型席位</h3>
            <p className="muted">为“多模型交叉验证”配置三个不同底座的模型；模型 ID 留空则使用默认模型。</p>
          </div>
          <fieldset className="set-fieldset" disabled={mockMode}>
            {draft.tribunalModels.map((s, i) => (
              <div key={i} className="slot-row">
                <span className="slot-no mono">{String.fromCharCode(65 + i)}</span>
                <input className="search" value={s.label} onChange={(e) => setSlot(i, { label: e.target.value })} placeholder="席位名称" />
                <input className="search" value={s.base} onChange={(e) => setSlot(i, { base: e.target.value })} placeholder="底座描述" />
                <input className="search mono" value={s.id} onChange={(e) => setSlot(i, { id: e.target.value })} placeholder="模型 ID" />
              </div>
            ))}
          </fieldset>

          <div className="section-title" style={{ marginTop: 18 }}>
            <span className="eyebrow">RETRIEVAL & PERSISTENCE</span>
            <h3>检索与持久化</h3>
          </div>
          <fieldset className="set-fieldset" disabled={mockMode}>
            <BackendSwitch label="RAG 检索" value={draft.ragBackend} onChange={(v) => set('ragBackend', v)} local="浏览器本地二元组检索" remote="远程 /rag 服务（向量检索）" />
            <BackendSwitch label="Badcase 库" value={draft.persistence} onChange={(v) => set('persistence', v)} local="本机 localStorage" remote="远程 /badcases（班级共享评估集）" />
            <BackendSwitch
              label="课堂同步"
              value={draft.classroom}
              onChange={(v) => set('classroom', v)}
              local="本机多标签页（BroadcastChannel）"
              remote="远程 /classroom（跨设备 · SSE 实时推送）"
            />
          </fieldset>
        </section>
      </div>

      <section className="panel tele-panel">
        <div className="tele-head">
          <div className="section-title">
            <span className="eyebrow">CALL LOG · AI 使用透明度</span>
            <h3>调用日志</h3>
            <p className="muted">本次会话中每一次 AI 调用的场景、模型、耗时与结果——也可作为课堂上讲解“AI 使用透明度声明”的素材。</p>
          </div>
          <button className="btn ghost sm" onClick={() => telemetry.clear()} disabled={!records.length}>
            清空
          </button>
        </div>
        {records.length ? (
          <div className="tele-wrap">
            <table className="tele">
              <thead>
                <tr>
                  <th>时间</th>
                  <th>类型</th>
                  <th>场景</th>
                  <th>模型</th>
                  <th>耗时</th>
                  <th>Tokens</th>
                  <th>状态</th>
                  <th>说明</th>
                </tr>
              </thead>
              <tbody>
                {records.map((r) => (
                  <tr key={r.id} className={r.status}>
                    <td className="mono">{new Date(r.at).toLocaleTimeString('zh-CN', { hour12: false })}</td>
                    <td>{KIND_LABEL[r.kind]}</td>
                    <td className="mono">{r.scenario ?? '—'}</td>
                    <td className="mono">{r.model ?? '默认'}</td>
                    <td className="mono">{r.latencyMs} ms</td>
                    <td className="mono">{r.tokens ?? '—'}</td>
                    <td>
                      <span className={`st ${r.status}`}>{r.status === 'ok' ? '成功' : r.status === 'aborted' ? '取消' : '失败'}</span>
                    </td>
                    <td className="tele-detail">{r.detail ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty">还没有调用记录。去“降维实验室 · 开卷考场”或“三堂会审”试一试。</div>
        )}
      </section>

      <section className="panel contract">
        <div className="section-title">
          <span className="eyebrow">API CONTRACT · docs/API.md</span>
          <h3>后端接口契约</h3>
          <p className="muted">
            相对于网关地址 <code className="mono">{draft.baseUrl || '/api'}</code>。错误统一返回 HTTP 状态码 + <code className="mono">{'{ error: { code, message } }'}</code>。
          </p>
        </div>
        <div className="contract-list">
          {CONTRACT.map((c) => (
            <div key={c.method + c.path} className="contract-row">
              <span className={`method m-${c.method.toLowerCase()}`}>{c.method}</span>
              <code className="mono">{c.path}</code>
              <span>{c.use}</span>
              <small className="muted">{c.scenes}</small>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function BackendSwitch({
  label,
  value,
  onChange,
  local,
  remote,
}: {
  label: string;
  value: Backend;
  onChange: (v: Backend) => void;
  local: string;
  remote: string;
}) {
  return (
    <div className="backend-row">
      <span>{label}</span>
      <div className="segmented">
        <button type="button" className={value === 'local' ? 'on' : ''} onClick={() => onChange('local')}>
          本地
        </button>
        <button type="button" className={value === 'remote' ? 'on' : ''} onClick={() => onChange('remote')}>
          远程
        </button>
      </div>
      <small className="muted">{value === 'local' ? local : remote}</small>
    </div>
  );
}
