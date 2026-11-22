import type { ReactNode } from 'react';

/** 器物线稿：线轴、放大镜、打开的书、听诊器、印章、合上的本子、骰子、剪刀 */
export type ArtKind = 'spool' | 'magnifier' | 'book' | 'stethoscope' | 'seal' | 'notebook' | 'dice' | 'scissors' | 'scroll';

const P = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.4, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

export function LineArt({ kind, size = 64 }: { kind: ArtKind; size?: number }) {
  return (
    <svg className={`line-art la-${kind}`} width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      {kind === 'spool' && (
        <g {...P}>
          <ellipse cx="26" cy="14" rx="14" ry="4" />
          <ellipse cx="26" cy="46" rx="14" ry="4" />
          <path d="M14 15v30M38 15v30" opacity=".35" />
          <path d="M16 20h20M16 25h20M16 30h20M16 35h20M16 40h20" opacity=".7" />
          <path className="la-loose" d="M36 33c8 2 12 8 10 14s6 9 12 5" />
        </g>
      )}
      {kind === 'magnifier' && (
        <g {...P}>
          <circle cx="27" cy="27" r="14" />
          <path d="M20 22a9 9 0 0 1 8-5" opacity=".5" />
          <path d="M37.5 37.5 52 52" strokeWidth="4" />
        </g>
      )}
      {kind === 'book' && (
        <g {...P}>
          <path d="M32 18c-6-4-14-5-22-4v32c8-1 16 0 22 4 6-4 14-5 22-4V14c-8-1-16 0-22 4z" />
          <path d="M32 18v32" />
          <path d="M15 22c4-.5 9 0 13 1.6M15 28c4-.5 9 0 13 1.6M36 23.6c4-1.6 9-2.1 13-1.6M36 29.6c4-1.6 9-2.1 13-1.6" opacity=".5" />
        </g>
      )}
      {kind === 'stethoscope' && (
        <g {...P}>
          <path d="M18 10v12a10 10 0 0 0 20 0V10" />
          <path d="M15 10h6M35 10h6" />
          <path d="M28 32v6a10 10 0 0 0 20 0v-4" />
          <circle cx="48" cy="29" r="5" />
          <circle cx="48" cy="29" r="1.6" opacity=".6" />
        </g>
      )}
      {kind === 'seal' && (
        <g {...P}>
          <path d="M26 8h12v6c0 4 6 6 6 12H20c0-6 6-8 6-12z" />
          <rect x="18" y="26" width="28" height="8" rx="2" />
          <rect x="16" y="42" width="32" height="14" rx="1.5" strokeDasharray="2 2.6" opacity=".55" />
          <path d="M26 46v6M32 46v6M38 46v6" opacity=".35" />
        </g>
      )}
      {kind === 'notebook' && (
        <g {...P}>
          <rect x="14" y="10" width="36" height="44" rx="3" />
          <path d="M20 10v44" />
          <path d="M44 10v44" opacity=".25" />
          <path d="M26 24h14M26 30h10" opacity=".5" />
        </g>
      )}
      {kind === 'dice' && (
        <g {...P}>
          <rect x="14" y="14" width="36" height="36" rx="7" />
          <circle cx="24" cy="24" r="2.2" />
          <circle cx="32" cy="32" r="2.2" />
          <circle cx="40" cy="40" r="2.2" />
        </g>
      )}
      {kind === 'scissors' && (
        <g {...P}>
          <circle cx="18" cy="44" r="7" />
          <circle cx="18" cy="20" r="7" />
          <path d="M24 40 54 18M24 24l30 22" />
        </g>
      )}
      {kind === 'scroll' && (
        <g {...P}>
          <rect x="10" y="14" width="44" height="8" rx="4" />
          <path d="M14 22v24h36V22" />
          <rect x="10" y="44" width="44" height="8" rx="4" />
          <path d="M22 30h20M22 36h14" opacity=".5" />
        </g>
      )}
    </svg>
  );
}

/** 空状态：器物线稿 + 学术器物口吻的一句话 */
export function EmptyState({ kind, title, hint, children, compact }: { kind: ArtKind; title: string; hint?: ReactNode; children?: ReactNode; compact?: boolean }) {
  return (
    <div className={`empty-art ${compact ? 'compact' : ''}`}>
      <LineArt kind={kind} size={compact ? 44 : 64} />
      <b>{title}</b>
      {hint && <span className="muted">{hint}</span>}
      {children}
    </div>
  );
}
