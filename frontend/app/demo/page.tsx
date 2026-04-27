'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { BACKEND_URL } from '@/lib/api';

type Scenario = {
  id: string;
  title: string;
  subtitle: string;
  verdict: 'approve' | 'conditional' | 'reject';
  summary: string;
  findings: { severity: 'fail' | 'warn' | 'info'; title: string; ref: string | null }[];
  photoHint: string;
  pattern: 'mat' | 'column-cage' | 'wall';
};

const SCENARIOS: Scenario[] = [
  {
    id: 'happy',
    title: 'Happy path — mat foundation pour',
    subtitle: 'Compliant radye temel, 8 agents pass, Belediye upholds.',
    verdict: 'approve',
    summary:
      'A well-prepared bottom-mat reinforcement with proper spacers, clean trench, and verified splice lengths. The Moderator returns APPROVE, Belediye Agent upholds, human engineer countersigns.',
    findings: [
      { severity: 'info', title: 'Cover spacers placed at ≤1 m intervals', ref: 'TS 500 7.6' },
      { severity: 'info', title: 'Lap splice length ≥ 40Ø verified', ref: 'TS 500 7.2' },
      { severity: 'info', title: 'Stirrup hooks bent to 135° (seismic)', ref: 'TS 500 7.4' },
    ],
    photoHint: 'Upload a clean radye / mat foundation photo with visible spacers and rebar grid.',
    pattern: 'mat',
  },
  {
    id: 'conditional',
    title: 'Conditional — column confinement zone',
    subtitle: 'Cover shortage flagged by CoverAgent, Moderator issues CONDITIONAL.',
    verdict: 'conditional',
    summary:
      'Column bottom corner measures ~22 mm concrete cover, below the TS 500 25 mm minimum. Pour is blocked until spacers are re-bound and the element is re-photographed. All other categories pass.',
    findings: [
      { severity: 'fail', title: 'Cover < 25 mm at bottom-left corner', ref: 'TS 500 7.3' },
      { severity: 'warn', title: 'Stirrup spacing drift in confinement zone', ref: 'TBDY 7.3.6' },
      { severity: 'info', title: 'B500C rebar surface clean, no corrosion', ref: 'TS 500 5.3' },
    ],
    photoHint:
      'Upload a column cage photo where cover spacers are sparse or rebar visibly touches formwork.',
    pattern: 'column-cage',
  },
  {
    id: 'reject',
    title: 'Reject — shear wall retaining',
    subtitle: 'Inadequate shoring + missing spacers + rebar on earth. Pour blocked.',
    verdict: 'reject',
    summary:
      'Retaining-wall cage rests directly on soil without plastic spacers; timber shoring is makeshift; trench debris not removed. Moderator returns REJECT, Belediye escalates to human engineer.',
    findings: [
      { severity: 'fail', title: 'Cover < 50 mm (earth contact)', ref: 'TS 500 7.3' },
      { severity: 'fail', title: 'Plastic spacers missing', ref: 'TS 500 7.6' },
      { severity: 'warn', title: 'Formwork debris at trench base', ref: 'TBDY 7.3.6' },
    ],
    photoHint:
      'Upload a deep-excavation retaining-wall cage photo (Fıstık fistik-01.jpg works well).',
    pattern: 'wall',
  },
];

const VERDICT_COLOR: Record<Scenario['verdict'], string> = {
  approve: 'var(--green)',
  conditional: 'var(--yellow)',
  reject: 'var(--red)',
};

const VERDICT_LABEL: Record<Scenario['verdict'], string> = {
  approve: 'APPROVED',
  conditional: 'CONDITIONAL',
  reject: 'REJECTED',
};

const SEV_COLOR = {
  fail: 'var(--red)',
  warn: 'var(--yellow)',
  info: 'var(--blue)',
} as const;

export default function DemoPage() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [seedId, setSeedId] = useState<string | null>(null);
  const [seedErr, setSeedErr] = useState<string | null>(null);

  async function seedFistik() {
    setSeeding(true);
    setSeedErr(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/demo/fistik`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string };
      setSeedId(data.id);
    } catch (e) {
      setSeedErr((e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-0)' }}>
      <TopNav projectContext="DEMO · FIStIK AĞACI" live={false} />

      <div className="bp-grid" style={{ position: 'absolute', left: 0, right: 0, top: 52, height: 280, opacity: 0.6 }} />

      <div style={{ position: 'relative', padding: '44px 40px 64px', maxWidth: 1280, margin: '0 auto' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 28,
            flexWrap: 'wrap',
            gap: 16,
          }}
        >
          <div>
            <span className="chip hazard" style={{ marginBottom: 12 }}>
              DEMO SCENARIOS · 1340 ADA 43 PARSEL
            </span>
            <h1
              style={{
                margin: '10px 0 8px',
                fontSize: 44,
                fontWeight: 600,
                letterSpacing: '-0.02em',
              }}
            >
              Three pours, three verdicts.
            </h1>
            <p style={{ margin: 0, fontSize: 15, color: 'var(--text-2)', maxWidth: 680, lineHeight: 1.55 }}>
              Real data from İnş. Müh. Ferhat Baş&apos;s Istanbul RC project — 6+2 floors,
              BS30 concrete, 58.5 t of B420C. Pick a scenario, seed it into the dashboard,
              then run a quick scan or full inspection.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link
                href="/inspection/new?replay=fistik_reject"
                className="btn ghost sm"
                style={{ height: 40, padding: '0 14px', fontSize: 12, textDecoration: 'none' }}
                title="Stream the pre-recorded 9-agent debate (no Kimi calls). Demo-video safe."
              >
                ▶ Replay debate (deterministic)
              </Link>
              <button
                className="btn primary"
                onClick={seedFistik}
                disabled={seeding}
                style={{ height: 40, padding: '0 18px', fontSize: 13 }}
              >
                {seeding
                  ? 'Seeding…'
                  : seedId
                    ? `Seeded · open inspection →`
                    : 'Seed Fıstık into Dashboard'}
              </button>
            </div>
            {seedId && (
              <button
                onClick={() => router.push(`/inspection/new?project=${seedId}`)}
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--hazard)',
                  background: 'transparent',
                  border: '1px solid var(--hazard-ring)',
                  padding: '4px 8px',
                  borderRadius: 2,
                  cursor: 'pointer',
                  letterSpacing: '0.06em',
                }}
              >
                OPEN /inspection/new?project={seedId.slice(0, 8)}…
              </button>
            )}
            {seedErr && (
              <span className="mono" style={{ fontSize: 10, color: 'var(--red)', letterSpacing: '0.06em' }}>
                SEED FAILED · {seedErr.slice(0, 60)}
              </span>
            )}
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: 20,
          }}
        >
          {SCENARIOS.map((s, i) => (
            <ScenarioCard key={s.id} scenario={s} index={i + 1} />
          ))}
        </div>

        {/* Fine print */}
        <div
          style={{
            marginTop: 40,
            padding: '18px 20px',
            border: '1px solid var(--line-1)',
            background: 'var(--bg-2)',
            borderRadius: 4,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: 24,
          }}
        >
          <Stat
            label="Project metadata"
            value="1340 ADA 43 PARSEL"
            sub="Engineer: Ferhat Baş (TMMOB)"
          />
          <Stat label="Concrete" value="BS30 · 466.75 m³" sub="C30/37 equivalent" />
          <Stat label="Rebar steel" value="B420C · 58 514 kg" sub="S420 equivalent" />
          <Stat label="Formwork" value="2 280 m²" sub="Source: ideCAD 10.94 metraj" />
        </div>
      </div>
    </div>
  );
}

function ScenarioCard({ scenario: s, index }: { scenario: Scenario; index: number }) {
  return (
    <div
      className="panel"
      style={{
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderLeft: `4px solid ${VERDICT_COLOR[s.verdict]}`,
      }}
    >
      <div style={{ position: 'relative', height: 180 }}>
        <PatternSvg kind={s.pattern} />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(180deg, rgba(0,0,0,0.0) 40%, color-mix(in oklch, var(--bg-2) 90%, transparent) 100%)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 12,
            left: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--text-3)',
              letterSpacing: '0.1em',
            }}
          >
            SCENARIO {String(index).padStart(2, '0')}
          </span>
        </div>
        <div style={{ position: 'absolute', top: 12, right: 12 }}>
          <span
            className="chip"
            style={{
              background: 'transparent',
              color: VERDICT_COLOR[s.verdict],
              borderColor: VERDICT_COLOR[s.verdict],
            }}
          >
            {VERDICT_LABEL[s.verdict]}
          </span>
        </div>
      </div>

      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14, flex: 1 }}>
        <div>
          <h3 style={{ margin: '0 0 6px', fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em' }}>
            {s.title}
          </h3>
          <p style={{ margin: 0, fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
            {s.subtitle}
          </p>
        </div>

        <p style={{ margin: 0, fontSize: 13, color: 'var(--text-1)', lineHeight: 1.55 }}>
          {s.summary}
        </p>

        <div>
          <div
            className="mono"
            style={{
              fontSize: 10,
              color: 'var(--text-3)',
              letterSpacing: '0.1em',
              marginBottom: 6,
              textTransform: 'uppercase',
            }}
          >
            Kimi-anticipated findings
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {s.findings.map((f, i) => (
              <div
                key={i}
                style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 999,
                    background: SEV_COLOR[f.severity],
                    flexShrink: 0,
                  }}
                />
                <span style={{ color: 'var(--text-1)', flex: 1 }}>{f.title}</span>
                {f.ref && (
                  <span
                    className="mono"
                    style={{
                      fontSize: 9,
                      color: 'var(--text-3)',
                      letterSpacing: '0.06em',
                    }}
                  >
                    {f.ref}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div
          style={{
            marginTop: 'auto',
            padding: '10px 12px',
            background: 'var(--bg-0)',
            border: '1px dashed var(--line-2)',
            borderRadius: 3,
            fontSize: 11,
            color: 'var(--text-2)',
            fontFamily: 'var(--font-mono)',
            letterSpacing: '0.04em',
          }}
        >
          HOW TO RUN · {s.photoHint}
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <Link href="/quick" className="btn primary sm" style={{ flex: 1, textDecoration: 'none' }}>
            Run quick scan →
          </Link>
          <Link
            href="/dashboard"
            className="btn ghost sm"
            style={{ flex: 1, textDecoration: 'none' }}
          >
            Open dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--text-3)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      <div className="mono num" style={{ fontSize: 16, color: 'var(--text-0)', fontWeight: 500 }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{sub}</div>
      )}
    </div>
  );
}

function PatternSvg({ kind }: { kind: Scenario['pattern'] }) {
  if (kind === 'mat') {
    return (
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 180"
        preserveAspectRatio="xMidYMid slice"
        style={{ background: 'var(--bg-3)' }}
      >
        <defs>
          <linearGradient id="matGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#1e222b" />
            <stop offset="1" stopColor="#0a0d12" />
          </linearGradient>
        </defs>
        <rect width="400" height="180" fill="url(#matGrad)" />
        {Array.from({ length: 16 }).map((_, i) => (
          <line
            key={`v${i}`}
            x1={10 + i * 25}
            y1={20}
            x2={10 + i * 25}
            y2={170}
            stroke="#6c89a6"
            strokeWidth="1.2"
            opacity="0.8"
          />
        ))}
        {Array.from({ length: 8 }).map((_, i) => (
          <line
            key={`h${i}`}
            x1="10"
            y1={25 + i * 20}
            x2="395"
            y2={25 + i * 20}
            stroke="#6c89a6"
            strokeWidth="1"
            opacity="0.65"
            strokeDasharray="2 3"
          />
        ))}
      </svg>
    );
  }
  if (kind === 'column-cage') {
    return (
      <svg width="100%" height="100%" viewBox="0 0 400 180" style={{ background: 'var(--bg-3)' }}>
        <rect width="400" height="180" fill="#0e1116" />
        {[90, 140, 190, 240, 290].map((x) => (
          <g key={x}>
            <line x1={x} y1="10" x2={x} y2="170" stroke="var(--hazard)" strokeWidth="2" />
          </g>
        ))}
        {[25, 55, 85, 115, 145].map((y) => (
          <rect
            key={y}
            x="80"
            y={y}
            width="220"
            height="2"
            fill="var(--amber)"
            opacity="0.85"
          />
        ))}
      </svg>
    );
  }
  // wall
  return (
    <svg width="100%" height="100%" viewBox="0 0 400 180" style={{ background: 'var(--bg-3)' }}>
      <rect width="400" height="180" fill="#1a1d24" />
      {Array.from({ length: 24 }).map((_, i) => (
        <line
          key={`v${i}`}
          x1={20 + i * 15}
          y1={20}
          x2={20 + i * 15}
          y2={160}
          stroke="var(--hazard)"
          strokeWidth="1.5"
          opacity={i % 3 === 0 ? 0.9 : 0.55}
        />
      ))}
      {[45, 85, 125].map((y) => (
        <line
          key={y}
          x1="20"
          y1={y}
          x2="380"
          y2={y}
          stroke="#6c89a6"
          strokeWidth="1"
          strokeDasharray="3 3"
        />
      ))}
    </svg>
  );
}
