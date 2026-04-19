'use client';

import { useEffect, useState } from 'react';

export type VerdictCinemaPayload = {
  verdict: 'approve' | 'conditional' | 'reject';
  overall: number;
  criticalIssues: string[];
  narrative: string;
  municipalRecommendation?: 'uphold' | 'downgrade' | 'escalate_to_human' | null;
  municipalNarrative?: string | null;
};

const MAP: Record<
  VerdictCinemaPayload['verdict'],
  { label: string; color: string; sub: string }
> = {
  approve: {
    label: 'APPROVED · POUR AUTHORIZED',
    color: 'var(--green)',
    sub: 'All categories pass. Belediye concurrence required.',
  },
  conditional: {
    label: 'CONDITIONAL · REWORK',
    color: 'var(--yellow)',
    sub: 'Rework required. Re-run after remediation.',
  },
  reject: {
    label: 'REJECTED · POUR BLOCKED',
    color: 'var(--red)',
    sub: 'Structural / safety failure. Human engineer must review.',
  },
};

const MUNI_LABEL: Record<NonNullable<VerdictCinemaPayload['municipalRecommendation']>, string> = {
  uphold: 'BELEDİYE · UPHOLDS VERDICT',
  downgrade: 'BELEDİYE · RECOMMENDS DOWNGRADE',
  escalate_to_human: 'BELEDİYE · ESCALATE TO HUMAN ENGINEER',
};

export function VerdictCinema({
  payload,
  onClose,
}: {
  payload: VerdictCinemaPayload | null;
  onClose: () => void;
}) {
  const [score, setScore] = useState(0);
  const [visibleIssues, setVisibleIssues] = useState(0);

  useEffect(() => {
    if (!payload) return;
    setScore(0);
    setVisibleIssues(0);
    let raf: number;
    let start: number | null = null;
    const target = payload.overall;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / 1600);
      setScore(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);

    const issueTick = setInterval(() => {
      setVisibleIssues((n) => {
        if (n >= payload.criticalIssues.length) {
          clearInterval(issueTick);
          return n;
        }
        return n + 1;
      });
    }, 260);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(issueTick);
    };
  }, [payload]);

  if (!payload) return null;
  const v = MAP[payload.verdict];

  return (
    <div
      role="dialog"
      aria-modal
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'color-mix(in oklch, black 78%, transparent)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        animation: 'fadeIn 260ms ease-out both',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: 'min(780px, 92vw)',
          background: 'var(--bg-1)',
          border: `1px solid ${v.color}`,
          borderLeft: `6px solid ${v.color}`,
          boxShadow: 'var(--shadow-2)',
          padding: '36px 40px 28px',
          position: 'relative',
        }}
      >
        <div
          className="mono"
          style={{
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'var(--text-3)',
            textTransform: 'uppercase',
            marginBottom: 10,
          }}
        >
          Pre-pour verdict · Moderator · Hermes-4-70B
        </div>

        <div
          className="slam-down"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 'clamp(32px, 5vw, 48px)',
            fontWeight: 700,
            lineHeight: 1,
            color: v.color,
            letterSpacing: '-0.01em',
            marginBottom: 14,
          }}
        >
          {v.label}
        </div>
        <div style={{ fontSize: 14, color: 'var(--text-1)', marginBottom: 24 }}>{v.sub}</div>

        <div style={{ display: 'flex', gap: 32, alignItems: 'center', marginBottom: 24 }}>
          <div style={{ position: 'relative', width: 150, height: 150 }}>
            <svg width="150" height="150" viewBox="-85 -85 170 170">
              <circle r="74" fill="none" stroke="var(--line-1)" strokeWidth="10" />
              <circle
                r="74"
                fill="none"
                stroke={v.color}
                strokeWidth="10"
                strokeDasharray={`${2 * Math.PI * 74 * (score / 100)} ${2 * Math.PI * 74}`}
                transform="rotate(-90)"
                strokeLinecap="round"
              />
              <text
                x="0"
                y="8"
                textAnchor="middle"
                style={{
                  font: '500 56px var(--font-mono)',
                  fill: 'var(--text-0)',
                  letterSpacing: '-0.02em',
                }}
              >
                {Math.round(score)}
              </text>
              <text
                x="0"
                y="34"
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
          </div>

          <div style={{ flex: 1 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'var(--text-3)',
                marginBottom: 6,
                textTransform: 'uppercase',
              }}
            >
              Moderator narrative
            </div>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.5, color: 'var(--text-1)' }}>
              {payload.narrative}
            </p>
          </div>
        </div>

        {payload.criticalIssues.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <div
              className="mono"
              style={{
                fontSize: 10,
                letterSpacing: '0.1em',
                color: 'var(--text-3)',
                marginBottom: 8,
                textTransform: 'uppercase',
              }}
            >
              Critical issues
            </div>
            <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {payload.criticalIssues.slice(0, visibleIssues).map((issue, i) => (
                <li
                  key={i}
                  style={{
                    display: 'flex',
                    gap: 10,
                    padding: '6px 10px',
                    background: 'color-mix(in oklch, var(--red) 10%, var(--bg-2))',
                    borderLeft: '2px solid var(--red)',
                    fontSize: 12,
                    color: 'var(--text-1)',
                    animation: 'fadeIn 280ms ease-out both',
                  }}
                >
                  <span className="mono" style={{ color: 'var(--red)', fontSize: 10, letterSpacing: '0.08em' }}>
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span>{issue}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {payload.municipalRecommendation && (
          <div
            style={{
              padding: '10px 14px',
              background: 'color-mix(in oklch, var(--amber) 10%, var(--bg-0))',
              border: '1px solid var(--amber-ring)',
              borderLeft: '3px solid var(--amber)',
              marginBottom: 22,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span className="chip amber" style={{ height: 18, fontSize: 10 }}>
                {MUNI_LABEL[payload.municipalRecommendation]}
              </span>
              <span
                className="mono"
                style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em' }}
              >
                HERMES-4-70B · INDEPENDENT REVIEW
              </span>
            </div>
            {payload.municipalNarrative && (
              <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.45 }}>
                {payload.municipalNarrative}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button className="btn ghost sm" onClick={onClose}>
            Close
          </button>
          <button className="btn primary sm" onClick={onClose}>
            Acknowledge &amp; continue →
          </button>
        </div>

        <div
          className="mono"
          style={{
            position: 'absolute',
            top: 10,
            right: 14,
            fontSize: 10,
            color: 'var(--text-3)',
            letterSpacing: '0.06em',
          }}
        >
          ESC · DISMISS
        </div>
      </div>
    </div>
  );
}
