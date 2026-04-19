/* /inspection/new — the main screen */
const { useState: useS3, useEffect: useE3, useRef: useR3 } = React;

function InspectionNewSlide() {
  const [verdict, setVerdict] = useS3('conditional'); // approve | conditional | reject
  const [score, setScore] = useS3(0);
  const [debateIdx, setDebateIdx] = useS3(0);
  const [viewMode, setViewMode] = useS3('inspected'); // inspected | full | section

  // Animate score
  useE3(() => {
    const target = 71;
    let start;
    let raf;
    const step = (t) => {
      if (!start) start = t;
      const p = Math.min(1, (t - start) / 1400);
      setScore(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Animate debate bubbles
  useE3(() => {
    const t = setInterval(() => {
      setDebateIdx((i) => (i + 1) % (DEBATE.length + 1));
    }, 2200);
    return () => clearInterval(t);
  }, []);

  const visible = DEBATE.slice(0, debateIdx);

  const verdictMap = {
    approve:     { label: 'APPROVED',           color: 'var(--green)',  sub: 'Ready for pour' },
    conditional: { label: 'CONDITIONAL',        color: 'var(--yellow)', sub: 'Fix required — re-run' },
    reject:      { label: 'REJECTED',           color: 'var(--red)',    sub: 'Block pour — structural' },
  };
  const v = verdictMap[verdict];

  return (
    <div className="slide">
      <TopNav active="inspections" />

      {/* Breadcrumb strip */}
      <div style={{
        height: 36,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        borderBottom: '1px solid var(--line-1)',
        background: 'var(--bg-1)',
        fontFamily: 'var(--font-mono)', fontSize: 11, letterSpacing: '0.06em',
        color: 'var(--text-2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>INSPECTIONS</span>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span>KADIKÖY-A7</span>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span>POUR #142</span>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span style={{ color: 'var(--text-0)' }}>NEW · DRAFT</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>RUN ID · 7F29-A4B1</span>
          <span>STARTED 14:22:04</span>
          <span style={{ color: 'var(--hazard)' }}>● LIVE SSE</span>
        </div>
      </div>

      {/* Main grid */}
      <div style={{
        position: 'absolute', inset: '88px 0 0 0',
        display: 'grid',
        gridTemplateColumns: '320px 1fr',
        gridTemplateRows: '1fr 490px',
        gap: 0,
      }}>
        {/* Left rail — upload */}
        <div style={{
          gridRow: '1 / 3',
          borderRight: '1px solid var(--line-1)',
          background: 'var(--bg-1)',
          padding: 16,
          overflow: 'auto',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          <UploadRail />
        </div>

        {/* Center top — 3D viewer */}
        <div style={{
          position: 'relative',
          borderBottom: '1px solid var(--line-1)',
          background: 'var(--bg-0)',
          overflow: 'hidden',
        }}>
          <BuildingViewer viewMode={viewMode} setViewMode={setViewMode} />
        </div>

        {/* Bottom: debate + score */}
        <div style={{
          gridColumn: '2 / 3',
          display: 'grid',
          gridTemplateColumns: '1fr 440px',
          minHeight: 0,
        }}>
          {/* Debate */}
          <div style={{ borderRight: '1px solid var(--line-1)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div className="panel-h" style={{ borderBottom: '1px solid var(--line-1)' }}>
              <span>Agent debate · SSE stream</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: 'var(--hazard)' }}>●</span>
                <span style={{ color: 'var(--text-1)' }}>{visible.length}/{DEBATE.length}</span>
              </span>
            </div>
            <DebateStream messages={visible} />
          </div>

          {/* Score */}
          <div style={{ background: 'var(--bg-1)', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-h" style={{ borderBottom: '1px solid var(--line-1)' }}>
              <span>Score · verdict</span>
              <span style={{ color: 'var(--text-1)' }}>7 CATEGORIES</span>
            </div>
            <ScorePanel score={score} verdict={v} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- Upload rail ---------- */
function UploadRail() {
  const files = [
    { name: 'S-04_structural_v3.pdf', size: '2.4 MB', kind: 'PLAN',   ok: true },
    { name: 'arch_plan_A7.dwg',       size: '8.9 MB', kind: 'DWG',    ok: true },
    { name: 'IMG_20260418_1422.HEIC', size: '3.2 MB', kind: 'PHOTO',  ok: true },
    { name: 'IMG_20260418_1424.HEIC', size: '2.8 MB', kind: 'CLOSEUP',ok: true },
    { name: 'cover_marker_C3.HEIC',   size: '1.1 MB', kind: 'COVER',  ok: true },
  ];
  return <>
    <div>
      <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
        01 · Inputs
      </div>
      <div style={{
        border: '1px dashed var(--line-2)', borderRadius: 4,
        padding: 18, textAlign: 'center',
        background: 'var(--bg-2)',
      }}>
        <div style={{ fontSize: 12, color: 'var(--text-1)', marginBottom: 4 }}>Drop plan + site photos</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}>PDF · DWG · HEIC · JPG</div>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {files.map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 10px',
          background: 'var(--bg-2)', border: '1px solid var(--line-1)',
          borderRadius: 3,
        }}>
          <span className="chip" style={{ height: 18, fontSize: 9, padding: '0 6px' }}>{f.kind}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--text-0)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>{f.size}</div>
          </div>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--green)' }} />
        </div>
      ))}
    </div>

    <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        02 · Scope
      </div>
      <Field label="Stage"       value="Pre-pour · confinement zone" />
      <Field label="Element"     value="Column C3 · Axis 3-B" />
      <Field label="Floor"       value="−1 (basement)" />
      <Field label="Pour spec"   value="C30/37 · S4" />
    </div>

    <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 10 }}>
        03 · Metadata
      </div>
      <Field label="Inspector"   value="E. Yılmaz (TMMOB-4821)" />
      <Field label="Site"        value="Kadıköy-A7 · Pad #142" />
      <Field label="AFAD zone"   value="1 · PGA 0.4g · ZC soil" />
      <Field label="Height"      value="6 floors · 18.2 m" />
    </div>

    <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14 }}>
      <button className="btn primary" style={{ width: '100%', height: 40 }}>
        Start inspection →
      </button>
      <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textAlign: 'center' }}>
        EST. 38s · 8 AGENTS · ~$0.14
      </div>
    </div>
  </>;
}

function Field({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '6px 0', gap: 8, borderBottom: '1px dashed var(--line-1)' }}>
      <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{label}</span>
      <span style={{ fontSize: 12, color: 'var(--text-0)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

/* ---------- 3D Building Viewer ---------- */
function BuildingViewer({ viewMode, setViewMode }) {
  const canvasRef = useR3(null);
  const stateRef = useR3({ rot: 0.7 });

  useE3(() => {
    const THREE = window.THREE;
    const canvas = canvasRef.current;
    if (!THREE || !canvas) return;

    const scene = new THREE.Scene();
    scene.background = null;

    const rect = canvas.parentElement.getBoundingClientRect();
    const camera = new THREE.PerspectiveCamera(38, rect.width / rect.height, 0.1, 1000);
    camera.position.set(14, 10, 14);
    camera.lookAt(0, 3.5, 0);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(rect.width, rect.height, false);

    // Building — stacked floors as wireframe
    const building = new THREE.Group();
    const floors = 6;
    for (let i = 0; i < floors; i++) {
      const geo = new THREE.BoxGeometry(6, 1, 4);
      const edges = new THREE.EdgesGeometry(geo);
      const mat = new THREE.LineBasicMaterial({
        color: i === 2 ? 0xFF6A1F : 0x5a7088,
        opacity: i === 2 ? 1 : 0.45,
        transparent: true,
      });
      const floor = new THREE.LineSegments(edges, mat);
      floor.position.y = i * 1.2 + 0.5;
      building.add(floor);
    }

    // Highlighted column (C3) — rebar cage wireframe
    const cage = new THREE.Group();
    const cageMat = new THREE.LineBasicMaterial({ color: 0xFF6A1F });
    // 4 longitudinals
    const H = 7.2;
    const xs = [-0.4, 0.4];
    const zs = [-0.3, 0.3];
    for (const x of xs) for (const z of zs) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(x, 0, z),
        new THREE.Vector3(x, H, z),
      ]);
      cage.add(new THREE.Line(g, cageMat));
    }
    // 4 more middles
    for (const x of [-0.4, 0.4]) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, 0), new THREE.Vector3(x, H, 0)]);
      cage.add(new THREE.Line(g, cageMat));
    }
    for (const z of [-0.3, 0.3]) {
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, z), new THREE.Vector3(0, H, z)]);
      cage.add(new THREE.Line(g, cageMat));
    }
    // Stirrups — horizontal rings every 0.2
    const stirrupMat = new THREE.LineBasicMaterial({ color: 0xF5B041, opacity: 0.85, transparent: true });
    for (let y = 0; y <= H; y += 0.25) {
      const g = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-0.4, y, -0.3), new THREE.Vector3(0.4, y, -0.3),
        new THREE.Vector3(0.4, y, 0.3),   new THREE.Vector3(-0.4, y, 0.3),
        new THREE.Vector3(-0.4, y, -0.3),
      ]);
      cage.add(new THREE.Line(g, stirrupMat));
    }
    cage.position.set(1.8, 0, 1.2);
    cage.position.y = 0;
    building.add(cage);

    // Ground plate
    const gGeo = new THREE.PlaneGeometry(14, 14);
    const gEdges = new THREE.EdgesGeometry(new THREE.PlaneGeometry(14, 14, 14, 14));
    const gMat = new THREE.LineBasicMaterial({ color: 0x334255, opacity: 0.5, transparent: true });
    const ground = new THREE.LineSegments(gEdges, gMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.01;
    scene.add(ground);

    scene.add(building);

    let raf;
    const tick = () => {
      stateRef.current.rot += 0.0025;
      building.rotation.y = stateRef.current.rot;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    const onResize = () => {
      const r = canvas.parentElement.getBoundingClientRect();
      camera.aspect = r.width / r.height;
      camera.updateProjectionMatrix();
      renderer.setSize(r.width, r.height, false);
    };
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
    };
  }, []);

  return (
    <>
      <div className="bp-grid" style={{ position: 'absolute', inset: 0 }} />

      {/* Three.js canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} />

      {/* Corner annotations */}
      <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em' }}>VIEW · N-NE ISO</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em' }}>SCALE · 1:120</div>
      </div>

      <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 4,
        background: 'rgba(14,16,22,0.7)', border: '1px solid var(--line-2)', borderRadius: 3, padding: 3,
      }}>
        {[
          { id: 'inspected', l: 'Inspected' },
          { id: 'full',      l: 'Full building' },
          { id: 'section',   l: 'Section cut' },
        ].map(m => (
          <button key={m.id} onClick={() => setViewMode(m.id)} style={{
            height: 26, padding: '0 10px', fontSize: 11, fontWeight: 500,
            background: viewMode === m.id ? 'var(--hazard)' : 'transparent',
            color: viewMode === m.id ? '#111' : 'var(--text-1)',
            border: 'none', borderRadius: 2, cursor: 'pointer',
            letterSpacing: '0.02em',
          }}>{m.l}</button>
        ))}
      </div>

      {/* Focused element callout */}
      <div style={{
        position: 'absolute', left: '38%', top: '46%',
        display: 'flex', alignItems: 'center', gap: 10,
        pointerEvents: 'none',
      }}>
        <div style={{ width: 80, height: 1, background: 'var(--hazard)', opacity: 0.5 }} />
        <div style={{
          padding: '6px 10px',
          background: 'rgba(14,16,22,0.9)',
          border: '1px solid var(--hazard)',
          borderRadius: 3,
          fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '0.06em',
          color: 'var(--hazard)', textTransform: 'uppercase', fontWeight: 600,
          whiteSpace: 'nowrap',
        }}>
          COLUMN C3 · F−1 · 8Ø20 + Ø10/100
        </div>
      </div>

      {/* Bottom controls: zoom / rotate / section slider */}
      <div style={{
        position: 'absolute', left: 16, bottom: 16, right: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: 12,
      }}>
        <div style={{ display: 'flex', gap: 4,
          background: 'rgba(14,16,22,0.7)', border: '1px solid var(--line-2)', borderRadius: 3, padding: 3 }}>
          {['↺', '+', '−', '⤢'].map((s, i) => (
            <button key={i} style={{
              width: 28, height: 28, border: 'none', background: 'transparent',
              color: 'var(--text-1)', cursor: 'pointer', fontFamily: 'var(--font-mono)',
            }}>{s}</button>
          ))}
        </div>

        <div className="mono" style={{
          fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em',
          background: 'rgba(14,16,22,0.7)', padding: '6px 10px',
          border: '1px solid var(--line-1)', borderRadius: 3,
        }}>
          X: 14.02 m · Y: 3.60 m · Z: −0.45 m
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10,
          background: 'rgba(14,16,22,0.7)', border: '1px solid var(--line-2)', borderRadius: 3, padding: '6px 10px',
        }}>
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em' }}>SECTION Y</span>
          <div style={{ width: 120, height: 2, background: 'var(--line-2)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: '55%', top: -3, width: 8, height: 8, background: 'var(--hazard)', borderRadius: 1 }} />
          </div>
          <span className="mono num" style={{ fontSize: 10, color: 'var(--text-1)' }}>3.60m</span>
        </div>
      </div>
    </>
  );
}

/* ---------- Debate stream ---------- */
function DebateStream({ messages }) {
  const wrapRef = useR3(null);
  useE3(() => {
    if (wrapRef.current) wrapRef.current.scrollTop = wrapRef.current.scrollHeight;
  }, [messages.length]);
  return (
    <div ref={wrapRef} style={{
      flex: 1, minHeight: 0, overflowY: 'auto',
      padding: '14px 20px', background: 'var(--bg-1)',
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {messages.map((m, i) => {
        const agent = AGENTS.find(a => a.id === m.agent);
        return <Bubble key={i} agent={agent} msg={m} />;
      })}
      {/* Typing indicator */}
      {messages.length < DEBATE.length && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center', opacity: 0.6 }}>
          <Dot hueVar={'--agent-' + ((messages.length % 8) + 1)} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em' }}>
            {AGENTS[messages.length % 8].name.toUpperCase()} · THINKING
            <span className="typing-dots" style={{ marginLeft: 6 }}>●●●</span>
          </span>
        </div>
      )}
      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
        @keyframes bp { 0%,100% { opacity: 0.25 } 50% { opacity: 1 } }
        .typing-dots { letter-spacing: 2px; animation: bp 1.2s infinite; color: var(--text-2); }
        .bubble { animation: fadeIn 360ms cubic-bezier(.2,.8,.2,1); }
      `}</style>
    </div>
  );
}

function Bubble({ agent, msg }) {
  if (!agent) return null;
  const isMod = agent.id === 'mod';
  const flagColor = msg.flag === 'fail' ? 'var(--red)' :
                    msg.flag === 'warn' ? 'var(--yellow)' :
                    msg.flag === 'synth' ? 'var(--hazard)' : null;
  return (
    <div className="bubble" style={{
      display: 'grid',
      gridTemplateColumns: '28px 1fr',
      gap: 12,
      padding: isMod ? '12px 14px' : '10px 12px',
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
        fontFamily: 'var(--font-mono)', fontSize: 10, fontWeight: 700,
        letterSpacing: '0.04em',
      }}>{agent.short.slice(0, 2)}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-0)' }}>{agent.name}</span>
          <ModelBadge agent={agent} />
          <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.08em', marginLeft: 'auto' }}>
            +{msg.t}
          </span>
          {flagColor && (
            <span className="chip" style={{ color: flagColor, borderColor: flagColor, background: 'transparent', height: 18, fontSize: 9 }}>
              {msg.flag.toUpperCase()}
            </span>
          )}
        </div>
        <div style={{ marginTop: 6, fontSize: 13, lineHeight: 1.5, color: 'var(--text-1)' }}>{msg.text}</div>
        {msg.flag === 'fail' && (
          <div className="mono" style={{
            marginTop: 8, padding: '6px 8px',
            background: 'var(--bg-0)', border: '1px solid var(--line-1)', borderRadius: 2,
            fontSize: 10, color: 'var(--text-2)', letterSpacing: '0.04em',
          }}>
            {`{ "finding": "cover_low", "value_mm": 22, "spec_mm": 30, "ref": "TBDY 7.3.4.2" }`}
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- Score panel ---------- */
function ScorePanel({ score, verdict }) {
  const R = 74;
  const C = 2 * Math.PI * R;
  const pct = score / 100;
  return (
    <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12, flex: 1, minHeight: 0, overflow: 'auto' }}>
      {/* Ring */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <svg width="120" height="120" viewBox="-85 -85 170 170">
          <circle r={R} fill="none" stroke="var(--line-1)" strokeWidth="10" />
          <circle r={R} fill="none" stroke={verdict.color} strokeWidth="10"
            strokeDasharray={`${C * pct} ${C}`}
            transform="rotate(-90)"
            strokeLinecap="round"
            style={{ transition: 'stroke-dasharray 200ms linear' }} />
          <text x="0" y="6" textAnchor="middle" style={{
            font: '500 44px var(--font-mono)', fill: 'var(--text-0)', letterSpacing: '-0.02em',
          }}>{score}</text>
          <text x="0" y="28" textAnchor="middle" style={{
            font: '500 10px var(--font-mono)', fill: 'var(--text-3)', letterSpacing: '0.12em',
          }}>/ 100</text>
        </svg>
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em', marginBottom: 4 }}>VERDICT</div>
          <div style={{
            fontSize: 22, fontWeight: 700, lineHeight: 1,
            color: verdict.color, letterSpacing: '-0.01em',
            animation: 'slamDown 520ms cubic-bezier(.2,1.2,.3,1) both',
          }}>{verdict.label}</div>
          <div style={{ marginTop: 6, fontSize: 11, color: 'var(--text-2)' }}>{verdict.sub}</div>
          <style>{`
            @keyframes slamDown {
              0%   { opacity: 0; transform: translateY(-14px) scaleY(1.4); letter-spacing: 0.1em; }
              60%  { opacity: 1; transform: translateY(2px) scaleY(0.94); }
              100% { opacity: 1; transform: translateY(0) scaleY(1); letter-spacing: -0.01em; }
            }
          `}</style>
        </div>
      </div>

      {/* Category bars */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {CATEGORIES.map((c, i) => {
          const color = c.score >= 80 ? 'var(--green)' : c.score >= 60 ? 'var(--yellow)' : 'var(--red)';
          return (
            <div key={i}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                <span style={{ color: 'var(--text-1)' }}>{c.name}</span>
                <span className="mono num" style={{ color: 'var(--text-0)' }}>{c.score}</span>
              </div>
              <div style={{ height: 3, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ width: `${c.score}%`, height: '100%', background: color, transition: 'width 400ms ease' }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Moderator synthesis */}
      <div style={{
        padding: '8px 10px',
        background: 'var(--bg-0)',
        border: '1px solid var(--amber-ring)',
        borderLeft: '3px solid var(--amber)',
        borderRadius: 3,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="chip amber" style={{ height: 16, fontSize: 9 }}>HERMES-4-70B · SYNTHESIS</span>
        </div>
        <div style={{ fontSize: 11, lineHeight: 1.4, color: 'var(--text-1)' }}>
          <strong style={{ color: 'var(--yellow)' }}>Conditional approval.</strong> Cover at C3 bottom-left
          ≈22mm, below TBDY 2018 minimum (30mm, zone 1). Fix spacers, re-photograph, re-run — all other agents clear.
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8 }}>
        <button className="btn ghost sm" style={{ flex: 1 }}>Export</button>
        <button className="btn primary sm" style={{ flex: 1 }}>Acknowledge &amp; re-inspect</button>
      </div>
    </div>
  );
}

window.InspectionNewSlide = InspectionNewSlide;
