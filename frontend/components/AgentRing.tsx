import { AGENTS } from '@/lib/agents';

export function AgentRing({ size = 540 }: { size?: number }) {
  const R = 220;
  const agents = AGENTS.slice(0, 7);
  const half = size / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`-${half} -${half} ${size} ${size}`}
      style={{ overflow: 'visible' }}
      aria-hidden
    >
      <circle cx="0" cy="0" r={R + 30} fill="none" stroke="var(--line-2)" strokeDasharray="2 6" opacity="0.5" />
      <circle cx="0" cy="0" r={R} fill="none" stroke="var(--line-1)" />
      <circle cx="0" cy="0" r={R - 60} fill="none" stroke="var(--line-1)" opacity="0.4" />
      <line x1={-R - 50} y1={0} x2={R + 50} y2={0} stroke="var(--line-1)" />
      <line x1={0} y1={-R - 50} x2={0} y2={R + 50} stroke="var(--line-1)" />

      {agents.map((a, i) => {
        const th = -Math.PI / 2 + (i / agents.length) * Math.PI * 2;
        const x = Math.cos(th) * R;
        const y = Math.sin(th) * R;
        return (
          <g key={a.id}>
            <line x1="0" y1="0" x2={x} y2={y} stroke={`var(${a.hueVar})`} opacity="0.2" />
            <circle cx={x} cy={y} r="22" fill="var(--bg-2)" stroke={`var(${a.hueVar})`} strokeWidth="1.5" />
            <circle cx={x} cy={y} r="6" fill={`var(${a.hueVar})`} />
            <text
              x={x}
              y={y + 42}
              textAnchor="middle"
              style={{
                font: '600 10px var(--font-mono)',
                letterSpacing: '0.08em',
                fill: 'var(--text-1)',
              }}
            >
              {a.short}
            </text>
          </g>
        );
      })}

      <circle cx="0" cy="0" r="42" fill="var(--bg-2)" stroke="var(--amber)" strokeWidth="1.5" />
      <circle cx="0" cy="0" r="28" fill="none" stroke="var(--amber)" strokeOpacity="0.3" />
      <text
        x="0"
        y="3"
        textAnchor="middle"
        style={{
          font: '600 11px var(--font-mono)',
          letterSpacing: '0.1em',
          fill: 'var(--amber)',
        }}
      >
        MOD
      </text>
      <text
        x="0"
        y="60"
        textAnchor="middle"
        style={{
          font: '500 10px var(--font-mono)',
          letterSpacing: '0.08em',
          fill: 'var(--text-2)',
        }}
      >
        HERMES-4-70B
      </text>
    </svg>
  );
}
