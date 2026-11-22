import { NAV, NAV_GROUPS, type NavItem } from '../data/nav';
import type { RouteId } from '../hooks/useHashRoute';
import { Logo, NavIcon } from './Icons';

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  return (
    <a
      href={`#/${item.id}`}
      className={`nav-item ${active ? 'active' : ''}`}
      title={collapsed ? `${item.label} · ${item.desc}` : item.desc}
      aria-current={active ? 'page' : undefined}
    >
      <NavIcon id={item.id} size={18} />
      <span>{item.label}</span>
    </a>
  );
}

export default function Sidebar({ route, collapsed }: { route: RouteId; collapsed: boolean }) {
  const settings = NAV.find((n) => n.group === 'system');
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <a className="brand" href="#/cockpit" title="知枢 · AI Native 教学工作台">
        <Logo size={26} />
        <span className="brand-text">
          <b className="brand-name">知枢</b>
          <small>AI Native 教学工作台</small>
        </span>
      </a>
      <nav className="nav" aria-label="主导航">
        {NAV_GROUPS.map((g) => (
          <div className="nav-group" key={g.id}>
            <div className="nav-group-label">{g.label}</div>
            {NAV.filter((n) => n.group === g.id).map((n) => (
              <NavLink key={n.id} item={n} active={route === n.id} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>
      <div className="sidebar-foot">
        {settings && <NavLink item={settings} active={route === settings.id} collapsed={collapsed} />}
        <div className="foot-meta">
          <span className="seal" title="AI Native · 智能原生">原生</span>
          <span className="brand-ver">v0.2</span>
        </div>
      </div>
    </aside>
  );
}
