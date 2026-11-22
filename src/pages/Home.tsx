import { NavIcon } from '../components/Icons';
import { NAV, NAV_GROUPS } from '../data/nav';
import { useServices } from '../services/ServiceContext';
import { useTeacherClass } from '../store/ClassroomContext';

const STEPS = [
  { no: '01', title: '选一节课', desc: '在课程图谱中找到本节课，或把 3–4 张课卡串成一条单元路线。', href: '#/curriculum', cta: '打开课程图谱' },
  { no: '02', title: '编排时段', desc: '安排课时结构，为学生留出不少于 25% 的 AI-Free 独立推演时间。', href: '#/composer', cta: '进入备课编排' },
  { no: '03', title: '开启课堂', desc: '学生用 6 位课堂码加入；你编排节奏，学生执掌判断。', href: '#/classroom', cta: '开启课堂直播' },
];

/** 首页：只做导航与引导，不承载具体功能 */
export default function Home() {
  const { config } = useServices();
  const t = useTeacherClass();
  const live = Boolean(t.code && t.state?.open);

  return (
    <div className="page home">
      <section className="home-hero">
        <div className="eyebrow">知枢 · AI NATIVE 教学工作台</div>
        <h1 className="home-title">
          让学生成为 <em>AI 系统的导演</em>
        </h1>
        <p className="home-lead">以大语言模型为“认知心脏”，把 AI4K12 五大概念重构为可解剖、可触摸、可评价的课堂。</p>
        <div className="home-cta">
          {live ? (
            <a className="btn primary lg" href="#/classroom">
              <i className="live-dot" aria-hidden />
              回到课堂 · <span className="mono">{t.code}</span>
            </a>
          ) : (
            <a className="btn primary lg" href="#/composer">
              开始备课
            </a>
          )}
          <a className="btn ghost lg" href="#/cockpit">
            了解课程架构 →
          </a>
        </div>
      </section>

      <section className="home-section">
        <div className="home-label">三步上手</div>
        <ol className="home-steps">
          {STEPS.map((s) => (
            <li key={s.no}>
              <a href={s.href} className="home-step">
                <span className="hs-no mono">{s.no}</span>
                <b>{s.title}</b>
                <p>{s.desc}</p>
                <span className="hs-cta">{s.cta} →</span>
              </a>
            </li>
          ))}
        </ol>
      </section>

      <section className="home-section">
        <div className="home-label">全部功能</div>
        <div className="home-groups">
          {NAV_GROUPS.map((g) => (
            <div key={g.id} className="home-group">
              <div className="hg-head">
                <b>{g.label}</b>
                <small>{g.desc}</small>
              </div>
              {NAV.filter((n) => n.group === g.id).map((n) => (
                <a key={n.id} href={`#/${n.id}`} className="home-entry">
                  <span className="he-icon">
                    <NavIcon id={n.id} size={18} />
                  </span>
                  <span className="he-text">
                    <b>{n.label}</b>
                    <small>{n.desc}</small>
                  </span>
                  <span className="he-arrow" aria-hidden>
                    →
                  </span>
                </a>
              ))}
            </div>
          ))}
        </div>
      </section>

      <footer className="home-foot">
        <span>
          <i className={`mode-dot ${config.mode}`} aria-hidden />
          {config.mode === 'mock' ? '当前为 Mock 模拟模式：离线即可体验全部功能' : `当前连接真实接口 · ${config.defaultModel || '未配置默认模型'}`}
        </span>
        <a href="#/settings">数据与接口设置 →</a>
      </footer>
    </div>
  );
}
