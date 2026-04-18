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

type MergedColumn = {
  baseId: string;
  x: number;
  y: number;
  width_mm: number;
  depth_mm: number;
  zMin: number;
  zMax: number;
};

function mergeColumnsByPosition(columns: Column[], floorHeight: number, basementCount: number): MergedColumn[] {
  const groups = new Map<string, MergedColumn>();
  for (const c of columns) {
    if (!c.position) continue;
    const baseId = c.id.split('-')[0];
    const fi = floorIndex(c.floor) - 4 - basementCount;
    const zMin = fi * floorHeight;
    const zMax = (fi + 1) * floorHeight;
    const key = baseId;
    const existing = groups.get(key);
    if (existing) {
      existing.zMin = Math.min(existing.zMin, zMin);
      existing.zMax = Math.max(existing.zMax, zMax);
    } else {
      groups.set(key, {
        baseId,
        x: c.position.x_m,
        y: c.position.y_m,
        width_mm: c.width_mm,
        depth_mm: c.depth_mm,
        zMin,
        zMax,
      });
    }
  }
  return [...groups.values()];
}

function Columns({
  merged,
  highlight,
  onSelect,
}: {
  merged: MergedColumn[];
  highlight?: string | null;
  onSelect?: (id: string, type: string) => void;
}) {
  return (
    <>
      {merged.map((c) => {
        const w = c.width_mm / 1000;
        const d = c.depth_mm / 1000;
        const height = c.zMax - c.zMin;
        const isHi = c.baseId === highlight;
        return (
          <mesh
            key={c.baseId}
            position={[c.x, c.zMin + height / 2, c.y]}
            onClick={(e) => {
              e.stopPropagation();
              onSelect?.(c.baseId, 'column');
            }}
          >
            <boxGeometry args={[w, height, d]} />
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
        const fi = floorIndex(b.floor) - 4 - basementCount;
        const z = (fi + 1) * floorHeight;
        return (
          <mesh key={b.id} position={[cx, z - b.depth_mm / 2000, cy]} rotation={[0, -angle, 0]}>
            <boxGeometry args={[length, b.depth_mm / 1000, b.width_mm / 1000]} />
            <meshBasicMaterial color="#7c3aed" />
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
            <meshBasicMaterial color={isHi ? '#fbbf24' : '#0891b2'} />
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
          <boxGeometry args={[w, 0.15, d]} />
          <meshBasicMaterial color="#475569" transparent opacity={0.45} />
        </mesh>
      ))}
    </>
  );
}

/**
 * Exterior-wall infill between perimeter columns. Makes the model read as a building,
 * not a wireframe. These are visual-only — not part of the StructuralPlan.
 */
function ExteriorInfill({
  merged,
  floorHeight,
  basementCount,
  totalFloors,
}: {
  merged: MergedColumn[];
  floorHeight: number;
  basementCount: number;
  totalFloors: number;
}) {
  // Find perimeter columns by convex hull approximation — for rectangular grids, sort by
  // (x, y) extremes gives us the corners.
  if (merged.length < 4) return null;
  const byY = [...merged].sort((a, b) => a.y - b.y);
  const front = byY.filter((c) => c.y === byY[0].y).sort((a, b) => a.x - b.x);
  const back = byY.filter((c) => c.y === byY[byY.length - 1].y).sort((a, b) => a.x - b.x);
  if (front.length < 2 || back.length < 2) return null;

  const segments: Array<{ a: MergedColumn; b: MergedColumn }> = [];
  for (let i = 0; i < front.length - 1; i++) segments.push({ a: front[i], b: front[i + 1] });
  for (let i = 0; i < back.length - 1; i++) segments.push({ a: back[i], b: back[i + 1] });
  // left + right connectors
  segments.push({ a: front[0], b: back[0] });
  segments.push({ a: front[front.length - 1], b: back[back.length - 1] });

  const aboveGround = totalFloors * floorHeight;
  const belowGround = -basementCount * floorHeight;
  const height = aboveGround - belowGround;

  return (
    <>
      {segments.map(({ a, b }, i) => {
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const length = Math.hypot(dx, dy);
        if (length < 0.1) return null;
        const angle = Math.atan2(dy, dx);
        const cx = (a.x + b.x) / 2;
        const cy = (a.y + b.y) / 2;
        return (
          <mesh
            key={i}
            position={[cx, belowGround + height / 2, cy]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[length, height, 0.15]} />
            <meshBasicMaterial color="#18181b" transparent opacity={0.35} />
          </mesh>
        );
      })}
    </>
  );
}

function GroundMarkers({
  plan,
  basementCount,
  floorHeight,
}: {
  plan: StructuralPlan;
  basementCount: number;
  floorHeight: number;
}) {
  const w = plan.metadata.footprint_width_m ?? 8;
  const d = plan.metadata.footprint_depth_m ?? 15;
  const z = -basementCount * floorHeight - 0.08;
  return (
    <>
      <mesh position={[w / 2, z, d / 2]}>
        <boxGeometry args={[w + 6, 0.05, d + 6]} />
        <meshBasicMaterial color="#1f1f23" />
      </mesh>
    </>
  );
}

export default function FullBuildingViewer({ plan, highlightElementId, onSelectElement }: Props) {
  const meta = plan.metadata;
  const floorHeight = meta.default_floor_height_m || 3.0;
  const basementCount = meta.basement_count || 0;
  const totalFloors = meta.floor_count || 5;

  const merged = useMemo(
    () => mergeColumnsByPosition(plan.columns, floorHeight, basementCount),
    [plan.columns, floorHeight, basementCount],
  );

  const cameraPos = useMemo<[number, number, number]>(() => {
    const w = meta.footprint_width_m ?? 10;
    const d = meta.footprint_depth_m ?? 10;
    const h = totalFloors * floorHeight;
    return [w * 2.5, h * 0.6, d * 2];
  }, [meta.footprint_width_m, meta.footprint_depth_m, totalFloors, floorHeight]);

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
      <Canvas camera={{ position: cameraPos, fov: 40 }} gl={{ antialias: true, powerPreference: 'default' }}>
        <color attach="background" args={['#0a0a0b']} />
        <Suspense fallback={null}>
          <GroundMarkers plan={plan} basementCount={basementCount} floorHeight={floorHeight} />
          <Slabs
            plan={plan}
            floorHeight={floorHeight}
            basementCount={basementCount}
            totalFloors={totalFloors}
          />
          <ExteriorInfill
            merged={merged}
            floorHeight={floorHeight}
            basementCount={basementCount}
            totalFloors={totalFloors}
          />
          <Columns merged={merged} highlight={highlightElementId} onSelect={onSelectElement} />
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
        <div className="text-[9px] text-white/60">{merged.length} columns · {plan.beams.length} beams · {plan.shear_walls.length} walls · drag to rotate · click to select</div>
      </div>
    </div>
  );
}
