import type { ReactNode } from 'react';
import type { RouteId } from '../hooks/useHashRoute';
import { cv } from '../utils/css';

export interface SubTab {
  id: string;
  label: string;
  /** 悬停提示 */
  hint?: string;
  /** 计数徽标；0 / 空值不显示 */
  badge?: number | string;
  /** 选中下划线颜色 */
  color?: string;
}

/** 二级分区导航：每个分区对应一个独立 hash 地址（#/route/tab），可直接分享或刷新 */
export function SubNav({ route, tabs, active }: { route: RouteId; tabs: SubTab[]; active: string }) {
  if (tabs.length < 2) return null;
  return (
    <nav className="subnav" aria-label="页面分区">
      {tabs.map((t) => {
        const on = t.id === active;
        return (
          <a
            key={t.id}
            href={`#/${route}/${t.id}`}
            className={`subnav-item ${on ? 'on' : ''}`}
            aria-current={on ? 'page' : undefined}
            title={t.hint}
            style={t.color ? cv({ '--c': t.color }) : undefined}
          >
            {t.label}
            {t.badge !== undefined && t.badge !== 0 && t.badge !== '' && <span className="subnav-badge mono">{t.badge}</span>}
          </a>
        );
      })}
    </nav>
  );
}

interface PageHeaderProps {
  route: RouteId;
  title: string;
  desc?: ReactNode;
  tools?: ReactNode;
  tabs?: SubTab[];
  active?: string;
}

/** 统一页头：标题 + 一句话说明 + 右侧少量工具，下方是二级分区 */
export default function PageHeader({ route, title, desc, tools, tabs, active }: PageHeaderProps) {
  return (
    <header className="ph">
      <div className="ph-row">
        <div className="ph-main">
          <h1 className="ph-title">{title}</h1>
          {desc && <p className="ph-desc">{desc}</p>}
        </div>
        {tools && <div className="ph-tools">{tools}</div>}
      </div>
      {tabs && <SubNav route={route} tabs={tabs} active={active ?? tabs[0]?.id ?? ''} />}
    </header>
  );
}
