'use client';

import { useState } from 'react';
import type { StructuralElement, StructuralPlan } from '@/lib/api';
import FullBuildingViewer from './FullBuildingViewer';
import ThreeOverlay from './ThreeOverlay';

type Props = {
  plan: StructuralPlan | null;
  selectedElement: StructuralElement | null;
  detectedRebarCount?: number | null;
  onSelectById?: (id: string, type: string) => void;
};

type Mode = 'building' | 'element';

export default function BuildingPane({
  plan,
  selectedElement,
  detectedRebarCount,
  onSelectById,
}: Props) {
  const [mode, setMode] = useState<Mode>('element');

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-0.5 text-xs">
          <button
            onClick={() => setMode('element')}
            className={`rounded-md px-3 py-1 ${
              mode === 'element'
                ? 'bg-[var(--color-accent)] text-black'
                : 'text-[var(--color-text-muted)] hover:text-white'
            }`}
          >
            Inspected element
          </button>
          <button
            onClick={() => setMode('building')}
            disabled={!plan}
            className={`rounded-md px-3 py-1 ${
              mode === 'building'
                ? 'bg-[var(--color-accent)] text-black'
                : 'text-[var(--color-text-muted)] hover:text-white'
            } disabled:opacity-40`}
          >
            Full building
          </button>
        </div>
        {mode === 'building' && plan && (
          <span className="text-[10px] text-[var(--color-text-muted)] font-mono">
            {plan.columns.length}C · {plan.beams.length}B · {plan.shear_walls.length}W
          </span>
        )}
      </div>

      <div className="h-[320px] w-full overflow-hidden rounded-lg border border-[var(--color-border)] bg-black sm:h-[360px]">
        {mode === 'element' ? (
          <ThreeOverlay element={selectedElement} detectedRebarCount={detectedRebarCount} />
        ) : plan ? (
          <FullBuildingViewer
            plan={plan}
            highlightElementId={selectedElement?.id ?? null}
            onSelectElement={onSelectById}
          />
        ) : (
          <div className="grid h-full place-items-center text-sm text-[var(--color-text-muted)]">
            Upload a project to see the full building
          </div>
        )}
      </div>
    </div>
  );
}
