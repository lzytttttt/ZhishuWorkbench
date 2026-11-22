import { lazy, Suspense, type ReactNode } from 'react';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import { useHashRoute, type RouteId } from './hooks/useHashRoute';
import { useSidebarCollapsed } from './hooks/useSidebarCollapsed';
import Arbitration from './pages/Arbitration';
import Assessment from './pages/Assessment';
import Classroom from './pages/Classroom';
import Composer from './pages/Composer';
import Curriculum from './pages/Curriculum';
import Guardrails from './pages/Guardrails';
import Settings from './pages/Settings';
import { TeacherClassProvider } from './store/ClassroomContext';
import StudentApp from './student/StudentApp';

// 含 Three.js 场景的页面按需加载
const Cockpit = lazy(() => import('./pages/Cockpit'));
const Labs = lazy(() => import('./pages/Labs'));

function Loading() {
  return (
    <div className="loading">
      <div className="loading-orb" />
      <span>正在唤醒认知心脏…</span>
    </div>
  );
}

export default function App() {
  const { route, sub } = useHashRoute();

  // 学生端：独立外壳，不挂载教师课堂主持逻辑
  if (route === 'student') return <StudentApp initialCode={sub} />;

  return (
    <TeacherClassProvider>
      <TeacherShell route={route} sub={sub} />
    </TeacherClassProvider>
  );
}

function TeacherShell({ route, sub }: { route: RouteId; sub?: string }) {
  const [collapsed, toggleSidebar] = useSidebarCollapsed();
  let page: ReactNode;
  switch (route) {
    case 'curriculum':
      page = <Curriculum sub={sub} />;
      break;
    case 'composer':
      page = <Composer />;
      break;
    case 'classroom':
      page = <Classroom />;
      break;
    case 'labs':
      page = <Labs sub={sub} />;
      break;
    case 'arbitration':
      page = <Arbitration />;
      break;
    case 'assessment':
      page = <Assessment />;
      break;
    case 'guardrails':
      page = <Guardrails />;
      break;
    case 'settings':
      page = <Settings />;
      break;
    default:
      page = <Cockpit />;
  }

  return (
    <div className={`app ${collapsed ? 'sidebar-collapsed' : ''}`}>
      <Sidebar route={route} collapsed={collapsed} />
      <main className="main">
        <TopBar route={route} collapsed={collapsed} onToggleSidebar={toggleSidebar} />
        <div className="content" key={route}>
          <Suspense fallback={<Loading />}>{page}</Suspense>
        </div>
      </main>
    </div>
  );
}
