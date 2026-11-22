import type { KeyboardEvent } from 'react';

/**
 * 让非 <button> 元素也能像按钮一样被点击与键盘操作。
 * 用于可拖拽的卡片：Firefox 不会从 <button draggable> 上发起拖拽，所以这些卡片改用 div。
 */
export function pressable(fn: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: fn,
    onKeyDown: (e: KeyboardEvent<Element>) => {
      if (e.target !== e.currentTarget) return;
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn();
      }
    },
  };
}
