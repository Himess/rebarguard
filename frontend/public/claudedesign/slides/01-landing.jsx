/* Landing slide */
const { useState: useStateL, useEffect: useEffectL } = React;

function LandingSlide() {
  return (
    <div className="slide" style={{ background: 'var(--bg-0)' }}>
      <TopNav active="dashboard" />
      <div className="bp-grid" style={{ position: 'absolute', inset: '52px 0 0 0', opacity: 0.6 }} />

      <div style={{
        position: 'absolute', inset: '52px 0 0 0',
        display: 'grid', gridTemplateColumns: '1.2fr 1fr',
        gap: 48, padding: '72px 80px',
      }}>
        {/* Left: manifesto */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', maxWidth: 720 }}>
          <div style={{ display: 'flex', gap: 8, marginBottom: 28 }}>
            <span className="chip hazard">PRE-POUR INSPECTION</span>
            <span className="chip">v0.8 · BETA</span>
          </div>
          <h1 style={{
            fontSize: 72, lineHeight: 0.98, margin: 0,
            fontWeight: 600, letterSpacing: '-0.02em',
            textWrap: 'balance',
          }}>
            Once concrete pours,<br />
            <span style={{ color: 'var(--hazard)' }}>the rebar is invisible.</span>
          </h1>
          <p style={{
            marginTop: 28, fontSize: 18, lineHeight: 1.5,
            color: 'var(--text-1)', maxWidth: 560,
            textWrap: 'pretty',
          }}>
            RebarGuard runs 8 AI agents against the approved structural plan <em>before</em>
            each pour. Cover thickness, splice length, TBDY 2018 compliance — verified in
            under 40 seconds from site photos.
          </p>

          <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
            <button className="btn primary" style={{ height: 44, padding: '0 22px', fontSize: 14 }}>
              Start new inspection →
            </button>
            <button className="btn ghost" style={{ height: 44, padding: '0 22px', fontSize: 14 }}>
              Quick scan (upload photo)
            </button>
          </div>

          {/* Live counter row */}
          <div style={{
            marginTop: 64, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 0, borderTop: '1px solid var(--line-1)',
            borderBottom: '1px solid var(--line-1)',
          }}>
            {[
              { k: '14,287', l: 'Pours inspected' },
              { k: '1,042',  l: 'Blocked before pour' },
              { k: '38s',    l: 'Median verdict time' },
              { k: '7',      l: 'Agents + moderator' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '20px 16px',
                borderRight: i < 3 ? '1px solid var(--line-1)' : 'none',
              }}>
                <div className="mono num" style={{ fontSize: 28, fontWeight: 500, color: 'var(--text-0)' }}>{s.k}</div>
                <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 6 }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: isometric diagram with agent ring */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <AgentRing />
          </div>
        </div>
      </div>

      {/* Footer mono strip */}
      <div style={{
        position: 'absolute', left: 0, right: 0, bottom: 0,
        height: 36, borderTop: '1px solid var(--line-1)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em',
        background: 'var(--bg-0)',
      }}>
        <span>TBDY 2018 · TS 500 · AFAD-compatible</span>
        <span>HERMES AGENT · KIMI K2.5 · HACKATHON 2026</span>
        <span>41.02°N 28.97°E · IST</span>
      </div>
    </div>
  );
}

function AgentRing() {
  const R = 220;
  const agents = AGENTS.slice(0, 7); // 7 around, moderator in center
  return (
    <svg width="540" height="540" viewBox="-270 -270 540 540" style={{ overflow: 'visible' }}>
      {/* Outer dotted ring */}
      <circle cx="0" cy="0" r={R + 30} fill="none" stroke="var(--line-2)" strokeDasharray="2 6" opacity="0.5" />
      <circle cx="0" cy="0" r={R} fill="none" stroke="var(--line-1)" />
      <circle cx="0" cy="0" r={R - 60} fill="none" stroke="var(--line-1)" opacity="0.4" />

      {/* Crosshair */}
      <line x1={-R - 50} y1={0} x2={R + 50} y2={0} stroke="var(--line-1)" />
      <line x1={0} y1={-R - 50} x2={0} y2={R + 50} stroke="var(--line-1)" />

      {/* Agent nodes */}
      {agents.map((a, i) => {
        const th = -Math.PI / 2 + (i / agents.length) * Math.PI * 2;
        const x = Math.cos(th) * R;
        const y = Math.sin(th) * R;
        return (
          <g key={a.id}>
            <line x1="0" y1="0" x2={x} y2={y} stroke={`var(${a.hueVar})`} opacity="0.2" />
            <circle cx={x} cy={y} r="22" fill="var(--bg-2)" stroke={`var(${a.hueVar})`} strokeWidth="1.5" />
            <circle cx={x} cy={y} r="6" fill={`var(${a.hueVar})`} />
            <text x={x} y={y + 42} textAnchor="middle"
              style={{ font: '600 10px var(--font-mono)', letterSpacing: '0.08em', fill: 'var(--text-1)' }}>
              {a.short}
            </text>
          </g>
        );
      })}

      {/* Moderator in center */}
      <circle cx="0" cy="0" r="42" fill="var(--bg-2)" stroke="var(--amber)" strokeWidth="1.5" />
      <circle cx="0" cy="0" r="28" fill="none" stroke="var(--amber)" strokeOpacity="0.3" />
      <text x="0" y="3" textAnchor="middle" style={{ font: '600 11px var(--font-mono)', letterSpacing: '0.1em', fill: 'var(--amber)' }}>MOD</text>
      <text x="0" y="60" textAnchor="middle" style={{ font: '500 10px var(--font-mono)', letterSpacing: '0.08em', fill: 'var(--text-2)' }}>HERMES-4-70B</text>
    </svg>
  );
}

window.LandingSlide = LandingSlide;
