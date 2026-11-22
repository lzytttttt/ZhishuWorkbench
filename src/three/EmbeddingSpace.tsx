import { Canvas } from '@react-three/fiber';
import { Html, Line, OrbitControls } from '@react-three/drei';
import type { WordVec } from '../data/types';

type Vec3 = [number, number, number];
const S = 0.6;
const toWorld = (v: Vec3): Vec3 => [(v[0] - 5) * S, (v[1] - 5) * S, (v[2] - 5) * S];
const FLOOR = -3;

interface Props {
  words: WordVec[];
  selected: string[];
  onToggle: (name: string) => void;
  axes: [string, string, string];
}

export default function EmbeddingSpace({ words, selected, onToggle, axes }: Props) {
  const sel = selected.map((n) => words.find((w) => w.name === n)).filter((w): w is WordVec => Boolean(w));
  const AX = [
    { to: [3.5, FLOOR, FLOOR] as Vec3, color: '#47d7ff', label: axes[0] },
    { to: [FLOOR, 3.5, FLOOR] as Vec3, color: '#3ee6a8', label: axes[1] },
    { to: [FLOOR, FLOOR, 3.5] as Vec3, color: '#ff6fb5', label: axes[2] },
  ];
  return (
    <Canvas camera={{ position: [6.8, 4.2, 7.6], fov: 45 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.6} />
      <pointLight position={[6, 8, 6]} intensity={70} />
      <gridHelper args={[6, 10, '#2c3866', '#161d38']} position={[0, FLOOR, 0]} />
      {AX.map((a) => (
        <group key={a.label}>
          <Line points={[[FLOOR, FLOOR, FLOOR], a.to]} color={a.color} lineWidth={1.6} />
          <Html position={a.to} center style={{ pointerEvents: 'none' }}>
            <div className="axis-label" style={{ color: a.color }}>
              {a.label} →
            </div>
          </Html>
        </group>
      ))}
      {words.map((w) => {
        const p = toWorld(w.v);
        const on = selected.includes(w.name);
        return (
          <group key={w.name} position={p}>
            <mesh
              onClick={(e) => {
                e.stopPropagation();
                onToggle(w.name);
              }}
              onPointerOver={() => {
                document.body.style.cursor = 'pointer';
              }}
              onPointerOut={() => {
                document.body.style.cursor = '';
              }}
            >
              <sphereGeometry args={[on ? 0.17 : 0.12, 24, 24]} />
              <meshStandardMaterial
                color={on ? '#f5c451' : w.custom ? '#ff6fb5' : '#9dc4ff'}
                emissive={on ? '#f5c451' : w.custom ? '#ff6fb5' : '#203060'}
                emissiveIntensity={on ? 1 : 0.45}
              />
            </mesh>
            <Line points={[[0, 0, 0], [0, FLOOR - p[1], 0]]} color="#47d7ff" lineWidth={0.6} transparent opacity={0.22} />
            <Html position={[0, 0.34, 0]} center style={{ pointerEvents: 'none' }}>
              <div className={`word-label ${on ? 'on' : ''} ${w.custom ? 'custom' : ''}`}>{w.name}</div>
            </Html>
          </group>
        );
      })}
      {sel.length === 2 && <Line points={[toWorld(sel[0].v), toWorld(sel[1].v)]} color="#f5c451" lineWidth={2.5} dashed dashSize={0.15} gapSize={0.08} />}
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.5} minDistance={5} maxDistance={18} enableDamping />
    </Canvas>
  );
}
