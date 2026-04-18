'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { Column } from '@/lib/api';

type Props = {
  column: Column | null;
  detectedRebarCount?: number | null;
};

function ColumnMesh({ column, detectedRebarCount }: Props) {
  if (!column) return null;
  const w = column.width_mm / 1000;
  const d = column.depth_mm / 1000;
  const h = 3.0;
  const expected = column.longitudinal.reduce((s, r) => s + r.count, 0);
  const cover = column.concrete_cover_mm / 1000;

  const positions: [number, number, number][] = [];
  const perSide = Math.max(2, Math.round(expected / 4));
  const actual = detectedRebarCount ?? expected;

  const stepX = (w - 2 * cover) / (perSide - 1);
  const stepZ = (d - 2 * cover) / (perSide - 1);
  for (let i = 0; i < perSide; i++) {
    positions.push([-w / 2 + cover + i * stepX, 0, -d / 2 + cover]);
    positions.push([-w / 2 + cover + i * stepX, 0, d / 2 - cover]);
  }
  for (let i = 1; i < perSide - 1; i++) {
    positions.push([-w / 2 + cover, 0, -d / 2 + cover + i * stepZ]);
    positions.push([w / 2 - cover, 0, -d / 2 + cover + i * stepZ]);
  }

  return (
    <group>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#2a2a2e" transparent opacity={0.15} wireframe />
      </mesh>
      {positions.slice(0, expected).map((p, i) => {
        const present = i < actual;
        return (
          <mesh key={i} position={[p[0], 0, p[2]]}>
            <cylinderGeometry args={[0.012, 0.012, h, 12]} />
            <meshStandardMaterial
              color={present ? '#f97316' : '#ef4444'}
              emissive={present ? '#000' : '#7f1d1d'}
              emissiveIntensity={present ? 0 : 0.6}
            />
          </mesh>
        );
      })}
    </group>
  );
}

export default function ThreeOverlay({ column, detectedRebarCount }: Props) {
  return (
    <div className="relative h-[360px] w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-black">
      <Canvas camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          <ColumnMesh column={column} detectedRebarCount={detectedRebarCount} />
        </Suspense>
        <OrbitControls enablePan={false} />
      </Canvas>
      <div className="absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white">
        Turuncu: projede belirlenmiş donatı • Kırmızı (yanar): sahada tespit edilemeyen
      </div>
    </div>
  );
}
