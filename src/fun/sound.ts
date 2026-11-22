/* ==========================================================================
 * 纸上声响：纸、印章、骰子、心跳四种，全部由 WebAudio 即时合成（无音频文件）。
 * - 偏好三态：auto（课堂模式开 / 个人模式关）· on · off
 * - 课堂模式 = 当前存在一节开着的课（教师端开课或学生端已入班）
 * ========================================================================== */
import { useEffect, useState } from 'react';

export type SoundPref = 'auto' | 'on' | 'off';
export type Sfx = 'paper' | 'stamp' | 'dice' | 'heart' | 'snip';

const KEY = 'zhishu.v1.sound';
type Listener = () => void;

function readPref(): SoundPref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'on' || v === 'off' ? v : 'auto';
  } catch {
    return 'auto';
  }
}

let pref: SoundPref = readPref();
let classMode = false;
const listeners = new Set<Listener>();
const emit = () => listeners.forEach((l) => l());

export function setSoundPref(p: SoundPref) {
  pref = p;
  try {
    localStorage.setItem(KEY, p);
  } catch {
    /* ignore */
  }
  emit();
}

export function setClassMode(on: boolean) {
  if (classMode === on) return;
  classMode = on;
  emit();
}

export const soundOn = () => pref === 'on' || (pref === 'auto' && classMode);

export function useSoundPref() {
  const [, force] = useState(0);
  useEffect(() => {
    const f = () => force((n) => n + 1);
    listeners.add(f);
    return () => {
      listeners.delete(f);
    };
  }, []);
  return { pref, on: soundOn(), classMode, setPref: setSoundPref };
}

/** 一键静音：在“开 / 关”之间切换（auto 视为当前实际状态） */
export function toggleMute() {
  setSoundPref(soundOn() ? 'off' : 'on');
}

/* ---------------- 合成器 ---------------- */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    try {
      ctx = new C();
    } catch {
      return null;
    }
  }
  if (ctx.state === 'suspended') void ctx.resume().catch(() => undefined);
  return ctx;
}

function noise(c: AudioContext, dur: number): AudioBufferSourceNode {
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const s = c.createBufferSource();
  s.buffer = buf;
  return s;
}

function env(c: AudioContext, t: number, peak: number, attack: number, decay: number): GainNode {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
  return g;
}

function thump(c: AudioContext, out: AudioNode, t: number, from: number, to: number, peak: number, dur: number) {
  const o = c.createOscillator();
  o.type = 'sine';
  o.frequency.setValueAtTime(from, t);
  o.frequency.exponentialRampToValueAtTime(to, t + dur);
  const g = env(c, t, peak, 0.006, dur);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function hiss(c: AudioContext, out: AudioNode, t: number, type: BiquadFilterType, freq: number, peak: number, dur: number, q = 0.9) {
  const n = noise(c, dur + 0.05);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(freq, t);
  f.Q.value = q;
  const g = env(c, t, peak, 0.004, dur);
  n.connect(f).connect(g).connect(out);
  n.start(t);
  n.stop(t + dur + 0.05);
}

export function play(kind: Sfx) {
  if (!soundOn()) return;
  const c = audio();
  if (!c) return;
  const t = c.currentTime + 0.01;
  const out = c.createGain();
  out.gain.value = 0.32;
  out.connect(c.destination);
  switch (kind) {
    case 'paper': {
      // 纸张翻动：带通噪声由高到低扫过
      const n = noise(c, 0.32);
      const f = c.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.setValueAtTime(3200, t);
      f.frequency.exponentialRampToValueAtTime(800, t + 0.28);
      f.Q.value = 0.7;
      const g = env(c, t, 0.5, 0.04, 0.26);
      n.connect(f).connect(g).connect(out);
      n.start(t);
      n.stop(t + 0.34);
      break;
    }
    case 'stamp':
      // 印章落下：木质闷响 + 短促纸面摩擦
      thump(c, out, t, 150, 48, 0.9, 0.2);
      hiss(c, out, t, 'lowpass', 900, 0.35, 0.06);
      break;
    case 'dice':
      [0, 0.07, 0.16, 0.22].forEach((d, i) => hiss(c, out, t + d, 'highpass', 2400 + i * 300, 0.4 - i * 0.07, 0.03, 4));
      break;
    case 'heart':
      thump(c, out, t, 90, 42, 0.8, 0.14);
      thump(c, out, t + 0.2, 80, 40, 0.55, 0.12);
      break;
    case 'snip':
      hiss(c, out, t, 'highpass', 5200, 0.35, 0.025, 6);
      hiss(c, out, t + 0.05, 'highpass', 4200, 0.25, 0.02, 6);
      break;
  }
}
