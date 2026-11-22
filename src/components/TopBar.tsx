import { NAV } from '../data/nav';
import HeartRate from '../fun/HeartRate';
import PullCord from '../fun/PullCord';
import { toggleMute, useSoundPref } from '../fun/sound';
import { StampDrawer } from '../fun/Stamp';
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
        <div className="vital-group">
          <a className={`mode-pill ${config.mode}`} href="#/settings" title="数据与接口设置">
            <i />
            {config.mode === 'mock' ? 'Mock 模拟' : `真实接口 · ${config.defaultModel || '未配置模型'}`}
          </a>
          <HeartRate />
        </div>
        <SoundToggle />
        <StampDrawer />
        {aiFree ? (
          <div className="aifree-switch on corded" title="课堂铁律二：每单元保留不少于 25% 的无 AI 独立推演时段">
            <span className="lbl">
              AI-Free 独立推演中<b>{fmtClock(elapsed)}</b>
            </span>
            <PullCord size="sm" label="拉红绳结束 AI-Free" onPull={() => setAiFree(false)} />
          </div>
        ) : (
          <button className="aifree-switch" onClick={() => setAiFree(true)} aria-pressed={false} title="课堂铁律二：每单元保留不少于 25% 的无 AI 独立推演时段">
            <span className="track">
              <span className="knob" />
            </span>
            <span className="lbl">开启 AI-Free 时段</span>
          </button>
        )}
        <div className="avatar" title="教师">
          师
        </div>
      </div>
    </header>
  );
}

function SoundToggle() {
  const { pref, on, classMode } = useSoundPref();
  const tip = `声音：${on ? '开' : '关'}${pref === 'auto' ? `（自动 · ${classMode ? '课堂模式默认开' : '个人模式默认关'}）` : ''}——点击一键${on ? '静音' : '开启'}`;
  return (
    <button className={`sound-toggle ${on ? 'on' : ''}`} onClick={toggleMute} title={tip} aria-label={tip} aria-pressed={on}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
        {on ? <path d="M15.5 9a4.5 4.5 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11" /> : <path d="m16 9.5 5 5M21 9.5l-5 5" />}
      </svg>
    </button>
  );
}
