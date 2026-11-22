import { useEffect, useState } from 'react';

const Q = '(prefers-reduced-motion: reduce)';

export function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia(Q).matches;
  } catch {
    return false;
  }
}

/** 尊重系统“减少动态效果”设置：为 true 时跳过仪式动画，直接切到终态 */
export function useReducedMotion(): boolean {
  const [v, setV] = useState(prefersReducedMotion);
  useEffect(() => {
    let m: MediaQueryList;
    try {
      m = window.matchMedia(Q);
    } catch {
      return;
    }
    const f = () => setV(m.matches);
    m.addEventListener?.('change', f);
    return () => m.removeEventListener?.('change', f);
  }, []);
  return v;
}
