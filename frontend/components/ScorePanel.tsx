'use client';

export type CategoryScore = { name: string; score: number };
export type Verdict = 'approve' | 'conditional' | 'reject';

const VERDICT_MAP: Record<Verdict, { label: string; color: string; sub: string }> = {
  approve:     { label: 'APPROVED',    color: 'var(--green)',  sub: 'Ready for pour' },
  conditional: { label: 'CONDITIONAL', color: 'var(--yellow)', sub: 'Fix required — re-run' },
  reject:      { label: 'REJECTED',    color: 'var(--red)',    sub: 'Block pour — structural' },
};

type Props = {
  score: number;
  verdict: Verdict | null;
  categories: CategoryScore[];
  moderatorNarrative?: string | null;
  onExport?: () => void;
  onAck?: () => void;
};

export function ScorePanel({
  score,
  verdict,
  categories,
  moderatorNarrative,
  onExport,
  onAck,
}: Props) {
  const R = 74;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(1, score / 100));
  const v = verdict ? VERDICT_MAP[verdict] : null;

  return (
    <div
      style={{
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        flex: 1,
        minHeight: 0,
        overflow: 'auto',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width="120" height="120" viewBox="-85 -85 170 170">
          <circle r={R} fill="none" stroke="var(--line-1)" strokeWidth="10" />
          <circle
            r={R}
            fill="none"
            stroke={v?.color ?? 'var(--text-3)'}
            strokeWidth="10"
            strokeDasharray={`${C * pct} ${C}`}
            transform="rotate(-90)"
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 200ms linear' }}
          />
          <text
            x="0"
            y="6"
            textAnchor="middle"
            style={{
              font: '500 44px var(--font-mono)',
              fill: 'var(--text-0)',
              letterSpacing: '-0.02em',
            }}
          >
            {Math.round(score)}
          </text>
          <text
            x="0"
            y="28"
            textAnchor="middle"
            style={{
              font: '500 10px var(--font-mono)',
              fill: 'var(--text-3)',
              letterSpacing: '0.12em',
            }}
          >
            / 100
          </text>
        </svg>
        <div style={{ flex: 1 }}>
          <div
            className="mono"
            style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 4 }}
          >
            VERDICT
          </div>
          {v ? (
            <>
              <div
                className="slam-down"
                key={v.label}
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  lineHeight: 1,
                  color: v.color,
                  letterSpacing: '-0.01em',
                }}
              >
                {v.label}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-2)' }}>{v.sub}</div>
            </>
          ) : (
            <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Awaiting moderator…</div>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {categories.map((c) => {
          const color =
            c.score >= 80 ? 'var(--green)' : c.score >= 60 ? 'var(--yellow)' : 'var(--red)';
          return (
            <div key={c.name}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                <span style={{ color: 'var(--text-1)' }}>{c.name}</span>
                <span className="mono num" style={{ color: 'var(--text-0)' }}>
                  {Math.round(c.score)}
                </span>
              </div>
              <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                <div
                  style={{ width: `${c.score}%`, height: '100%', background: color, transition: 'width 400ms ease' }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {moderatorNarrative && (
        <div
          style={{
            padding: '8px 10px',
            background: 'var(--bg-0)',
            border: '1px solid var(--amber-ring)',
            borderLeft: '3px solid var(--amber)',
            borderRadius: 3,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span className="chip amber" style={{ height: 16, fontSize: 9 }}>
              HERMES-4-70B · SYNTHESIS
            </span>
          </div>
          <div style={{ fontSize: 11, lineHeight: 1.45, color: 'var(--text-1)' }}>
            {moderatorNarrative}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
        <button className="btn ghost sm" style={{ flex: 1 }} onClick={onExport} disabled={!onExport}>
          Export
        </button>
        <button
          className="btn primary sm"
          style={{ flex: 1 }}
          onClick={onAck}
          disabled={!onAck || !v}
        >
          Acknowledge &amp; re-inspect
        </button>
      </div>
    </div>
  );
}
