import { lazy, Suspense, type ReactNode } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import AiFreeCurtain from './fun/AiFreeCurtain';
import { StampProvider } from './fun/Stamp';
import { useHashRoute, type RouteId } from './hooks/useHashRoute';
import { useSidebarCollapsed } from './hooks/useSidebarCollapsed';
import Arbitration from './pages/Arbitration';
import Assessment from './pages/Assessment';
import Classroom from './pages/Classroom';
import Composer from './pages/Composer';
import Curriculum from './pages/Curriculum';
import Guardrails from './pages/Guardrails';
import Home from './pages/Home';
import Settings from './pages/Settings';
import { useApp } from './store/AppContext';
import { TeacherClassProvider } from './store/ClassroomContext';
import StudentApp from './student/StudentApp';

// 含 Three.js 场景的页面按需加载
const Cockpit = lazy(() => import('./pages/Cockpit'));
const Labs = lazy(() => import('./pages/Labs'));

function Loading() {
  return (
    <div className="loading">
      <div className="loading-orb" />
      <span>心脏还没醒，正在轻轻唤它…</span>
    </div>
  );
}

export default function App() {
  const { route, sub } = useHashRoute();

  // 学生端：独立外壳，不挂载教师课堂主持逻辑
  if (route === 'student')
    return (
      <StampProvider persist={false} actor="我">
        <StudentApp initialCode={sub} />
      </StampProvider>
    );

  return (
    <StampProvider>
      <TeacherClassProvider>
        <TeacherShell route={route} sub={sub} />
      </TeacherClassProvider>
    </StampProvider>
  );
}

function TeacherShell({ route, sub }: { route: RouteId; sub?: string }) {
  const [collapsed, toggleSidebar] = useSidebarCollapsed();
  const { aiFree } = useApp();
  let page: ReactNode;
  switch (route) {
    case 'curriculum':
      page = <Curriculum sub={sub} />;
      break;
    case 'cockpit':
      page = <Cockpit sub={sub} />;
      break;
    case 'composer':
      page = <Composer sub={sub} />;
      break;
    case 'classroom':
      page = <Classroom sub={sub} />;
      break;
    case 'labs':
      page = <Labs sub={sub} />;
      break;
    case 'arbitration':
      page = <Arbitration sub={sub} />;
      break;
    case 'assessment':
      page = <Assessment sub={sub} />;
      break;
    case 'guardrails':
      page = <Guardrails sub={sub} />;
      break;
    case 'settings':
      page = <Settings sub={sub} />;
      break;
    default:
      page = <Home />;
  }

  return (
    <div className={`app ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar route={route} collapsed={collapsed} />
      <main className="main">
        <TopBar route={route} sub={sub} collapsed={collapsed} onToggleSidebar={toggleSidebar} />
        <AiFreeCurtain on={aiFree} />
        <div className="content" key={route}>
          <Suspense fallback={<Loading />}>{page}</Suspense>
        </div>
      </main>
    </div>
  );
}
