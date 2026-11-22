import { Canvas, useFrame, type ThreeEvent } from '@react-three/fiber';
import { Float, Html, Line, MeshDistortMaterial, OrbitControls, Sparkles, Stars } from '@react-three/drei';
import { useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { PARTS, PHASES } from '../data/curriculum';
import type { PartId, PhaseId } from '../data/types';
import { cv } from '../utils/css';
import { glow } from '../utils/palette';

type Sel = PartId | PhaseId;
type Vec3 = [number, number, number];

interface Props {
  selected: Sel | null;
  onSelect: (id: Sel) => void;
  dormant?: boolean;
}

const ORIGIN: Vec3 = [0, 0, 0];
const HELIX_R = 3.75;
const HELIX_H = 5.6;
const HELIX_TURNS = 2.25;
const PHASE_U = [0.12, 0.37, 0.62, 0.87];
const DORMANT = '#4a5068';

function helixPoint(u: number): Vec3 {
  const a = u * Math.PI * 2 * HELIX_TURNS;
  return [Math.cos(a) * HELIX_R, -HELIX_H / 2 + u * HELIX_H, Math.sin(a) * HELIX_R];
}

function pointerHandlers(onSelect: () => void, setHover: (v: boolean) => void) {
  return {
    onClick: (e: ThreeEvent<MouseEvent>) => {
      e.stopPropagation();
      onSelect();
    },
    onPointerOver: (e: ThreeEvent<PointerEvent>) => {
      e.stopPropagation();
      setHover(true);
      document.body.style.cursor = 'pointer';
    },
    onPointerOut: () => {
      setHover(false);
      document.body.style.cursor = '';
    },
  };
}

/* ---------------- 认知心脏 ---------------- */
function Heart({ dormant, active, onSelect }: { dormant: boolean; active: boolean; onSelect: () => void }) {
  const group = useRef<THREE.Group>(null);
  const shell = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    const k = dormant ? 0.12 : 1;
    // 双峰心跳曲线：lub-dub
    const lub = Math.pow(Math.max(0, Math.sin(t * 2.2)), 14) * 0.11;
    const dub = Math.pow(Math.max(0, Math.sin(t * 2.2 - 0.55)), 14) * 0.05;
    const s = (1 + (lub + dub) * k) * (active || hover ? 1.06 : 1);
    group.current?.scale.set(s, s, s);
    if (shell.current) {
      shell.current.rotation.y = t * 0.12;
      shell.current.rotation.x = t * 0.05;
    }
  });

  const color = dormant ? DORMANT : '#ff5d73';
  return (
    <group ref={group} {...pointerHandlers(onSelect, setHover)}>
      <mesh>
        <icosahedronGeometry args={[0.95, 20]} />
        <MeshDistortMaterial
          color={color}
          emissive={dormant ? '#14161f' : '#5a0820'}
          emissiveIntensity={1}
          roughness={0.22}
          metalness={0.15}
          distort={dormant ? 0.12 : 0.4}
          speed={dormant ? 0.6 : 2.4}
        />
      </mesh>
      <mesh ref={shell}>
        <icosahedronGeometry args={[1.38, 1]} />
        <meshBasicMaterial color={dormant ? '#5b6280' : '#ff9aac'} wireframe transparent opacity={0.22} />
      </mesh>
      <mesh>
        <sphereGeometry args={[1.85, 32, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.07} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <Html center position={[0, -1.55, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`scene-label heart ${active ? 'on' : ''}`}>
          <b>认知心脏</b>
          <span>LLM Cognitive Heart</span>
        </div>
      </Html>
    </group>
  );
}

/* ---------------- 四个外围零件 ---------------- */
function PartNode({
  position,
  color,
  name,
  en,
  active,
  dormant,
  onSelect,
}: {
  position: Vec3;
  color: string;
  name: string;
  en: string;
  active: boolean;
  dormant: boolean;
  onSelect: () => void;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  useFrame(({ clock }) => {
    if (ring.current) {
      ring.current.rotation.x = Math.PI / 2.4;
      ring.current.rotation.z = clock.getElapsedTime() * 0.8;
    }
  });
  const s = active ? 1.3 : hover ? 1.15 : 1;
  const c = dormant ? DORMANT : color;
  return (
    <group position={position}>
      <Float speed={1.6} rotationIntensity={0.2} floatIntensity={dormant ? 0 : 0.5}>
        <group scale={s} {...pointerHandlers(onSelect, setHover)}>
          <mesh>
            <sphereGeometry args={[0.32, 32, 32]} />
            <meshStandardMaterial color={c} emissive={c} emissiveIntensity={active ? 1.4 : 0.75} roughness={0.3} />
          </mesh>
          <mesh ref={ring}>
            <torusGeometry args={[0.56, 0.012, 8, 96]} />
            <meshBasicMaterial color={c} transparent opacity={active ? 0.95 : 0.5} />
          </mesh>
          <mesh>
            <sphereGeometry args={[0.72, 24, 24]} />
            <meshBasicMaterial color={c} transparent opacity={active ? 0.14 : 0.05} blending={THREE.AdditiveBlending} depthWrite={false} />
          </mesh>
        </group>
        <Html center position={[0, -0.9, 0]} style={{ pointerEvents: 'none' }}>
          <div className={`scene-label ${active ? 'on' : ''}`} style={cv({ '--c': color })}>
            <b>{name}</b>
            <span>{en}</span>
          </div>
        </Html>
      </Float>
    </group>
  );
}

/* ---------------- 零件与心脏之间的能量导管 ---------------- */
function Conduit({ to, color, dormant, inward }: { to: Vec3; color: string; dormant: boolean; inward: boolean }) {
  const dots = useRef<THREE.Group>(null);
  const a = useMemo(() => new THREE.Vector3(...ORIGIN), []);
  const b = useMemo(() => new THREE.Vector3(...to), [to]);
  useFrame(({ clock }) => {
    const g = dots.current;
    if (!g) return;
    const t = clock.getElapsedTime() * (dormant ? 0.04 : 0.32);
    g.children.forEach((child, i) => {
      let u = (t + i / g.children.length) % 1;
      if (inward) u = 1 - u;
      child.position.lerpVectors(a, b, 0.18 + u * 0.7);
    });
  });
  const c = dormant ? DORMANT : color;
  return (
    <group>
      <Line points={[ORIGIN, to]} color={c} lineWidth={1} transparent opacity={dormant ? 0.15 : 0.45} dashed dashSize={0.12} gapSize={0.08} />
      <group ref={dots}>
        {[0, 1, 2].map((i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.045, 12, 12]} />
            <meshBasicMaterial color={c} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/* ---------------- 提问—探究—判断—创造 螺旋认知环 ---------------- */
function Helix({ selected, onSelect, dormant }: { selected: Sel | null; onSelect: (id: Sel) => void; dormant: boolean }) {
  const { points, colors } = useMemo(() => {
    const pts: Vec3[] = [];
    const cols: Vec3[] = [];
    const cs = PHASES.map((p) => new THREE.Color(glow(p.color)));
    const N = 360;
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      pts.push(helixPoint(u));
      const f = u * (cs.length - 1);
      const k = Math.min(cs.length - 2, Math.floor(f));
      const c = cs[k].clone().lerp(cs[k + 1], f - k);
      cols.push([c.r, c.g, c.b]);
    }
    return { points: pts, colors: cols };
  }, []);

  const traveller = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    const u = (clock.getElapsedTime() * (dormant ? 0.004 : 0.035)) % 1;
    const p = helixPoint(u);
    traveller.current?.position.set(p[0], p[1], p[2]);
  });

  return (
    <group>
      <Line points={points} color="white" vertexColors={colors} lineWidth={2} transparent opacity={dormant ? 0.2 : 0.85} />
      <mesh ref={traveller}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#ffffff" />
      </mesh>
      {PHASES.map((ph, i) => (
        <PhaseNode key={ph.id} id={ph.id} name={ph.name} en={ph.en} color={glow(ph.color)} position={helixPoint(PHASE_U[i])} active={selected === ph.id} onSelect={onSelect} dormant={dormant} />
      ))}
    </group>
  );
}

function PhaseNode({
  id,
  name,
  en,
  color,
  position,
  active,
  onSelect,
  dormant,
}: {
  id: PhaseId;
  name: string;
  en: string;
  color: string;
  position: Vec3;
  active: boolean;
  onSelect: (id: Sel) => void;
  dormant: boolean;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  useFrame(({ clock }) => {
    if (mesh.current) mesh.current.rotation.y = clock.getElapsedTime() * 1.2;
  });
  const c = dormant ? DORMANT : color;
  const s = active ? 1.35 : hover ? 1.15 : 1;
  return (
    <group position={position}>
      <mesh ref={mesh} scale={s} {...pointerHandlers(() => onSelect(id), setHover)}>
        <octahedronGeometry args={[0.2, 0]} />
        <meshStandardMaterial color={c} emissive={c} emissiveIntensity={active ? 1.6 : 0.85} flatShading />
      </mesh>
      <Html center position={[0, 0.48, 0]} style={{ pointerEvents: 'none' }}>
        <div className={`scene-label phase ${active ? 'on' : ''}`} style={cv({ '--c': color })}>
          <b>{name}</b>
          <span>{en}</span>
        </div>
      </Html>
    </group>
  );
}

export default function CognitiveHeart({ selected, onSelect, dormant = false }: Props) {
  const outer = PARTS.filter((p) => p.id !== 'heart');
  return (
    <Canvas camera={{ position: [0, 1.2, 10.8], fov: 42 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.35} />
      <pointLight position={[5, 5, 6]} intensity={80} color="#ffffff" />
      <pointLight position={[-6, -3, -4]} intensity={50} color="#47d7ff" />
      <Stars radius={60} depth={40} count={2200} factor={3} saturation={0} fade speed={dormant ? 0.1 : 0.6} />
      <Sparkles count={70} scale={[10, 7, 10]} size={2} speed={dormant ? 0.05 : 0.3} color="#9dd8ff" opacity={0.5} />
      <group>
        <Heart dormant={dormant} active={selected === 'heart'} onSelect={() => onSelect('heart')} />
        {outer.map((p) => (
          <Conduit key={`c-${p.id}`} to={p.position} color={glow(p.color)} dormant={dormant} inward={p.id === 'senses' || p.id === 'fuel'} />
        ))}
        {outer.map((p) => (
          <PartNode
            key={p.id}
            position={p.position}
            color={glow(p.color)}
            name={p.name}
            en={p.en}
            active={selected === p.id}
            dormant={dormant}
            onSelect={() => onSelect(p.id)}
          />
        ))}
        <Helix selected={selected} onSelect={onSelect} dormant={dormant} />
      </group>
      <OrbitControls enablePan={false} minDistance={7} maxDistance={16} autoRotate={!dormant} autoRotateSpeed={0.35} enableDamping />
    </Canvas>
  );
}
