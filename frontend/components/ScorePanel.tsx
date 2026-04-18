'use client';

export type Score = {
  overall: number;
  geometry: number;
  compliance: number;
  fraud: number;
  risk: number;
  material: number;
  cover: number;
};

export type Verdict = 'approve' | 'conditional' | 'reject';

const VERDICT_COLOR: Record<Verdict, string> = {
  approve: 'var(--color-ok)',
  conditional: 'var(--color-warn)',
  reject: 'var(--color-danger)',
};
const VERDICT_LABEL: Record<Verdict, string> = {
  approve: 'APPROVE',
  conditional: 'CONDITIONAL',
  reject: 'REJECT',
};

export default function ScorePanel({
  score,
  verdict,
  narrative,
}: {
  score: Score | null;
  verdict: Verdict | null;
  narrative: string | null;
}) {
  if (!score || !verdict) {
    return (
      <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-6 text-sm text-[var(--color-text-muted)]">
        Waiting for moderator verdict...
      </div>
    );
  }
  const categories: [keyof Score, string][] = [
    ['geometry', 'Geometry'],
    ['compliance', 'Code compliance'],
    ['fraud', 'Fraud'],
    ['risk', 'Seismic risk'],
    ['material', 'Material'],
    ['cover', 'Concrete cover'],
  ];

  return (
    <div className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-6">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            Overall score
          </div>
          <div className="mt-1 text-5xl font-semibold">{Math.round(score.overall)}</div>
          <div className="text-xs text-[var(--color-text-muted)]">/ 100</div>
        </div>
        <div
          className="rounded px-3 py-1 text-xs font-semibold"
          style={{ background: VERDICT_COLOR[verdict], color: '#000' }}
        >
          {VERDICT_LABEL[verdict]}
        </div>
      </div>

      <div className="mt-6 space-y-2">
        {categories.map(([key, label]) => {
          const v = Math.round(score[key]);
          const color = v >= 80 ? 'var(--color-ok)' : v >= 55 ? 'var(--color-warn)' : 'var(--color-danger)';
          return (
            <div key={key} className="text-xs">
              <div className="flex justify-between text-[var(--color-text-muted)]">
                <span>{label}</span>
                <span>{v}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded bg-white/5">
                <div
                  className="h-full transition-all"
                  style={{ width: `${v}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {narrative && (
        <p className="mt-6 border-t border-[var(--color-border)] pt-4 text-sm leading-relaxed text-[var(--color-text-muted)]">
          {narrative}
        </p>
      )}
    </div>
  );
}
