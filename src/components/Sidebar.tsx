import { NAV, NAV_GROUPS, NAV_MAP, type NavItem } from '../data/nav';
import type { RouteId } from '../hooks/useHashRoute';
import { Logo, NavIcon } from './Icons';

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  return (
    <a
      href={`#/${item.id}`}
      className={`nav-item ${active ? 'active' : ''}`}
      // 展开时文字已足够清楚，只在折叠态给出悬停提示
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? 'page' : undefined}
    >
      <NavIcon id={item.id} size={17} />
      <span>{item.label}</span>
    </a>
  );
}

/** 侧栏：品牌 → 首页 → 四个功能分组。系统设置、版本信息收进顶栏个人菜单 */
export default function Sidebar({ route, collapsed }: { route: RouteId; collapsed: boolean }) {
  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      <a className="brand" href="#/home" title="知枢 · AI Native 教学工作台">
        <Logo size={24} />
        <b className="brand-name">知枢</b>
      </a>
      <nav className="nav" aria-label="主导航">
        <div className="nav-group">
          <NavLink item={NAV_MAP.home} active={route === 'home'} collapsed={collapsed} />
        </div>
        {NAV_GROUPS.map((g) => (
          <div className="nav-group" key={g.id} role="group" aria-label={g.label}>
            <div className="nav-group-label" aria-hidden>
              {g.label}
            </div>
            {NAV.filter((n) => n.group === g.id).map((n) => (
              <NavLink key={n.id} item={n} active={route === n.id} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>
    </aside>
  );
}
