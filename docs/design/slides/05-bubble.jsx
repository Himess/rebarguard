/* Agent debate bubble — anatomy slide */

function BubbleAnatomySlide() {
  return (
    <div className="slide" style={{ padding: 40, overflow: 'auto' }}>
      <div style={{ marginBottom: 24 }}>
        <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.12em' }}>05 · COMPONENT</div>
        <h2 style={{ margin: '6px 0 0 0', fontSize: 32, fontWeight: 600, letterSpacing: '-0.015em' }}>
          Agent debate bubble — anatomy
        </h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 48 }}>
        {/* Left: annotated diagram */}
        <div style={{ position: 'relative', background: 'var(--bg-2)', border: '1px solid var(--line-1)', borderRadius: 4, padding: '50px 230px 50px 230px' }}>
          <AnnotatedBubble />
        </div>

        {/* Right: 3 states */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <StateCard title="Default · info">
            <MiniBubble agent={AGENTS[0]} msg={{ t: '00:03', text: 'Parsed sheet S-04. Column C3: 8Ø20 longitudinal, Ø10/100 stirrups.' }} />
          </StateCard>

          <StateCard title="Flagged · fail (evidence JSON expanded)">
            <MiniBubble agent={AGENTS[6]} msg={DEBATE[2]} />
          </StateCard>

          <StateCard title="Moderator synthesis">
            <MiniBubble agent={AGENTS[7]} msg={DEBATE[7]} />
          </StateCard>

          <StateCard title="Streaming (thinking)">
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '10px 12px', background: 'var(--bg-2)', border: '1px dashed var(--line-1)', borderRadius: 3 }}>
              <div style={{
                width: 28, height: 28, borderRadius: 3,
                background: `color-mix(in oklch, var(--agent-2) 18%, var(--bg-3))`,
                color: 'var(--agent-2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
              }}>GE</div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-1)' }}>GeometryAgent</span>
              <ModelBadge agent={AGENTS[1]} />
              <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', marginLeft: 'auto', letterSpacing: '0.1em' }}>
                THINKING <span className="typing-dots">●●●</span>
              </span>
              <style>{`
                @keyframes bp2 { 0%,100% { opacity: 0.25 } 50% { opacity: 1 } }
                .typing-dots { letter-spacing: 2px; animation: bp2 1.2s infinite; color: var(--text-2); }
              `}</style>
            </div>
          </StateCard>

          <div style={{ marginTop: 'auto', padding: 14, background: 'var(--bg-0)', border: '1px solid var(--line-1)', borderRadius: 3 }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 8 }}>PROPS</div>
            <pre className="mono" style={{ margin: 0, fontSize: 11, color: 'var(--text-1)', lineHeight: 1.6 }}>
{`<Bubble
  agent={{id, name, short, model, modelClass, hueVar}}
  msg={{ t, text, flag?: "fail"|"warn"|"synth" }}
  evidence?={ json }         // expandable
  streaming?={boolean}
/>`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

function AnnotatedBubble() {
  const agent = AGENTS[6];
  const msg = DEBATE[2];
  return (
    <div style={{ position: 'relative' }}>
      <div style={{
        display: 'grid', gridTemplateColumns: '28px 1fr', gap: 12,
        padding: '12px 14px',
        background: 'var(--bg-1)',
        border: '1px solid var(--line-1)',
        borderLeft: `3px solid var(${agent.hueVar})`,
        borderRadius: 3,
      }}>
        <div style={{
          width: 28, height: 28, borderRadius: 3,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: `color-mix(in oklch, var(${agent.hueVar}) 18%, var(--bg-3))`,
          color: `var(${agent.hueVar})`,
          fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
        }}>CO</div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-0)' }}>{agent.name}</span>
            <ModelBadge agent={agent} />
            <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginLeft: 'auto' }}>+00:14</span>
            <span className="chip" style={{ color: 'var(--red)', borderColor: 'var(--red)', background: 'transparent', height: 18, fontSize: 9 }}>FAIL</span>
          </div>
          <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: 'var(--text-1)' }}>{msg.text}</div>
          <div className="mono" style={{
            marginTop: 8, padding: '6px 8px',
            background: 'var(--bg-0)', border: '1px solid var(--line-1)', borderRadius: 2,
            fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.04em',
          }}>
            {`{ "finding": "cover_low", "value_mm": 22, "spec_mm": 30, "ref": "TBDY 7.3.4.2" }`}
          </div>
        </div>
      </div>

      {/* Annotations */}
      {[
        { side: 'L', y: 0,   label: '01', title: 'Hue border 3px',   note: 'Maps agent id → --agent-N' },
        { side: 'L', y: 60,  label: '02', title: 'Avatar chip 28×28',note: 'bg = 18% hue mix on bg-3' },
        { side: 'L', y: 130, label: '06', title: 'Evidence block',   note: 'Mono 10 · collapsible JSON · bg-0' },
        { side: 'R', y: 0,   label: '03', title: 'Model badge',      note: 'Kimi vision / Hermes reasoning' },
        { side: 'R', y: 60,  label: '04', title: 'Severity chip',    note: 'fail / warn / synth · outline' },
        { side: 'R', y: 120, label: '05', title: 'Message body',     note: '13/500 · text-1 · line 1.5' },
      ].map(a => (
        <Annotation key={a.label} {...a} />
      ))}
    </div>
  );
}

function Annotation({ side, y, label, title, note }) {
  const left = side === 'L';
  return (
    <div style={{
      position: 'absolute',
      [left ? 'right' : 'left']: '100%',
      top: y,
      [left ? 'marginRight' : 'marginLeft']: 16,
      width: 180,
      textAlign: left ? 'right' : 'left',
    }}>
      <div className="mono" style={{ fontSize: 10, color: 'var(--hazard)', letterSpacing: '0.1em', marginBottom: 2 }}>— {label}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-0)' }}>{title}</div>
      <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2, lineHeight: 1.4 }}>{note}</div>
    </div>
  );
}

function StateCard({ title, children }) {
  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--line-1)', borderRadius: 4 }}>
      <div style={{
        padding: '8px 12px', borderBottom: '1px solid var(--line-1)',
        fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.08em',
        textTransform: 'uppercase', color: 'var(--text-2)',
      }}>{title}</div>
      <div style={{ padding: 12 }}>{children}</div>
    </div>
  );
}

function MiniBubble({ agent, msg }) {
  const isMod = agent.id === 'mod';
  const flagColor = msg.flag === 'fail' ? 'var(--red)' :
                    msg.flag === 'warn' ? 'var(--yellow)' :
                    msg.flag === 'synth' ? 'var(--hazard)' : null;
  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '28px 1fr', gap: 12,
      padding: '10px 12px',
      background: isMod ? 'color-mix(in oklch, var(--hazard) 8%, var(--bg-2))' : 'var(--bg-2)',
      border: `1px solid ${isMod ? 'var(--hazard-ring)' : 'var(--line-1)'}`,
      borderLeft: `3px solid var(${agent.hueVar})`,
      borderRadius: 3,
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: 3,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: `color-mix(in oklch, var(${agent.hueVar}) 18%, var(--bg-3))`,
        color: `var(${agent.hueVar})`,
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700, letterSpacing: '0.04em',
      }}>{agent.short.slice(0, 2)}</div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-0)' }}>{agent.name}</span>
          <ModelBadge agent={agent} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginLeft: 'auto' }}>+{msg.t}</span>
          {flagColor && <span className="chip" style={{ color: flagColor, borderColor: flagColor, background: 'transparent', height: 18, fontSize: 9 }}>{msg.flag.toUpperCase()}</span>}
        </div>
        <div style={{ marginTop: 6, fontSize: 12, lineHeight: 1.5, color: 'var(--text-1)' }}>{msg.text}</div>
      </div>
    </div>
  );
}

window.BubbleAnatomySlide = BubbleAnatomySlide;
