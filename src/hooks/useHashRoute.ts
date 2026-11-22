import { useEffect, useState } from 'react';

export type RouteId =
  | 'home'
  | 'cockpit'
  | 'curriculum'
  | 'composer'
  | 'classroom'
  | 'labs'
  | 'arbitration'
  | 'assessment'
  | 'guardrails'
  | 'settings'
  | 'student';

const ROUTES: RouteId[] = [
  'home',
  'cockpit',
  'curriculum',
  'composer',
  'classroom',
  'labs',
  'arbitration',
  'assessment',
  'guardrails',
  'settings',
  'student',
];

interface RouteState {
  route: RouteId;
  sub?: string;
}

function parse(): RouteState {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [head, sub] = raw.split('/');
  const route = (ROUTES as string[]).includes(head) ? (head as RouteId) : 'home';
  return { route, sub: sub ? decodeURIComponent(sub) : undefined };
}

export function navigate(path: string) {
  window.location.hash = '/' + path;
}

export function useHashRoute(): RouteState {
  const [state, setState] = useState<RouteState>(parse);
  useEffect(() => {
    const onChange = () => setState(parse());
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return state;
}
