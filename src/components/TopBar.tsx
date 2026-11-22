import { useEffect, useRef, useState } from 'react';
import { LABS } from '../data/curriculum';
import { pageMeta } from '../data/nav';
import HeartRate from '../fun/HeartRate';
import PullCord from '../fun/PullCord';
import { toggleMute, useSoundPref } from '../fun/sound';
import { StampDrawerPanel, useStamp } from '../fun/Stamp';
import type { RouteId } from '../hooks/useHashRoute';
import { useNow } from '../hooks/useNow';
import { useApp } from '../store/AppContext';
import { fmtClock } from '../utils/css';
import { SidebarToggleIcon } from './Icons';

interface TopBarProps {
  route: RouteId;
  sub?: string;
  collapsed: boolean;
  onToggleSidebar: () => void;
}

const AIFREE_TIP = '课堂铁律二：每单元保留不少于 25% 的无 AI 独立推演时段';

/** 顶栏：左侧“折叠 + 面包屑”，右侧只保留三件事——状态、AI-Free、个人菜单 */
export default function TopBar({ route, sub, collapsed, onToggleSidebar }: TopBarProps) {
  const { aiFree, setAiFree, aiFreeSince } = useApp();
  const { item: meta, tab } = pageMeta(route, sub);
  // 当前分区名：实验室按实验名，其余按页面分区；打开课程详情等非分区地址时不显示
  const tabLabel = route === 'labs' ? (LABS.find((l) => l.id === sub) ?? LABS[0]).name : meta.tabs?.some((t) => t.id === sub) || !sub ? tab.label : '';
  // 仅 AI-Free 计时需要逐秒刷新
  const now = useNow(aiFree ? 1000 : 60_000);

  const elapsed = aiFree && aiFreeSince ? Math.max(0, Math.floor((now - aiFreeSince) / 1000)) : 0;
  const toggleTip = `${collapsed ? '展开' : '收起'}侧栏（Ctrl + \\）`;

  return (
    <header className="topbar">
      <div className="crumbs">
        <button className="sidebar-toggle" onClick={onToggleSidebar} title={toggleTip} aria-label={toggleTip} aria-expanded={!collapsed}>
          <SidebarToggleIcon />
        </button>
        <nav className="crumb-path" aria-label="当前位置">
          {route !== 'home' && (
            <>
              <a className="crumb" href="#/home">
                首页
              </a>
              <i className="crumb-sep" aria-hidden>
                /
              </i>
            </>
          )}
          <a className={`crumb ${tabLabel ? '' : 'current'}`} href={`#/${meta.id}`}>
            {meta.label}
          </a>
          {tabLabel && (
            <>
              <i className="crumb-sep" aria-hidden>
                /
              </i>
              <span className="crumb current">{tabLabel}</span>
            </>
          )}
        </nav>
      </div>

      <div className="top-actions">
        <HeartRate />
        {aiFree ? (
          <div className="aifree-switch on corded" title={AIFREE_TIP}>
            <span className="lbl">
              AI-Free<b>{fmtClock(elapsed)}</b>
            </span>
            <PullCord size="sm" label="拉红绳结束 AI-Free" onPull={() => setAiFree(false)} />
          </div>
        ) : (
          <button className="aifree-switch" onClick={() => setAiFree(true)} aria-pressed={false} title={`开启 AI-Free 时段 · ${AIFREE_TIP}`}>
            <span className="track">
              <span className="knob" />
            </span>
            <span className="lbl">AI-Free</span>
          </button>
        )}
        <UserMenu route={route} />
      </div>
    </header>
  );
}

/** 个人菜单：声音、印章抽屉与系统入口收进头像下 */
function UserMenu({ route }: { route: RouteId }) {
  const [open, setOpen] = useState(false);
  const [drawer, setDrawer] = useState(false);
  const { records } = useStamp();
  const { pref, on, classMode } = useSoundPref();
  const ref = useRef<HTMLDivElement>(null);

  // 点外部 / Esc / 切换页面时收起
  useEffect(() => {
    if (!open) return;
    const down = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const hash = () => setOpen(false);
    document.addEventListener('mousedown', down);
    window.addEventListener('keydown', key);
    window.addEventListener('hashchange', hash);
    return () => {
      document.removeEventListener('mousedown', down);
      window.removeEventListener('keydown', key);
      window.removeEventListener('hashchange', hash);
    };
  }, [open]);

  const count = records.length > 99 ? '99+' : String(records.length);
  const soundHint = pref === 'auto' ? `自动 · ${classMode ? '课堂模式默认开' : '个人模式默认关'}` : '手动设置';

  return (
    <div className="user-menu" ref={ref}>
      <button className={`avatar ${open ? 'on' : ''}`} onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open} title="教师 · 声音、印章抽屉与设置">
        师
      </button>
      {open && (
        <div className="um-pop" role="menu">
          <div className="um-head">
            <span className="avatar sm" aria-hidden>
              师
            </span>
            <span>
              <b>教师</b>
              <small>知枢 · AI Native 教学工作台 · v0.3</small>
            </span>
          </div>

          <button className="um-item" role="menuitemcheckbox" aria-checked={on} onClick={toggleMute}>
            <span className="um-label">
              声音
              <small>{soundHint}</small>
            </span>
            <span className={`um-switch ${on ? 'on' : ''}`} aria-hidden>
              <i />
            </span>
          </button>
          <button
            className="um-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              setDrawer(true);
            }}
          >
            <span className="um-label">
              印章抽屉
              <small>决策与透明度记录</small>
            </span>
            {records.length > 0 && <span className="um-count mono">{count}</span>}
          </button>

          <div className="um-sep" />
          <a className={`um-item ${route === 'settings' ? 'on' : ''}`} role="menuitem" href="#/settings">
            <span className="um-label">数据与接口</span>
            <span className="um-arrow" aria-hidden>
              →
            </span>
          </a>
          <a className="um-item" role="menuitem" href="#/settings/log">
            <span className="um-label">调用日志</span>
            <span className="um-arrow" aria-hidden>
              →
            </span>
          </a>
        </div>
      )}
      <StampDrawerPanel open={drawer} onClose={() => setDrawer(false)} />
    </div>
  );
}
