import { useEffect, useState } from 'react';
import { navigate } from '../hooks/useHashRoute';
import { cv } from '../utils/css';
import { play } from './sound';
import { useVitals, type VitalMode } from './vitals';

/* 一个心动周期 = 24 个单位宽；画两个周期，平移一个周期形成无缝滚动 */
const BEAT = 'H7 l1.5 -1.6 l1.5 1.6 H11 l0.8 1.6 l1.4 -9.6 l1.4 10.4 l0.9 -2.4 H17 q1.6 -2.6 3.2 0 H24';
const PATHS: Record<VitalMode, string> = {
  idle: `M0 9 ${BEAT} ${BEAT.replace(/H(\d+)/g, (_, n) => `H${Number(n) + 24}`)}`,
  busy: `M0 9 ${BEAT} ${BEAT.replace(/H(\d+)/g, (_, n) => `H${Number(n) + 24}`)}`,
  // 心律不齐：间期不等、波形高低不一
  arrhythmia: 'M0 9 H4 l0.8 1.2 l1.2 -6 l1.2 6.8 H11 l0.7 1 l1.6 -10.5 l1.4 11 H18 l1 -3 l1 3 H24 H27 l0.6 1 l1 -4 l1 4.4 H33 l0.8 1.6 l1.4 -9.6 l1.4 10.4 H41 q1.6 -2.6 3.2 0 H48',
  flat: 'M0 9 H48',
};

const LABEL: Record<VitalMode, string> = {
  idle: '平稳 · 静候提问',
  busy: 'AI 正在思考',
  arrhythmia: '心律不齐 · 刚有调用失败或被拦截',
  flat: 'AI-Free · 心脏已停',
};

export default function HeartRate() {
  const v = useVitals();
  const [defib, setDefib] = useState(false);

  useEffect(() => {
    if (!v.defibAt || Date.now() - v.defibAt > 2000) return;
    setDefib(true);
    play('heart');
    const t = window.setTimeout(() => setDefib(false), 900);
    return () => window.clearTimeout(t);
  }, [v.defibAt]);

  const period = v.bpm > 0 ? 60 / v.bpm : 1;
  const go = () => {
    navigate('settings');
    window.setTimeout(() => document.getElementById('call-log')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 420);
  };

  return (
    <button className={`ecg ${v.mode} ${defib ? 'defib' : ''}`} onClick={go} aria-label={`认知心率 ${v.mode === 'flat' ? '平线' : `${v.bpm} bpm`}，${LABEL[v.mode]}。今日调用 ${v.calls} 次，拦截 ${v.blocked} 次。点击查看接口日志`}>
      <svg className="ecg-svg" width="24" height="16" viewBox="0 0 24 16" aria-hidden>
        <g className="ecg-trace" style={cv({ '--period': `${v.mode === 'arrhythmia' ? period * 2 : period}s` })}>
          <path d={PATHS[v.mode]} />
        </g>
      </svg>
      <span className="ecg-bpm mono">
        {v.mode === 'flat' ? '— —' : v.bpm}
        <small>bpm</small>
      </span>
      <span className="ecg-tip" role="tooltip">
        <b>认知心率 · {LABEL[v.mode]}</b>
        <span>
          今日调用 <em className="mono">{v.calls}</em> 次 · 拦截 <em className="mono">{v.blocked}</em> 次{v.errors ? ` · 失败 ${v.errors} 次` : ''}
        </span>
        <small>点击查看接口日志 →</small>
      </span>
    </button>
  );
}
