import { NAV } from '../data/nav';
import type { RouteId } from '../hooks/useHashRoute';
import { useNow } from '../hooks/useNow';
import { useServices } from '../services/ServiceContext';
import { useApp } from '../store/AppContext';
import { fmtClock } from '../utils/css';
import { SidebarToggleIcon } from './Icons';

interface TopBarProps {
  route: RouteId;
  collapsed: boolean;
  onToggleSidebar: () => void;
}

export default function TopBar({ route, collapsed, onToggleSidebar }: TopBarProps) {
  const { aiFree, setAiFree, aiFreeSince } = useApp();
  const { config } = useServices();
  const meta = NAV.find((n) => n.id === route) ?? NAV[0];
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
        <span className="here">
          {meta.label}
          <small>{meta.en}</small>
        </span>
      </div>
      <div className="top-actions">
        <a className={`mode-pill ${config.mode}`} href="#/settings" title="数据与接口设置">
          <i />
          {config.mode === 'mock' ? 'Mock 模拟' : `真实接口 · ${config.defaultModel || '未配置模型'}`}
        </a>
        <button
          className={`aifree-switch ${aiFree ? 'on' : ''}`}
          onClick={() => setAiFree(!aiFree)}
          aria-pressed={aiFree}
          title="课堂铁律二：每单元保留不少于 25% 的无 AI 独立推演时段"
        >
          <span className="track">
            <span className="knob" />
          </span>
          <span className="lbl">
            {aiFree ? (
              <>
                AI-Free 独立推演中<b>{fmtClock(elapsed)}</b>
              </>
            ) : (
              '开启 AI-Free 时段'
            )}
          </span>
        </button>
        <div className="avatar" title="教师">
          师
        </div>
      </div>
    </header>
  );
}
