import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { AgentRing } from '@/components/AgentRing';

const STATS = [
  { k: '9',   l: 'Agents debating' },
  { k: '16',  l: 'Curated TBDY/TS 500 articles' },
  { k: '48',  l: 'GPG-verified commits' },
  { k: '$0',  l: 'Per-call · Nous subscription' },
] as const;

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)', position: 'relative' }}>
      <TopNav />

      <div
        className="bp-grid"
        style={{ position: 'absolute', inset: '52px 0 36px 0', opacity: 0.6 }}
      />

      <div
        className="landing-hero"
        style={{
          position: 'relative',
          display: 'grid',
          gridTemplateColumns: '1.2fr 1fr',
          gap: 48,
          padding: '72px 80px 72px',
          minHeight: 'calc(100vh - 88px)',
        }}
      >
        {/* Left: manifesto */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            maxWidth: 720,
          }}
        >
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            <span className="chip hazard">PRE-POUR INSPECTION</span>
            <span className="chip">v0.8 · BETA</span>
          </div>
          <h1
            style={{
              fontSize: 72,
              lineHeight: 0.98,
              margin: 0,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              textWrap: 'balance',
            }}
          >
            Once concrete pours,
            <br />
            <span style={{ color: 'var(--hazard)' }}>the rebar is invisible.</span>
          </h1>
          <p
            style={{
              marginTop: 28,
              fontSize: 18,
              lineHeight: 1.5,
              color: 'var(--text-1)',
              maxWidth: 560,
              textWrap: 'pretty',
            }}
          >
            RebarGuard runs 9 AI agents against the approved structural plan{' '}
            <em>before</em> each pour. Cover thickness, splice length, TBDY 2018 compliance —
            verified in under 60 seconds from site photos.
          </p>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 18,
              flexWrap: 'wrap',
            }}
          >
            <span
              className="chip mono"
              style={{
                background: 'color-mix(in oklch, var(--blue) 12%, transparent)',
                color: 'var(--blue)',
                borderColor: 'color-mix(in oklch, var(--blue) 35%, transparent)',
                letterSpacing: '0.08em',
              }}
            >
              KIMI K2.6 · VISION
            </span>
            <span
              className="chip mono"
              style={{
                background: 'color-mix(in oklch, var(--amber) 12%, transparent)',
                color: 'var(--amber)',
                borderColor: 'color-mix(in oklch, var(--amber) 35%, transparent)',
                letterSpacing: '0.08em',
              }}
            >
              HERMES 4 70B · REASONING
            </span>
            <span
              className="mono"
              style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em' }}
            >
              VIA NOUS PORTAL
            </span>
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
            <Link
              href="/inspection/new"
              className="btn primary"
              style={{ height: 44, padding: '0 22px', fontSize: 14, textDecoration: 'none' }}
            >
              Start new inspection →
            </Link>
            <Link
              href="/quick"
              className="btn ghost"
              style={{ height: 44, padding: '0 22px', fontSize: 14, textDecoration: 'none' }}
            >
              Quick scan (upload photo)
            </Link>
          </div>

          <Link
            href="/watch"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              marginTop: 18,
              padding: '8px 14px',
              border: '1px dashed var(--line-2)',
              borderRadius: 4,
              textDecoration: 'none',
              color: 'var(--text-1)',
              fontSize: 13,
              maxWidth: 'fit-content',
            }}
          >
            <span
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--hazard)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
              }}
            >
              Are you a homeowner?
            </span>
            <span style={{ color: 'var(--text-2)' }}>
              Audit your contractor <span style={{ color: 'var(--hazard)' }}>→</span>
            </span>
          </Link>

          <div
            style={{
              marginTop: 64,
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 0,
              borderTop: '1px solid var(--line-1)',
              borderBottom: '1px solid var(--line-1)',
            }}
          >
            {STATS.map((s, i) => (
              <div
                key={i}
                style={{
                  padding: '20px 16px',
                  borderRight: i < STATS.length - 1 ? '1px solid var(--line-1)' : 'none',
                }}
              >
                <div
                  className="mono num"
                  style={{ fontSize: 28, fontWeight: 500, color: 'var(--text-0)' }}
                >
                  {s.k}
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-3)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    marginTop: 6,
                    fontFamily: 'var(--font-mono)',
                  }}
                >
                  {s.l}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: agent ring */}
        <div style={{ position: 'relative' }}>
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <AgentRing />
          </div>
        </div>
      </div>

      {/* Footer mono strip */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          height: 36,
          borderTop: '1px solid var(--line-1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          color: 'var(--text-3)',
          letterSpacing: '0.08em',
          background: 'var(--bg-0)',
        }}
      >
        <span>TBDY 2018 · TS 500 · AFAD-compatible</span>
        <span>HERMES AGENT · KIMI K2.6 · HACKATHON 2026</span>
        <span>41.02°N 28.97°E · IST</span>
      </div>
    </div>
  );
}
