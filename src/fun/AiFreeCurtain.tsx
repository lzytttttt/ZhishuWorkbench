import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from './motion';
import { play } from './sound';

/**
 * AI-Free “落闸”：
 * - 入口：朱砂线像毛笔一样扫过 → 纸帘从上方落下 → “无 AI”印章盖下（约 1.1 秒）；
 * - 期间：页面顶部垂着一截纸帘边，提醒“此刻无 AI”；
 * - 出口：印章抬起，纸帘收回（心脏的“除颤”由心率组件负责）。
 */
export default function AiFreeCurtain({ on }: { on: boolean }) {
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<'none' | 'enter' | 'exit'>('none');
  const prev = useRef(on);

  useEffect(() => {
    if (prev.current === on) return; // 首次挂载（刷新页面）不重放仪式
    prev.current = on;
    if (reduced) return;
    setPhase(on ? 'enter' : 'exit');
    const timers: number[] = [];
    if (on) {
      play('paper');
      timers.push(window.setTimeout(() => play('stamp'), 620));
    } else {
      play('paper');
    }
    timers.push(window.setTimeout(() => setPhase('none'), on ? 1200 : 850));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [on, reduced]);

  return (
    <>
      {on && (
        <div className="af-valance" aria-hidden>
          <span className="af-valance-seal">无 AI</span>
        </div>
      )}
      {phase !== 'none' && (
        <div className={`af-curtain ${phase}`} aria-hidden>
          <i className="af-brush" />
          <div className="af-sheet">
            <span className="af-bigseal">
              <span>无</span>
              <span>AI</span>
            </span>
            <small>独立推演时段</small>
          </div>
        </div>
      )}
    </>
  );
}
