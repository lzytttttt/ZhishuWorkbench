import type { RouteId } from '../hooks/useHashRoute';

const base = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function NavIcon({ id, size = 22 }: { id: RouteId; size?: number }) {
  const common = { ...base, width: size, height: size };
  switch (id) {
    case 'cockpit':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="3.2" />
          <ellipse cx="12" cy="12" rx="9.5" ry="4.2" transform="rotate(-28 12 12)" />
          <circle cx="19.6" cy="7.6" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'curriculum':
      return (
        <svg {...common}>
          <path d="M12 12a1.6 1.6 0 1 1 1.6 1.6A3.6 3.6 0 1 1 9.4 9.4a5.8 5.8 0 1 1 7.9 8.7" />
          <circle cx="17.3" cy="18.1" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'composer':
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="8" height="4" rx="1.6" />
          <rect x="8" y="10" width="13" height="4" rx="1.6" />
          <rect x="3" y="15.5" width="11" height="4" rx="1.6" />
        </svg>
      );
    case 'labs':
      return (
        <svg {...common}>
          <path d="M9 3h6M10 3v6l-5.4 9.4A1.7 1.7 0 0 0 6 21h12a1.7 1.7 0 0 0 1.4-2.6L14 9V3" />
          <path d="M7.4 15.2h9.2" />
        </svg>
      );
    case 'arbitration':
      return (
        <svg {...common}>
          <path d="M12 4v16M7.5 20h9M4.5 7h15" />
          <path d="M4.5 7 2 12.5a2.6 2.6 0 0 0 5 0zM19.5 7 17 12.5a2.6 2.6 0 0 0 5 0z" />
        </svg>
      );
    case 'assessment':
      return (
        <svg {...common}>
          <polygon points="12,3 20.5,9.2 17.3,19.2 6.7,19.2 3.5,9.2" />
          <polygon points="12,7.6 16.6,10.6 14.6,15.6 9,15 8,10.6" />
        </svg>
      );
    case 'guardrails':
      return (
        <svg {...common}>
          <path d="M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6z" />
          <path d="M8.6 12.2l2.4 2.4 4.4-4.8" />
        </svg>
      );
    case 'settings':
      return (
        <svg {...common}>
          <path d="M9 3v5M15 3v5" />
          <rect x="6" y="8" width="12" height="6" rx="2" />
          <path d="M12 14v3a3 3 0 0 1-3 3H7" />
          <circle cx="12" cy="11" r="0.9" fill="currentColor" stroke="none" />
        </svg>
      );
    case 'classroom':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="2.2" />
          <path d="M8.2 8.2a5.4 5.4 0 0 0 0 7.6M15.8 8.2a5.4 5.4 0 0 1 0 7.6M5.3 5.3a9.5 9.5 0 0 0 0 13.4M18.7 5.3a9.5 9.5 0 0 1 0 13.4" />
        </svg>
      );
    default:
      return null;
  }
}

/** 侧栏折叠图标 */
export function SidebarToggleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg {...base} width={size} height={size}>
      <rect x="3.5" y="4.5" width="17" height="15" rx="2.6" />
      <path d="M9.5 4.5v15" />
    </svg>
  );
}

/** 品牌标识：墨色螺旋 + 朱砂心印 */
export function Logo({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-label="知枢">
      <path
        d="M32 32a3 3 0 1 1 3 3 7 7 0 1 1-7-7 12 12 0 1 1 12 12 17 17 0 1 1-17-17"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="32" cy="32" r="5.8" fill="#c83e2b" />
    </svg>
  );
}
