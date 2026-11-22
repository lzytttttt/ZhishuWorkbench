import type { ServiceConfig } from '../services/config';

/**
 * 配线架：谁接在哪个模型上。
 * 只做一件事——让“三堂会审是否真的是三个不同的证人”“Verifier 是否独立”一眼可见。
 * 数据接口页保持克制：不做动画，不做玩法。
 */
export default function PatchBay({ draft }: { draft: ServiceConfig }) {
  const mock = draft.mode === 'mock';
  const def = mock ? 'mock-llm' : draft.defaultModel.trim();
  const resolve = (id: string) => (mock ? 'mock-llm' : id.trim() || def);

  const jacks = [
    ...draft.tribunalModels.map((s, i) => ({ key: `t${i}`, label: s.label || `模型 ${String.fromCharCode(65 + i)}`, sub: '三堂会审', model: resolve(s.id), tone: 'ink' as const })),
    { key: 'tutor', label: '学习伙伴 · 开卷 · 彩排', sub: '默认模型', model: resolve(''), tone: 'ink' as const },
    { key: 'verifier', label: 'Verifier 复核', sub: '安全护栏', model: resolve(draft.verifierModel), tone: 'cinnabar' as const },
    { key: 'rubric', label: '量规预评', sub: '双量规', model: resolve(''), tone: 'ink' as const },
  ];
  const models = [...new Set(jacks.map((j) => j.model))];
  const ROW = 38;
  const H = Math.max(jacks.length, models.length) * ROW + 16;
  const yL = (i: number) => 22 + i * ROW;
  const yR = (i: number) => 22 + i * ROW + ((jacks.length - models.length) * ROW) / 2;
  const LX = 196;
  const RX = 364;
  const short = (s: string) => (s.length > 22 ? `${s.slice(0, 21)}…` : s);

  const tribunal = jacks.slice(0, draft.tribunalModels.length).map((j) => j.model);
  const sameWitness = !mock && new Set(tribunal).size < tribunal.length;
  const verifierShared = !mock && jacks.find((j) => j.key === 'verifier')?.model === def;
  const missing = !mock && !def;

  return (
    <div className="patchbay">
      <div className="pb-title">
        <span className="eyebrow">PATCH BAY · 配线架</span>
        <small className="muted">左边是用途，右边是模型；跳线说明“谁接在哪个模型上”。</small>
      </div>
      <svg viewBox={`0 0 560 ${H}`} className="pb-svg" role="img" aria-label="模型配线架">
        {jacks.map((j, i) => {
          const mi = models.indexOf(j.model);
          const y1 = yL(i);
          const y2 = yR(mi);
          const sag = 18 + Math.abs(y2 - y1) * 0.15;
          return (
            <path
              key={`c-${j.key}`}
              d={`M ${LX} ${y1} C ${LX + 70} ${y1 + sag}, ${RX - 70} ${y2 + sag}, ${RX} ${y2}`}
              className={`pb-cable ${j.tone} ${j.model ? '' : 'loose'}`}
            />
          );
        })}
        {jacks.map((j, i) => (
          <g key={j.key} transform={`translate(0 ${yL(i)})`}>
            <text x={LX - 16} y={-2} textAnchor="end" className="pb-label">
              {j.label}
            </text>
            <text x={LX - 16} y={12} textAnchor="end" className="pb-sub">
              {j.sub}
            </text>
            <circle cx={LX} cy={0} r={6} className={`pb-jack ${j.tone}`} />
          </g>
        ))}
        {models.map((m, i) => (
          <g key={m || 'none'} transform={`translate(0 ${yR(i)})`}>
            <circle cx={RX} cy={0} r={6} className={`pb-jack ${m ? '' : 'empty'}`} />
            <text x={RX + 16} y={4} className={`pb-model mono ${m ? '' : 'missing'}`}>
              <title>{m || '未配置默认模型'}</title>
              {m ? short(m) : '未配置默认模型'}
            </text>
          </g>
        ))}
      </svg>
      {(sameWitness || verifierShared || missing) && (
        <ul className="pb-notes">
          {missing && <li>默认模型还没配置：所有留空的席位都悬空着。</li>}
          {sameWitness && <li>三堂会审里有席位接在同一个模型上——几位“证人”其实是同一个人，交叉验证会失效。</li>}
          {verifierShared && <li>Verifier 与主模型共用同一个模型：可以运行，但“独立复核”的意义会打折扣。</li>}
        </ul>
      )}
      {mock && <p className="muted small pb-mock">Mock 模式下全部接在浏览器内的模拟模型上；切换到真实接口后，跳线会随配置实时变化。</p>}
    </div>
  );
}
