'use client';

import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { AGENTS } from '@/lib/agents';

const FLOW = [
  { step: '01', phase: 'Ingestion', agents: ['plan'], note: 'Kimi K2.5 reads the approved PDF drawing. One shot, structured plan JSON out.' },
  { step: '02', phase: 'Site analysis', agents: ['geometry', 'fraud', 'seismic'], note: 'Deterministic agents run in parallel against detected rebar + EXIF + AFAD zone.' },
  { step: '03', phase: 'Vision pass', agents: ['material', 'cover'], note: 'Kimi K2.5 close-up + cover reads with reference-marker calibration.' },
  { step: '04', phase: 'Compliance', agents: ['code'], note: 'TBDY 2018 + TS 500 whitelist RAG, Hermes 4 narrative per violation.' },
  { step: '05', phase: 'Synthesis', agents: ['mod'], note: 'Hermes 4 70B weighs 7 reports, emits score + verdict.' },
  { step: '06', phase: 'Counter-review', agents: ['municipality'], note: 'Independent municipal reviewer. Hard rail: cannot uphold a REJECT.' },
] as const;

const MODEL_COLOR: Record<'kimi-k2.5' | 'hermes-4-70b', string> = {
  'kimi-k2.5': 'var(--blue)',
  'hermes-4-70b': 'var(--amber)',
};

export default function AgentsPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)' }}>
      <TopNav projectContext="AGENTS · 9 TOTAL" live={false} />

      <div
        className="bp-grid"
        style={{ position: 'absolute', left: 0, right: 0, top: 52, height: 260, opacity: 0.5 }}
      />

      <div style={{ position: 'relative', padding: '44px 40px 80px', maxWidth: 1200, margin: '0 auto' }}>
        <span className="chip hazard">THE DEBATE</span>
        <h1
          style={{
            margin: '12px 0 10px',
            fontSize: 44,
            fontWeight: 600,
            letterSpacing: '-0.02em',
          }}
        >
          Nine agents, two models, one verdict.
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: 15,
            color: 'var(--text-2)',
            maxWidth: 720,
            lineHeight: 1.55,
          }}
        >
          Every inspection runs the same ordered debate. Kimi K2.5 sees the photos, Hermes 4 70B
          argues the codes, the Moderator scores it, the Belediye Agent countersigns — and then
          a human engineer has the last click.
        </p>

        <div
          style={{
            marginTop: 32,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: 14,
          }}
        >
          {AGENTS.map((a, idx) => {
            const color = MODEL_COLOR[a.model as keyof typeof MODEL_COLOR] ?? 'var(--text-3)';
            return (
              <div
                key={a.id}
                className="panel"
                style={{
                  padding: '16px 18px 18px',
                  borderLeft: `3px solid ${color}`,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <span
                      className="mono"
                      style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em' }}
                    >
                      {String(idx + 1).padStart(2, '0')}
                    </span>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-0)' }}>
                      {a.name}
                    </span>
                  </div>
                  <span
                    className="mono"
                    style={{
                      fontSize: 9,
                      color,
                      letterSpacing: '0.06em',
                      textTransform: 'uppercase',
                    }}
                  >
                    {a.short}
                  </span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                  {a.role}
                </div>
                <div
                  className="mono"
                  style={{
                    marginTop: 'auto',
                    fontSize: 10,
                    color,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    paddingTop: 8,
                    borderTop: '1px dashed var(--line-1)',
                  }}
                >
                  MODEL · {a.model}
                </div>
              </div>
            );
          })}
        </div>

        <h2
          style={{
            margin: '56px 0 14px',
            fontSize: 20,
            fontWeight: 600,
            letterSpacing: '-0.01em',
          }}
        >
          Debate flow
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {FLOW.map((f) => (
            <div
              key={f.step}
              className="panel"
              style={{
                display: 'grid',
                gridTemplateColumns: '64px 220px 1fr',
                gap: 18,
                padding: '14px 18px',
                alignItems: 'center',
              }}
            >
              <div
                className="mono num"
                style={{ fontSize: 22, fontWeight: 500, color: 'var(--hazard)' }}
              >
                {f.step}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>
                  {f.phase}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: 4,
                    flexWrap: 'wrap',
                    marginTop: 6,
                  }}
                >
                  {f.agents.map((id) => {
                    const a = AGENTS.find((x) => x.id === id);
                    if (!a) return null;
                    const color = MODEL_COLOR[a.model as keyof typeof MODEL_COLOR] ?? 'var(--text-3)';
                    return (
                      <span
                        key={id}
                        className="chip"
                        style={{
                          fontSize: 9,
                          padding: '2px 6px',
                          color,
                          borderColor: color,
                          background: 'transparent',
                        }}
                      >
                        {a.short}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-1)', lineHeight: 1.55 }}>
                {f.note}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: 48,
            padding: '18px 22px',
            border: '1px solid var(--line-1)',
            borderLeft: '3px solid var(--hazard)',
            background: 'var(--bg-2)',
            borderRadius: 4,
            display: 'flex',
            flexWrap: 'wrap',
            gap: 20,
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ maxWidth: 520 }}>
            <div
              className="mono"
              style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em' }}
            >
              SEE IT LIVE
            </div>
            <div style={{ fontSize: 15, color: 'var(--text-0)', marginTop: 6 }}>
              Seed the Fıstık Ağacı demo project, upload a photo, and watch the nine agents
              stream a verdict in real time.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/demo" className="btn ghost sm" style={{ textDecoration: 'none' }}>
              Demo scenarios
            </Link>
            <Link href="/inspection/new" className="btn primary sm" style={{ textDecoration: 'none' }}>
              Run an inspection →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
