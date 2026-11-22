/* ==========================================================================
 * 印章：全站决策反馈（采纳 / 退回 / 终审 / 下课 …）
 * - 印章落下 + 纸张轻微下压，代替 toast；
 * - 每一次盖章都写进“印章抽屉”：谁、在什么对象上、盖了什么章——
 *   这本身就是一份透明度审计记录。
 * ========================================================================== */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { uid } from '../utils/plan';
import { prefersReducedMotion } from './motion';
import { play } from './sound';

export type StampTone = 'cinnabar' | 'ink';

export interface StampRecord {
  id: string;
  at: number;
  label: string;
  target: string;
  actor: string;
  tone: StampTone;
}

export interface StampOptions {
  /** 印文：建议 2 或 4 个字 */
  label: string;
  /** 盖在什么对象上（写入印章抽屉） */
  target?: string;
  actor?: string;
  tone?: StampTone;
  /** 落章位置：元素（取其中心）或屏幕坐标；缺省为视口中央 */
  at?: Element | { x: number; y: number } | null;
  /** 只播放动画，不写入抽屉 */
  silent?: boolean;
}

interface Fx {
  id: string;
  x: number;
  y: number;
  label: string;
  tone: StampTone;
}

interface StampCtx {
  stamp: (o: StampOptions) => void;
  records: StampRecord[];
  clear: () => void;
}

const KEY = 'zhishu.v1.stamps';
const CAP = 160;
const Ctx = createContext<StampCtx | null>(null);

function readRecords(): StampRecord[] {
  try {
    const raw = localStorage.getItem(KEY);
    const v = raw ? (JSON.parse(raw) as StampRecord[]) : [];
    return Array.isArray(v) ? v.slice(0, CAP) : [];
  } catch {
    return [];
  }
}

function pointOf(at: StampOptions['at']): { x: number; y: number } {
  if (at && 'getBoundingClientRect' in at) {
    const r = at.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }
  if (at && 'x' in at) return at;
  return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
}

export function StampProvider({ children, persist = true, actor = '教师' }: { children: ReactNode; persist?: boolean; actor?: string }) {
  const [records, setRecords] = useState<StampRecord[]>(() => (persist ? readRecords() : []));
  const [fx, setFx] = useState<Fx[]>([]);
  const pressT = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!persist) return;
    try {
      localStorage.setItem(KEY, JSON.stringify(records));
    } catch {
      /* ignore */
    }
  }, [records, persist]);

  const stamp = useCallback(
    (o: StampOptions) => {
      const tone = o.tone ?? 'cinnabar';
      play('stamp');
      if (!o.silent) {
        const rec: StampRecord = { id: uid() + uid(), at: Date.now(), label: o.label, target: o.target ?? '', actor: o.actor ?? actor, tone };
        setRecords((r) => [rec, ...r].slice(0, CAP));
      }
      if (prefersReducedMotion()) return;
      const p = pointOf(o.at);
      const id = uid() + uid();
      setFx((list) => [...list, { id, x: p.x, y: p.y, label: o.label, tone }]);
      window.setTimeout(() => setFx((list) => list.filter((f) => f.id !== id)), 1250);
      document.body.classList.add('paper-press');
      window.clearTimeout(pressT.current);
      pressT.current = window.setTimeout(() => document.body.classList.remove('paper-press'), 260);
    },
    [actor],
  );

  const clear = useCallback(() => setRecords([]), []);
  const value = useMemo(() => ({ stamp, records, clear }), [stamp, records, clear]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="stamp-layer" aria-hidden>
        {fx.map((f) => (
          <span key={f.id} className={`stamp-fx ${f.tone}`} style={{ left: f.x, top: f.y }}>
            <Seal label={f.label} tone={f.tone} />
          </span>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useStamp(): StampCtx {
  const v = useContext(Ctx);
  // 未包裹 Provider 时降级为空操作，避免页面崩溃
  return v ?? { stamp: () => undefined, records: [], clear: () => undefined };
}

/** 印面：2 字竖排，4 字两列（自右向左） */
export function Seal({ label, tone = 'cinnabar', size = 'md', ghost = false }: { label: string; tone?: StampTone; size?: 'xs' | 'sm' | 'md' | 'lg'; ghost?: boolean }) {
  const chars = Array.from(label);
  return (
    <span className={`seal-face ${tone} ${size} n${Math.min(chars.length, 4)} ${ghost ? 'ghost' : ''}`}>
      <span className="seal-text">{label}</span>
    </span>
  );
}

/* ---------------- 印章抽屉 ---------------- */
const fmtTime = (t: number) => {
  const d = new Date(t);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

export function StampDrawer() {
  const { records, clear } = useStamp();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open]);

  return (
    <>
      <button className={`stamp-drawer-btn ${open ? 'on' : ''}`} onClick={() => setOpen((v) => !v)} title="印章抽屉 · 决策与透明度记录" aria-expanded={open}>
        <span className="sdb-seal">印</span>
        {records.length > 0 && <b className="mono">{records.length > 99 ? '99+' : records.length}</b>}
      </button>
      {open && (
        <div className="stamp-drawer-scrim" onClick={() => setOpen(false)}>
          <aside className="stamp-drawer" onClick={(e) => e.stopPropagation()} aria-label="印章抽屉">
            <header>
              <div>
                <span className="eyebrow">SEAL DRAWER · 印章轨迹</span>
                <h3>印章抽屉</h3>
                <p className="muted small">每一次采纳、退回、终审、下课都会留下一枚章——按时间记录谁在什么对象上盖了什么章，它同时就是透明度审计记录。</p>
              </div>
              <button className="btn ghost sm" onClick={() => setOpen(false)}>
                收起
              </button>
            </header>
            <div className="sd-list">
              {records.map((r) => (
                <div key={r.id} className="sd-row">
                  <Seal label={r.label} tone={r.tone} size="xs" />
                  <div className="sd-main">
                    <b>{r.target || '—'}</b>
                    <small>
                      {r.actor} · 盖下「{r.label}」
                    </small>
                  </div>
                  <span className="mono sd-time">{fmtTime(r.at)}</span>
                </div>
              ))}
              {!records.length && (
                <div className="sd-empty">
                  <span className="sd-empty-seal">印</span>
                  <b>抽屉还是空的</b>
                  <span className="muted small">第一次采纳 Badcase、保存备课或下课时，这里会落下第一枚章。</span>
                </div>
              )}
            </div>
            {records.length > 0 && (
              <footer>
                <span className="muted small">共 {records.length} 枚 · 仅保存在本机</span>
                <button
                  className="btn ghost sm"
                  onClick={() => {
                    if (window.confirm('清空印章抽屉？这会删除本机的全部盖章记录。')) clear();
                  }}
                >
                  清空
                </button>
              </footer>
            )}
          </aside>
        </div>
      )}
    </>
  );
}
