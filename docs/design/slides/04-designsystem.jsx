/* Design system spec slide */

function DesignSystemSlide() {
  return (
    <div className="slide" style={{ padding: 40, overflow: 'auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 28 }}>
        <div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.12em' }}>04 · DESIGN SYSTEM</div>
          <h2 style={{ margin: '6px 0 0 0', fontSize: 32, fontWeight: 600, letterSpacing: '-0.015em' }}>
            RebarGuard visual language
          </h2>
        </div>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em' }}>
          v0.8 · 2026-04-19
        </div>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(12, 1fr)',
        gap: 16,
      }}>
        {/* Colors */}
        <Card title="Accent palette" span={6}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
            {[
              { name: 'Hazard', sub: 'Primary action', hex: '#FF6A1F', var: '--hazard', color: 'var(--hazard)' },
              { name: 'Seismic amber', sub: 'Reasoning (Hermes)', hex: '#F5B041', var: '--amber', color: 'var(--amber)' },
              { name: 'Electric blue', sub: 'Vision (Kimi)', hex: '#3B9EFF', var: '--blue', color: 'var(--blue)' },
            ].map(s => (
              <div key={s.name} style={{ border: '1px solid var(--line-1)', borderRadius: 3 }}>
                <div style={{ height: 56, background: s.color }} />
                <div style={{ padding: 10 }}>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{s.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2 }}>{s.sub}</div>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 6 }}>{s.hex}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Neutral scale" span={6}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6 }}>
            {[
              { name: 'bg-0', v: 'var(--bg-0)' },
              { name: 'bg-1', v: 'var(--bg-1)' },
              { name: 'bg-2', v: 'var(--bg-2)' },
              { name: 'bg-3', v: 'var(--bg-3)' },
              { name: 'bg-4', v: 'var(--bg-4)' },
              { name: 'text-3', v: 'var(--text-3)' },
              { name: 'text-2', v: 'var(--text-2)' },
              { name: 'text-1', v: 'var(--text-1)' },
              { name: 'text-0', v: 'var(--text-0)' },
              { name: 'line-2', v: 'var(--line-2)' },
            ].map(s => (
              <div key={s.name} style={{ border: '1px solid var(--line-1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: 42, background: s.v }} />
                <div className="mono" style={{ padding: '4px 6px', fontSize: 9, color: 'var(--text-2)', letterSpacing: '0.04em' }}>{s.name}</div>
              </div>
            ))}
          </div>
        </Card>

        {/* Agent hues */}
        <Card title="Agent slot hues — 8-color ring" span={12}>
          <div style={{ display: 'flex', gap: 10 }}>
            {AGENTS.map(a => (
              <div key={a.id} style={{ flex: 1, border: '1px solid var(--line-1)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ height: 48, background: `var(${a.hueVar})` }} />
                <div style={{ padding: '8px 10px' }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--text-1)', letterSpacing: '0.08em' }}>{a.short}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-0)', marginTop: 2, fontWeight: 600 }}>{a.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 2, lineHeight: 1.3 }}>{a.role}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Type */}
        <Card title="Typography · IBM Plex Sans + Mono" span={7}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <Type size={44} weight={600} label="Display · 44 / 600 / −0.02em" sample="Cover thickness insufficient." />
            <Type size={24} weight={600} label="Title · 24 / 600" sample="Pre-pour inspection · C3" />
            <Type size={15} weight={500} label="Body · 15 / 500" sample="8 longitudinal bars detected. 1 potentially occluded by formwork." />
            <Type size={13} weight={500} label="UI · 13 / 500" sample="Start inspection →" />
            <Type size={11} weight={600} label="Mono cap · 11 / 600 / 0.08em" sample="KIMI-K2.5 · VISION" mono />
            <Type size={10} weight={500} label="Mono label · 10 / 500 / 0.1em" sample="/ 100" mono />
          </div>
        </Card>

        <Card title="Button states" span={5}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 16 }}>
            {['Default', 'Hover', 'Disabled'].map(s => (
              <div key={s} style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>{s}</div>
            ))}
            {/* Primary */}
            <button className="btn primary">Start</button>
            <button className="btn primary" style={{ filter: 'brightness(1.08)' }}>Start</button>
            <button className="btn primary" style={{ opacity: 0.4, cursor: 'not-allowed' }}>Start</button>
            {/* Default */}
            <button className="btn">Action</button>
            <button className="btn" style={{ background: 'var(--bg-4)', borderColor: 'var(--line-3)' }}>Action</button>
            <button className="btn" style={{ opacity: 0.4, cursor: 'not-allowed' }}>Action</button>
            {/* Ghost */}
            <button className="btn ghost">Ghost</button>
            <button className="btn ghost" style={{ background: 'var(--bg-2)' }}>Ghost</button>
            <button className="btn ghost" style={{ opacity: 0.4, cursor: 'not-allowed' }}>Ghost</button>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 12, borderTop: '1px solid var(--line-1)' }}>
            <span className="chip hazard">HAZARD</span>
            <span className="chip amber">HERMES-4-70B</span>
            <span className="chip blue">KIMI-K2.5</span>
            <span className="chip">NEUTRAL</span>
          </div>
        </Card>

        {/* Spacing / radii */}
        <Card title="Spacing · 4/8 grid" span={6}>
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end' }}>
            {[4, 8, 12, 16, 24, 32, 40].map(s => (
              <div key={s} style={{ textAlign: 'center' }}>
                <div style={{ width: s, height: 56, background: 'var(--hazard)', marginBottom: 6 }} />
                <div className="mono num" style={{ fontSize: 10, color: 'var(--text-2)' }}>{s}</div>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, marginTop: 24, alignItems: 'center' }}>
            {[2, 4, 6, 10].map(r => (
              <div key={r} style={{ textAlign: 'center' }}>
                <div style={{ width: 48, height: 48, background: 'var(--bg-3)', border: '1px solid var(--line-2)', borderRadius: r }} />
                <div className="mono num" style={{ fontSize: 10, color: 'var(--text-2)', marginTop: 4 }}>r-{r}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Motion" span={6}>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[
              ['SSE bubble stream',  'fadeIn 360ms cubic-bezier(.2,.8,.2,1) · +6px offset'],
              ['Score count-up',     'easeOutCubic · 1400ms · tabular num'],
              ['Verdict slam-down',  '520ms cubic-bezier(.2,1.2,.3,1) · scaleY(1.4→1) + letter-spacing ease'],
              ['Thinking indicator', '1.2s opacity loop · 3 dots'],
              ['Ring stroke',        'strokeDasharray 200ms linear'],
            ].map(([k, v]) => (
              <li key={k} style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: 12, fontSize: 12, alignItems: 'baseline' }}>
                <span style={{ color: 'var(--text-0)', fontWeight: 600 }}>{k}</span>
                <span className="mono" style={{ color: 'var(--text-2)', fontSize: 11 }}>{v}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Card({ title, span, children }) {
  return (
    <div style={{
      gridColumn: `span ${span}`,
      background: 'var(--bg-2)',
      border: '1px solid var(--line-1)',
      borderRadius: 4,
      display: 'flex', flexDirection: 'column',
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--line-1)',
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-2)',
      }}>{title}</div>
      <div style={{ padding: 16 }}>{children}</div>
    </div>
  );
}

function Type({ size, weight, label, sample, mono }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'baseline', borderBottom: '1px dashed var(--line-1)', paddingBottom: 10 }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>{label}</div>
      <div style={{
        fontFamily: mono ? 'var(--font-mono)' : 'var(--font-sans)',
        fontSize: size, fontWeight: weight, color: 'var(--text-0)',
        letterSpacing: mono ? '0.08em' : (size >= 32 ? '-0.02em' : '-0.005em'),
      }}>{sample}</div>
    </div>
  );
}

window.DesignSystemSlide = DesignSystemSlide;
