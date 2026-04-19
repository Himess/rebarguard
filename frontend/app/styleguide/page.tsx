import { TopNav } from '@/components/TopNav';
import { AGENTS } from '@/lib/agents';

export const metadata = {
  title: 'RebarGuard · Design System',
};

const ACCENTS = [
  { name: 'Hazard',        role: 'Primary action',       var: '--hazard', hex: '#FF6A1F' },
  { name: 'Seismic amber', role: 'Reasoning (Hermes)',   var: '--amber',  hex: '#F5B041' },
  { name: 'Electric blue', role: 'Vision (Kimi)',        var: '--blue',   hex: '#3B9EFF' },
];

const NEUTRALS = [
  { key: 'bg-0', label: 'Deepest',    var: '--bg-0' },
  { key: 'bg-1', label: 'App bg',     var: '--bg-1' },
  { key: 'bg-2', label: 'Panel',      var: '--bg-2' },
  { key: 'bg-3', label: 'Raised',     var: '--bg-3' },
  { key: 'bg-4', label: 'Hover',      var: '--bg-4' },
];

const TEXT_RAMP = [
  { key: 'text-0', label: 'Primary',   var: '--text-0' },
  { key: 'text-1', label: 'Secondary', var: '--text-1' },
  { key: 'text-2', label: 'Tertiary',  var: '--text-2' },
  { key: 'text-3', label: 'Label',     var: '--text-3' },
  { key: 'line-2', label: 'Border',    var: '--line-2' },
];

export default function StyleguidePage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      <TopNav projectContext="DESIGN · SPEC" live={false} />

      <div style={{ padding: '40px 48px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 36 }}>
          <div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--text-3)',
                letterSpacing: '0.12em',
                marginBottom: 8,
              }}
            >
              04 · DESIGN SYSTEM
            </div>
            <h1 style={{ margin: 0, fontSize: 36, fontWeight: 600, letterSpacing: '-0.02em' }}>
              RebarGuard visual language
            </h1>
          </div>
          <div
            className="mono"
            style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.1em' }}
          >
            v0.8 · 2026-04-19
          </div>
        </div>

        {/* Accents + neutrals row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 16, marginBottom: 24 }}>
          <Panel heading="Accent palette">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, padding: 14 }}>
              {ACCENTS.map((a) => (
                <div
                  key={a.var}
                  style={{
                    border: '1px solid var(--line-1)',
                    borderRadius: 3,
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ height: 92, background: `var(${a.var})` }} />
                  <div style={{ padding: 10 }}>
                    <div style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{a.role}</div>
                    <div
                      className="mono"
                      style={{
                        fontSize: 10,
                        color: 'var(--text-3)',
                        letterSpacing: '0.04em',
                        marginTop: 4,
                      }}
                    >
                      {a.hex}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel heading="Neutral scale">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, padding: 14 }}>
              {NEUTRALS.map((n) => (
                <div key={n.var}>
                  <div
                    style={{
                      height: 64,
                      background: `var(${n.var})`,
                      border: '1px solid var(--line-1)',
                      borderRadius: 3,
                    }}
                  />
                  <div className="mono" style={{ fontSize: 10, marginTop: 4, color: 'var(--text-2)' }}>
                    {n.key}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
              {TEXT_RAMP.map((t) => (
                <div key={t.var}>
                  <div
                    style={{
                      height: 40,
                      background: `var(${t.var})`,
                      opacity: t.var.startsWith('--text') ? 1 : 1,
                      border: '1px solid var(--line-1)',
                      borderRadius: 3,
                    }}
                  />
                  <div className="mono" style={{ fontSize: 10, marginTop: 4, color: 'var(--text-2)' }}>
                    {t.key}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Agent hues */}
        <Panel heading="Agent slot hues — 9-color ring">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(9, 1fr)', gap: 6, padding: 14 }}>
            {AGENTS.map((a) => (
              <div
                key={a.id}
                style={{
                  border: '1px solid var(--line-1)',
                  borderRadius: 3,
                  overflow: 'hidden',
                }}
              >
                <div style={{ height: 68, background: `var(${a.hueVar})` }} />
                <div style={{ padding: 10 }}>
                  <div
                    className="mono"
                    style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}
                  >
                    {a.short}
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 600, marginTop: 2 }}>{a.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 4, lineHeight: 1.35 }}>
                    {a.role}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        {/* Typography + buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
          <Panel heading="Typography · IBM Plex Sans + Mono">
            <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>
              <Row label="Display · 44">
                <div style={{ fontSize: 44, fontWeight: 600, letterSpacing: '-0.02em', lineHeight: 1 }}>
                  Cover thickness insufficient.
                </div>
              </Row>
              <Row label="Title · 24">
                <div style={{ fontSize: 24, fontWeight: 600, lineHeight: 1.1 }}>
                  Pre-pour inspection · C3
                </div>
              </Row>
              <Row label="Body · 15">
                <div style={{ fontSize: 15, color: 'var(--text-1)', lineHeight: 1.5 }}>
                  8 longitudinal bars detected. 1 potentially occluded by formwork.
                </div>
              </Row>
              <Row label="UI · 13">
                <div style={{ fontSize: 13, color: 'var(--text-0)' }}>Start inspection →</div>
              </Row>
              <Row label="Mono cap · 11">
                <div
                  className="mono"
                  style={{ fontSize: 11, letterSpacing: '0.08em', color: 'var(--blue)' }}
                >
                  KIMI-K2.5 · VISION
                </div>
              </Row>
              <Row label="Mono label · 10">
                <div
                  className="mono"
                  style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-3)' }}
                >
                  / 100
                </div>
              </Row>
            </div>
          </Panel>

          <Panel heading="Button states">
            <div
              style={{
                padding: 18,
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 14,
              }}
            >
              <Column label="Default">
                <button className="btn primary">Start</button>
                <button className="btn">Action</button>
                <button className="btn ghost">Ghost</button>
              </Column>
              <Column label="Hover">
                <button className="btn primary" style={{ filter: 'brightness(1.08)' }}>
                  Start
                </button>
                <button className="btn" style={{ background: 'var(--bg-4)', borderColor: 'var(--line-3)' }}>
                  Action
                </button>
                <button className="btn ghost" style={{ color: 'var(--text-0)' }}>
                  Ghost
                </button>
              </Column>
              <Column label="Disabled">
                <button className="btn primary" disabled>
                  Start
                </button>
                <button className="btn" disabled>
                  Action
                </button>
                <button className="btn ghost" disabled>
                  Ghost
                </button>
              </Column>
            </div>
            <div
              style={{
                padding: '0 18px 18px',
                display: 'flex',
                gap: 10,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <span className="chip hazard">HAZARD</span>
              <span className="chip amber">HERMES-4-70B</span>
              <span className="chip blue">KIMI-K2.5</span>
              <span className="chip">NEUTRAL</span>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}

function Panel({ heading, children }: { heading: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg-1)',
        border: '1px solid var(--line-1)',
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      <div className="panel-h">{heading}</div>
      {children}
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 16, alignItems: 'baseline' }}>
      <div
        className="mono"
        style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}
      >
        {label}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Column({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--text-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{children}</div>
    </div>
  );
}
