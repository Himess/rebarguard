'use client';

import { Suspense, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Environment } from '@react-three/drei';
import type { Beam, Column, ShearWall, StructuralPlan } from '@/lib/api';

type Props = {
  plan: StructuralPlan;
  highlightElementId?: string | null;
  onSelectElement?: (id: string, type: string) => void;
};

const FLOOR_ORDER = [
  'foundation',
  'basement_3',
  'basement_2',
  'basement_1',
  'ground',
  '1',
  '2',
  '3',
  '4',
  '5',
  '6',
  '7',
  '8',
  'roof',
] as const;

function floorIndex(floor: string): number {
  const idx = FLOOR_ORDER.indexOf(floor as (typeof FLOOR_ORDER)[number]);
  if (idx >= 0) return idx;
  const n = parseInt(floor, 10);
  if (!Number.isNaN(n)) return 4 + n; // numeric floors align with 'ground'+n
  return 4;
}

function Columns({
  columns,
  highlight,
  floorHeight,
  basementCount,
  onSelect,
}: {
  columns: Column[];
  highlight?: string | null;
  floorHeight: number;
  basementCount: number;
  onSelect?: (id: string, type: string) => void;
}) {
  return (
    <>
      {columns.map((c) => {
        if (!c.position) return null;
        const w = c.width_mm / 1000;
        const d = c.depth_mm / 1000;
        const fi = floorIndex(c.floor);
        const z = (fi - 4 - basementCount) * floorHeight + floorHeight / 2;
        const isHi = c.id === highlight || c.id.split('-')[0] === highlight;
        return (
          <mesh
            key={c.id}
            position={[c.position.x_m, z, c.position.y_m]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(c.id.split('-')[0], 'column');
            }}
          >
            <boxGeometry args={[w, floorHeight * 0.95, d]} />
            <meshStandardMaterial
              color={isHi ? '#fbbf24' : '#f97316'}
              emissive={isHi ? '#fbbf24' : '#000000'}
              emissiveIntensity={isHi ? 0.5 : 0}
              metalness={0.2}
              roughness={0.5}
            />
          </mesh>
        );
      })}
    </>
  );
}

function Beams({
  beams,
  floorHeight,
  basementCount,
}: {
  beams: Beam[];
  floorHeight: number;
  basementCount: number;
}) {
  return (
    <>
      {beams.map((b) => {
        if (!b.start || !b.end) return null;
        const dx = b.end.x_m - b.start.x_m;
        const dy = b.end.y_m - b.start.y_m;
        const length = Math.hypot(dx, dy);
        if (length < 0.01) return null;
        const angle = Math.atan2(dy, dx);
        const cx = (b.start.x_m + b.end.x_m) / 2;
        const cy = (b.start.y_m + b.end.y_m) / 2;
        const fi = floorIndex(b.floor);
        const z = (fi - 4 - basementCount) * floorHeight + floorHeight;
        return (
          <mesh
            key={b.id}
            position={[cx, z - b.depth_mm / 2000, cy]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[length, b.depth_mm / 1000, b.width_mm / 1000]} />
            <meshStandardMaterial color="#7c3aed" transparent opacity={0.55} />
          </mesh>
        );
      })}
    </>
  );
}

function ShearWalls({
  walls,
  highlight,
  floorHeight,
  basementCount,
  totalFloors,
  onSelect,
}: {
  walls: ShearWall[];
  highlight?: string | null;
  floorHeight: number;
  basementCount: number;
  totalFloors: number;
  onSelect?: (id: string, type: string) => void;
}) {
  return (
    <>
      {walls.map((w) => {
        if (!w.start || !w.end) return null;
        const dx = w.end.x_m - w.start.x_m;
        const dy = w.end.y_m - w.start.y_m;
        const length = Math.hypot(dx, dy) || 1;
        const angle = Math.atan2(dy, dx);
        const cx = (w.start.x_m + w.end.x_m) / 2;
        const cy = (w.start.y_m + w.end.y_m) / 2;
        const from = floorIndex(w.floor_from) - 4 - basementCount;
        const to = floorIndex(w.floor_to) - 4 - basementCount;
        const zMin = Math.min(from, to) * floorHeight;
        const zMax = Math.max(from, to + 1) * floorHeight;
        const height = zMax - zMin;
        const isHi = w.id === highlight;
        return (
          <mesh
            key={w.id}
            position={[cx, zMin + height / 2, cy]}
            rotation={[0, -angle, 0]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(w.id, 'shear_wall');
            }}
          >
            <boxGeometry args={[length, height, w.thickness_mm / 1000]} />
            <meshStandardMaterial
              color={isHi ? '#fbbf24' : '#0891b2'}
              emissive={isHi ? '#fbbf24' : '#000000'}
              emissiveIntensity={isHi ? 0.5 : 0}
              transparent
              opacity={isHi ? 0.9 : 0.55}
            />
          </mesh>
        );
      })}
    </>
  );
}

function Slabs({
  plan,
  floorHeight,
  basementCount,
  totalFloors,
}: {
  plan: StructuralPlan;
  floorHeight: number;
  basementCount: number;
  totalFloors: number;
}) {
  // Approximate slabs at each floor as footprint rectangle.
  const w = plan.metadata.footprint_width_m ?? 8;
  const d = plan.metadata.footprint_depth_m ?? 15;
  const floors = Array.from({ length: totalFloors + basementCount + 1 }, (_, i) => i - basementCount);
  return (
    <>
      {floors.map((fi) => (
        <mesh key={fi} position={[w / 2, fi * floorHeight, d / 2]}>
          <boxGeometry args={[w, 0.12, d]} />
          <meshStandardMaterial color="#475569" transparent opacity={0.18} />
        </mesh>
      ))}
    </>
  );
}

export default function FullBuildingViewer({ plan, highlightElementId, onSelectElement }: Props) {
  const meta = plan.metadata;
  const floorHeight = meta.default_floor_height_m || 3.0;
  const basementCount = meta.basement_count || 0;
  const totalFloors = meta.floor_count || 5;

  const cameraPos = useMemo<[number, number, number]>(
    () => [
      (meta.footprint_width_m ?? 10) * 1.5,
      totalFloors * floorHeight * 0.6,
      (meta.footprint_depth_m ?? 10) * 1.5,
    ],
    [meta.footprint_width_m, meta.footprint_depth_m, totalFloors, floorHeight],
  );

  const [hover, setHover] = useState<string | null>(null);

  return (
    <div className="relative h-full w-full">
      <Canvas shadows camera={{ position: cameraPos, fov: 45 }}>
        <color attach="background" args={['#0a0a0b']} />
        <ambientLight intensity={0.45} />
        <directionalLight
          position={[20, 30, 20]}
          intensity={0.9}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <Suspense fallback={null}>
          <group
            onPointerMissed={() => {
              setHover(null);
              onSelectElement?.('', '');
            }}
          >
            <Slabs
              plan={plan}
              floorHeight={floorHeight}
              basementCount={basementCount}
              totalFloors={totalFloors}
            />
            <Columns
              columns={plan.columns}
              highlight={highlightElementId}
              floorHeight={floorHeight}
              basementCount={basementCount}
              onSelect={onSelectElement}
            />
            <Beams beams={plan.beams} floorHeight={floorHeight} basementCount={basementCount} />
            <ShearWalls
              walls={plan.shear_walls}
              highlight={highlightElementId}
              floorHeight={floorHeight}
              basementCount={basementCount}
              totalFloors={totalFloors}
              onSelect={onSelectElement}
            />
          </group>
          <Grid
            position={[0, -basementCount * floorHeight - 0.01, 0]}
            args={[40, 40]}
            cellColor="#27272a"
            sectionColor="#3f3f46"
            fadeDistance={50}
            infiniteGrid
          />
        </Suspense>
        <OrbitControls
          target={[
            (meta.footprint_width_m ?? 8) / 2,
            (totalFloors * floorHeight) / 2,
            (meta.footprint_depth_m ?? 15) / 2,
          ]}
          enableDamping
        />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-col gap-0.5 rounded bg-black/60 px-2 py-1 text-[10px] text-white">
        <div>
          <span className="inline-block h-2 w-2 rounded-sm bg-[#f97316] align-middle" /> columns &nbsp;
          <span className="inline-block h-2 w-2 rounded-sm bg-[#7c3aed] align-middle" /> beams &nbsp;
          <span className="inline-block h-2 w-2 rounded-sm bg-[#0891b2] align-middle" /> walls &nbsp;
          <span className="inline-block h-2 w-2 rounded-sm bg-[#475569] align-middle" /> slabs
        </div>
        <div className="text-[9px] text-white/60">drag to rotate • scroll to zoom • click element to select</div>
      </div>
    </div>
  );
}
