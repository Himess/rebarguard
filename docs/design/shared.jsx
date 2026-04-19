/* Shared components + data for all RebarGuard slides */
const { useState, useEffect, useRef, useMemo } = React;

/* ========== Data ========== */

const AGENTS = [
  { id: 'plan',     name: 'PlanParser',       short: 'PLAN',   model: 'kimi-k2.5',      modelClass: 'blue',   hueVar: '--agent-1', role: 'Reads approved PDF/DWG drawings' },
  { id: 'geometry', name: 'GeometryAgent',    short: 'GEOM',   model: 'hermes-4-70b',   modelClass: 'amber',  hueVar: '--agent-2', role: 'Plan vs site rebar diff' },
  { id: 'code',     name: 'CodeAgent',        short: 'CODE',   model: 'hermes-4-70b',   modelClass: 'amber',  hueVar: '--agent-3', role: 'TBDY 2018 / TS 500 compliance' },
  { id: 'fraud',    name: 'FraudAgent',       short: 'FRAUD',  model: 'hermes-4-70b',   modelClass: 'amber',  hueVar: '--agent-4', role: 'EXIF / marker / hash dup' },
  { id: 'seismic',  name: 'SeismicRiskAgent', short: 'SEISM',  model: 'hermes-4-70b',   modelClass: 'amber',  hueVar: '--agent-5', role: 'AFAD zone × soil × floors' },
  { id: 'material', name: 'MaterialAgent',    short: 'MATL',   model: 'kimi-k2.5',      modelClass: 'blue',   hueVar: '--agent-6', role: 'Steel class, corrosion' },
  { id: 'cover',    name: 'CoverAgent',       short: 'COVER',  model: 'kimi-k2.5',      modelClass: 'blue',   hueVar: '--agent-7', role: 'Concrete cover estimation' },
  { id: 'mod',      name: 'Moderator',        short: 'MOD',    model: 'hermes-4-70b',   modelClass: 'amber',  hueVar: '--agent-8', role: 'Synthesizes all findings' },
];

const DEBATE = [
  { agent: 'plan',     t: '00:03', text: 'Parsed sheet S-04. Column C3: 8Ø20 longitudinal, Ø10/100 stirrups in confinement zone. Cover: 30mm.' },
  { agent: 'geometry', t: '00:08', text: 'Detected 7 visible longitudinal bars in photo 2. Missing 1 bar on NE face — or occluded by formwork.', flag: 'warn' },
  { agent: 'cover',    t: '00:14', text: 'Reference marker reads 28mm offset. Cover at bottom-left corner measures ≈22mm. Below 25mm TS 500 floor.', flag: 'fail' },
  { agent: 'material', t: '00:19', text: 'Visible ribbing pattern consistent with B500C (S420). No active corrosion in visible frame.' },
  { agent: 'code',     t: '00:24', text: 'TBDY 7.3.4.2 requires min 30mm cover in seismic zones. Current ≈22mm = non-compliant.', flag: 'fail' },
  { agent: 'fraud',    t: '00:28', text: 'EXIF timestamp 2026-04-18 14:22, GPS 41.02N 28.97E matches site. Marker hash OK.' },
  { agent: 'seismic',  t: '00:32', text: 'AFAD zone 1 (PGA 0.4g), ZC soil, 6-storey — cover deficiency is high-impact finding.' },
  { agent: 'mod',      t: '00:40', text: 'CONDITIONAL APPROVE — pour blocked. Rebind cover spacers at column C3 to 30mm, re-photograph, re-run. All other categories pass.', flag: 'synth' },
];

const CATEGORIES = [
  { name: 'Plan conformance',   score: 92 },
  { name: 'Geometry',           score: 84 },
  { name: 'Cover thickness',    score: 41 },
  { name: 'Code compliance',    score: 56 },
  { name: 'Material',           score: 96 },
  { name: 'Fraud / integrity',  score: 100 },
  { name: 'Seismic context',    score: 78 },
];

/* ========== Small UI ========== */

const Dot = ({ hueVar, size = 8 }) => (
  <span style={{
    display: 'inline-block',
    width: size, height: size, borderRadius: 999,
    background: `var(${hueVar})`,
    boxShadow: `0 0 0 2px color-mix(in oklch, var(${hueVar}) 20%, transparent)`,
  }} />
);

const ModelBadge = ({ agent }) => (
  <span className={`chip ${agent.modelClass}`} style={{ height: 18, fontSize: 10, padding: '0 6px', letterSpacing: '0.06em' }}>
    {agent.model}
  </span>
);

const Logo = ({ size = 22 }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
    <svg width={size} height={size} viewBox="0 0 22 22" fill="none">
      <rect x="1" y="1" width="20" height="20" rx="3" stroke="var(--hazard)" strokeWidth="1.5" />
      <path d="M1 6 L21 6 M1 11 L21 11 M1 16 L21 16" stroke="var(--hazard)" strokeWidth="1" opacity="0.5" />
      <path d="M6 1 L6 21 M11 1 L11 21 M16 1 L16 21" stroke="var(--hazard)" strokeWidth="1" opacity="0.5" />
      <circle cx="11" cy="11" r="2.5" fill="var(--hazard)" />
    </svg>
    <span style={{
      fontFamily: 'var(--font-mono)',
      fontSize: 13, fontWeight: 600,
      letterSpacing: '0.12em',
      color: 'var(--text-0)',
    }}>REBARGUARD</span>
  </div>
);

/* ========== Top nav (shared across screens) ========== */

const TopNav = ({ active = 'inspections' }) => {
  const items = [
    { id: 'dashboard',   label: 'Dashboard' },
    { id: 'inspections', label: 'Inspections' },
    { id: 'quick',       label: 'Quick Scan' },
    { id: 'projects',    label: 'Projects' },
    { id: 'agents',      label: 'Agents' },
  ];
  return (
    <div style={{
      height: 52,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 24px',
      background: 'var(--bg-0)',
      borderBottom: '1px solid var(--line-1)',
      position: 'relative',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Logo />
        <div style={{ width: 1, height: 20, background: 'var(--line-2)' }} />
        <nav style={{ display: 'flex', gap: 4 }}>
          {items.map(i => (
            <a key={i.id} style={{
              padding: '6px 10px',
              fontSize: 13, fontWeight: 500,
              color: i.id === active ? 'var(--text-0)' : 'var(--text-2)',
              background: i.id === active ? 'var(--bg-2)' : 'transparent',
              borderRadius: 4,
              textDecoration: 'none',
              cursor: 'pointer',
            }}>{i.label}</a>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em' }}>
          PROJ · KADIKÖY-A7 · POUR #142
        </span>
        <div style={{ width: 1, height: 20, background: 'var(--line-2)' }} />
        <span className="chip" style={{ background: 'transparent', color: 'var(--text-2)' }}>
          <span style={{ width: 6, height: 6, borderRadius: 999, background: 'var(--green)' }} />
          API LIVE
        </span>
        <div style={{
          width: 28, height: 28, borderRadius: 999,
          background: 'linear-gradient(135deg, var(--amber), var(--hazard))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 11, fontWeight: 700, color: '#111',
        }}>EY</div>
      </div>
    </div>
  );
};

Object.assign(window, { AGENTS, DEBATE, CATEGORIES, Dot, ModelBadge, Logo, TopNav });
