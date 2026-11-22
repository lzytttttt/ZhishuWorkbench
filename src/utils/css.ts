import type { CSSProperties } from 'react';

/** 便捷地向 style 注入 CSS 自定义属性，例如 cv({ '--c': '#be3448' }) */
export const cv = (vars: Record<string, string | number>): CSSProperties => vars as unknown as CSSProperties;

export const pct = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

export const fmtClock = (sec: number) => {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};
