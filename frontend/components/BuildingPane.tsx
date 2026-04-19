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
  hideToggle?: boolean;
  forceMode?: 'building' | 'element';
};

type Mode = 'building' | 'element';

export default function BuildingPane({
  plan,
  selectedElement,
  detectedRebarCount,
  onSelectById,
  hideToggle = false,
  forceMode,
}: Props) {
  const [mode, setMode] = useState<Mode>(forceMode ?? 'element');
  const effective: Mode = forceMode ?? mode;

  return (
    <div className="flex h-full w-full flex-col gap-2">
      {!hideToggle && (
        <div className="flex items-center gap-2">
          <div
            className="inline-flex rounded-md border text-xs"
            style={{ borderColor: 'var(--line-2)', background: 'var(--bg-2)', padding: 2 }}
          >
            <button
              onClick={() => setMode('element')}
              style={{
                padding: '4px 10px',
                borderRadius: 3,
                background: effective === 'element' ? 'var(--hazard)' : 'transparent',
                color: effective === 'element' ? '#111' : 'var(--text-2)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Inspected element
            </button>
            <button
              onClick={() => setMode('building')}
              disabled={!plan}
              style={{
                padding: '4px 10px',
                borderRadius: 3,
                background: effective === 'building' ? 'var(--hazard)' : 'transparent',
                color: effective === 'building' ? '#111' : 'var(--text-2)',
                border: 'none',
                cursor: 'pointer',
                opacity: plan ? 1 : 0.4,
              }}
            >
              Full building
            </button>
          </div>
          {effective === 'building' && plan && (
            <span
              className="mono"
              style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}
            >
              {plan.columns.length}C · {plan.beams.length}B · {plan.shear_walls.length}W
            </span>
          )}
        </div>
      )}

      <div className="relative flex-1 w-full overflow-hidden" style={{ background: 'transparent' }}>
        {effective === 'element' ? (
          <ThreeOverlay element={selectedElement} detectedRebarCount={detectedRebarCount} />
        ) : plan ? (
          <FullBuildingViewer
            plan={plan}
            highlightElementId={selectedElement?.id ?? null}
            onSelectElement={onSelectById}
          />
        ) : (
          <div
            className="grid h-full place-items-center text-sm"
            style={{ color: 'var(--text-3)' }}
          >
            Upload a project to see the full building
          </div>
        )}
      </div>
    </div>
  );
}
