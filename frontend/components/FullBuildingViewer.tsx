'use client';

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
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
  if (!Number.isNaN(n)) return 4 + n;
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
        const baseId = c.id.split('-')[0];
        const isHi = baseId === highlight || c.id === highlight;
        return (
          <mesh
            key={c.id}
            position={[c.position.x_m, z, c.position.y_m]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(baseId, 'column');
            }}
          >
            <boxGeometry args={[w, floorHeight * 0.92, d]} />
            <meshBasicMaterial color={isHi ? '#fbbf24' : '#f97316'} />
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
          <mesh key={b.id} position={[cx, z - b.depth_mm / 2000, cy]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[length, b.depth_mm / 1000, b.width_mm / 1000]} />
            <meshBasicMaterial color="#7c3aed" transparent opacity={0.65} />
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
  onSelect,
}: {
  walls: ShearWall[];
  highlight?: string | null;
  floorHeight: number;
  basementCount: number;
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
            <meshBasicMaterial
              color={isHi ? '#fbbf24' : '#0891b2'}
              transparent
              opacity={isHi ? 0.85 : 0.5}
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
  const w = plan.metadata.footprint_width_m ?? 8;
  const d = plan.metadata.footprint_depth_m ?? 15;
  const floors = Array.from({ length: totalFloors + basementCount + 1 }, (_, i) => i - basementCount);
  return (
    <>
      {floors.map((fi) => (
        <mesh key={fi} position={[w / 2, fi * floorHeight, d / 2]}>
          <boxGeometry args={[w, 0.1, d]} />
          <meshBasicMaterial color="#475569" transparent opacity={0.15} />
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
      (meta.footprint_width_m ?? 10) * 2,
      totalFloors * floorHeight * 0.7,
      (meta.footprint_depth_m ?? 10) * 2,
    ],
    [meta.footprint_width_m, meta.footprint_depth_m, totalFloors, floorHeight],
  );
  const target = useMemo<[number, number, number]>(
    () => [
      (meta.footprint_width_m ?? 8) / 2,
      (totalFloors * floorHeight) / 2,
      (meta.footprint_depth_m ?? 15) / 2,
    ],
    [meta.footprint_width_m, meta.footprint_depth_m, totalFloors, floorHeight],
  );

  return (
    <div className="relative h-full w-full">
      <Canvas camera={{ position: cameraPos, fov: 45 }} gl={{ antialias: true, powerPreference: 'default' }}>
        <color attach="background" args={['#0a0a0b']} />
        <Suspense fallback={null}>
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
            onSelect={onSelectElement}
          />
        </Suspense>
        <OrbitControls target={target} enableDamping />
      </Canvas>
      <div className="pointer-events-none absolute bottom-2 left-2 flex flex-col gap-0.5 rounded bg-black/60 px-2 py-1 text-[10px] text-white">
        <div>
          <span className="inline-block h-2 w-2 rounded-sm bg-[#f97316] align-middle" /> columns &nbsp;
          <span className="inline-block h-2 w-2 rounded-sm bg-[#7c3aed] align-middle" /> beams &nbsp;
          <span className="inline-block h-2 w-2 rounded-sm bg-[#0891b2] align-middle" /> walls &nbsp;
          <span className="inline-block h-2 w-2 rounded-sm bg-[#475569] align-middle" /> slabs
        </div>
        <div className="text-[9px] text-white/60">drag to rotate • scroll to zoom • click to select</div>
      </div>
    </div>
  );
}
