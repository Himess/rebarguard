/**
 * Agent catalogue — source of truth for UI badges, ring, debate bubbles.
 * Mirrors `backend/src/rebarguard/schemas.AgentRole` and the Hermes Agent design token
 * palette (`--agent-1..8`).
 */

export type AgentId =
  | 'plan'
  | 'geometry'
  | 'code'
  | 'fraud'
  | 'seismic'
  | 'material'
  | 'cover'
  | 'mod';

export type ModelClass = 'blue' | 'amber' | 'neutral';

export type AgentDef = {
  id: AgentId;
  name: string;
  short: string;
  model: string;
  modelClass: ModelClass;
  hueVar: `--agent-${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
  role: string;
};

export const AGENTS: AgentDef[] = [
  { id: 'plan',     name: 'PlanParser',       short: 'PLAN',   model: 'kimi-k2.5',    modelClass: 'blue',  hueVar: '--agent-1', role: 'Reads approved PDF/DWG drawings' },
  { id: 'geometry', name: 'GeometryAgent',    short: 'GEOM',   model: 'hermes-4-70b', modelClass: 'amber', hueVar: '--agent-2', role: 'Plan vs site rebar diff' },
  { id: 'code',     name: 'CodeAgent',        short: 'CODE',   model: 'hermes-4-70b', modelClass: 'amber', hueVar: '--agent-3', role: 'TBDY 2018 / TS 500 compliance' },
  { id: 'fraud',    name: 'FraudAgent',       short: 'FRAUD',  model: 'hermes-4-70b', modelClass: 'amber', hueVar: '--agent-4', role: 'EXIF / marker / hash dup' },
  { id: 'seismic',  name: 'SeismicRiskAgent', short: 'SEISM',  model: 'hermes-4-70b', modelClass: 'amber', hueVar: '--agent-5', role: 'AFAD zone × soil × floors' },
  { id: 'material', name: 'MaterialAgent',    short: 'MATL',   model: 'kimi-k2.5',    modelClass: 'blue',  hueVar: '--agent-6', role: 'Steel class, corrosion' },
  { id: 'cover',    name: 'CoverAgent',       short: 'COVER',  model: 'kimi-k2.5',    modelClass: 'blue',  hueVar: '--agent-7', role: 'Concrete cover estimation' },
  { id: 'mod',      name: 'Moderator',        short: 'MOD',    model: 'hermes-4-70b', modelClass: 'amber', hueVar: '--agent-8', role: 'Synthesizes all findings' },
];

export const AGENT_BY_ID: Record<AgentId, AgentDef> = Object.fromEntries(
  AGENTS.map((a) => [a.id, a]),
) as Record<AgentId, AgentDef>;

/** Map backend AgentRole → AgentId used by the UI. */
export function toAgentId(
  role:
    | 'plan_parser'
    | 'geometry'
    | 'code'
    | 'fraud'
    | 'risk'
    | 'material'
    | 'cover'
    | 'moderator',
): AgentId {
  switch (role) {
    case 'plan_parser':
      return 'plan';
    case 'risk':
      return 'seismic';
    case 'moderator':
      return 'mod';
    default:
      return role as AgentId;
  }
}

export type DemoDebateMsg = {
  agent: AgentId;
  t: string;
  text: string;
  flag?: 'fail' | 'warn' | 'synth';
};

/** Pre-authored debate for static demos / placeholder state. */
export const DEMO_DEBATE: DemoDebateMsg[] = [
  { agent: 'plan',     t: '00:03', text: 'Parsed sheet S-04. Column C3: 8Ø20 longitudinal, Ø10/100 stirrups in confinement zone. Cover: 30mm.' },
  { agent: 'geometry', t: '00:08', text: 'Detected 7 visible longitudinal bars in photo 2. Missing 1 bar on NE face — or occluded by formwork.', flag: 'warn' },
  { agent: 'cover',    t: '00:14', text: 'Reference marker reads 28mm offset. Cover at bottom-left corner measures ≈22mm. Below 25mm TS 500 floor.', flag: 'fail' },
  { agent: 'material', t: '00:19', text: 'Visible ribbing pattern consistent with B500C (S420). No active corrosion in visible frame.' },
  { agent: 'code',     t: '00:24', text: 'TBDY 7.3.4.2 requires min 30mm cover in seismic zones. Current ≈22mm = non-compliant.', flag: 'fail' },
  { agent: 'fraud',    t: '00:28', text: 'EXIF timestamp 2026-04-18 14:22, GPS 41.02N 28.97E matches site. Marker hash OK.' },
  { agent: 'seismic',  t: '00:32', text: 'AFAD zone 1 (PGA 0.4g), ZC soil, 6-storey — cover deficiency is high-impact finding.' },
  { agent: 'mod',      t: '00:40', text: 'CONDITIONAL APPROVE — pour blocked. Rebind cover spacers at column C3 to 30mm, re-photograph, re-run. All other categories pass.', flag: 'synth' },
];

export const CATEGORIES = [
  { name: 'Plan conformance',  score: 92 },
  { name: 'Geometry',          score: 84 },
  { name: 'Cover thickness',   score: 41 },
  { name: 'Code compliance',   score: 56 },
  { name: 'Material',          score: 96 },
  { name: 'Fraud / integrity', score: 100 },
  { name: 'Seismic context',   score: 78 },
] as const;
