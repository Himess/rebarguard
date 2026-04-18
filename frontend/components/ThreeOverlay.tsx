'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { StructuralElement } from '@/lib/api';

type Props = {
  element: StructuralElement | null;
  detectedRebarCount?: number | null;
};

function ColumnMesh({
  element,
  detectedRebarCount,
}: {
  element: StructuralElement;
  detectedRebarCount?: number | null;
}) {
  if (element.element_type !== 'column') return null;
  const w = element.width_mm / 1000;
  const d = element.depth_mm / 1000;
  const h = 3.0;
  const expected = element.longitudinal.reduce((s, r) => s + r.count, 0);
  const cover = element.concrete_cover_mm / 1000;

  const positions: [number, number, number][] = [];
  const perSide = Math.max(2, Math.round(expected / 4));
  const actual = detectedRebarCount ?? expected;

  const stepX = (w - 2 * cover) / Math.max(1, perSide - 1);
  const stepZ = (d - 2 * cover) / Math.max(1, perSide - 1);
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

function GenericMesh({ element }: { element: StructuralElement }) {
  if (element.element_type === 'beam') {
    const length = 4;
    const w = element.width_mm / 1000;
    const d = element.depth_mm / 1000;
    return (
      <mesh>
        <boxGeometry args={[length, d, w]} />
        <meshStandardMaterial color="#7c3aed" transparent opacity={0.4} />
      </mesh>
    );
  }
  if (element.element_type === 'shear_wall') {
    const l = (element.length_m ?? 3) * 1;
    const t = element.thickness_mm / 1000;
    return (
      <mesh>
        <boxGeometry args={[l, 3, t]} />
        <meshStandardMaterial color="#0891b2" transparent opacity={0.35} />
      </mesh>
    );
  }
  if (element.element_type === 'slab') {
    const t = element.thickness_mm / 1000;
    return (
      <mesh>
        <boxGeometry args={[4, t, 4]} />
        <meshStandardMaterial color="#64748b" transparent opacity={0.3} />
      </mesh>
    );
  }
  if (element.element_type === 'stair') {
    return (
      <group>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[-0.6 + i * 0.4, -1 + i * 0.5, 0]}>
            <boxGeometry args={[0.35, 0.1, 1.2]} />
            <meshStandardMaterial color="#10b981" transparent opacity={0.5} />
          </mesh>
        ))}
      </group>
    );
  }
  return null;
}

export default function ThreeOverlay({ element, detectedRebarCount }: Props) {
  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: [2.5, 2, 2.5], fov: 45 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 8, 5]} intensity={0.8} />
        <Suspense fallback={null}>
          {element && element.element_type === 'column' && (
            <ColumnMesh element={element} detectedRebarCount={detectedRebarCount} />
          )}
          {element && element.element_type !== 'column' && <GenericMesh element={element} />}
        </Suspense>
        <OrbitControls enablePan={false} />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-2 rounded bg-black/60 px-2 py-1 text-[10px] text-white">
        {element?.element_type === 'column'
          ? 'Orange: plan spec • Red (glowing): missing on site'
          : element
            ? `Inspected: ${element.element_type} ${element.id}`
            : 'Select an element to view'}
      </div>
    </div>
  );
}
