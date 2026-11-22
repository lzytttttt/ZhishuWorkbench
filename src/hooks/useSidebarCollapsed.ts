import { useCallback, useEffect, useState } from 'react';

const KEY = 'zhishu.sidebar.collapsed';

function initial(): boolean {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== null) return raw === '1';
  } catch {
    /* 存储不可用时按屏宽决定 */
  }
  return typeof window !== 'undefined' && window.innerWidth < 1200;
}

/** Notion 式侧栏折叠状态：持久化到 localStorage，支持 Ctrl/⌘ + \ 快捷键 */
export function useSidebarCollapsed(): [boolean, () => void] {
  const [collapsed, setCollapsed] = useState<boolean>(initial);
  const toggle = useCallback(() => setCollapsed((c) => !c), []);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, collapsed ? '1' : '0');
    } catch {
      /* 静默降级 */
    }
  }, [collapsed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === '\\') {
        e.preventDefault();
        toggle();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  return [collapsed, toggle];
}
