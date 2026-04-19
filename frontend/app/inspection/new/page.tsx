'use client';

import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { TopNav } from '@/components/TopNav';
import { DebateStream, type DebateItem } from '@/components/DebateStream';
import { ScorePanel, type Verdict, type CategoryScore } from '@/components/ScorePanel';
import { ClaudeBuildingViewer, stageToFloorIndex } from '@/components/ClaudeBuildingViewer';
import { VerdictCinema, type VerdictCinemaPayload } from '@/components/VerdictCinema';
import { AGENTS, CATEGORIES, toAgentId, type AgentId } from '@/lib/agents';
import {
  BACKEND_URL,
  startInspectionStream,
  type AgentMessage,
  type ElementType,
  type InspectionStage,
  type Project,
  type StructuralElement,
} from '@/lib/api';

const STAGES: { value: InspectionStage; label: string }[] = [
  { value: 'foundation',   label: 'Foundation · confinement zone' },
  { value: 'ground_floor', label: 'Ground floor · pre-pour' },
  { value: 'mid_floor',    label: 'Mid floor · pre-pour' },
  { value: 'roof',         label: 'Roof slab · pre-pour' },
  { value: 'other',        label: 'Other · ad-hoc' },
];

type ElementEntry = {
  element: StructuralElement;
  type: ElementType;
  label: string;
};

type ViewMode = 'inspected' | 'full' | 'section';

function flagFromMessage(m: AgentMessage): DebateItem['flag'] {
  const sev = (m.evidence as { severity?: string } | undefined)?.severity;
  if (m.agent === 'moderator' && m.kind === 'verdict') return 'synth';
  if (sev === 'critical') return 'fail';
  if (sev === 'high' || sev === 'medium') return 'warn';
  if (m.kind === 'challenge') return 'warn';
  return null;
}

function msToTimer(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const mm = String(Math.floor(totalSec / 60)).padStart(2, '0');
  const ss = String(totalSec % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

export default function NewInspectionPage() {
  return (
    <Suspense fallback={null}>
      <NewInspection />
    </Suspense>
  );
}

function NewInspection() {
  const params = useSearchParams();
  const projectId = params.get('project') || '';

  const [project, setProject] = useState<Project | null>(null);
  const [elementKey, setElementKey] = useState('');
  const [stage, setStage] = useState<InspectionStage>('foundation');
  const [photos, setPhotos] = useState<File[]>([]);
  const [closeup, setCloseup] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const [score, setScore] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('inspected');
  const startTimeRef = useRef<number>(0);
  const cancelRef = useRef<() => void>(() => {});

  useEffect(() => {
    if (!projectId) return;
    fetch(`${BACKEND_URL}/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((p: Project) => {
        setProject(p);
        const first = p.plan.columns[0] || p.plan.beams[0] || p.plan.shear_walls[0];
        if (first) setElementKey(`${first.element_type}:${first.id}`);
      })
      .catch(() => {});
  }, [projectId]);

  const entries: ElementEntry[] = useMemo(() => {
    if (!project) return [];
    const out: ElementEntry[] = [];
    for (const c of project.plan.columns)
      out.push({ element: c, type: 'column', label: `Column ${c.id} — F${c.floor}` });
    for (const b of project.plan.beams)
      out.push({ element: b, type: 'beam', label: `Beam ${b.id} — F${b.floor}` });
    for (const w of project.plan.shear_walls)
      out.push({ element: w, type: 'shear_wall', label: `Wall ${w.id} — ${w.floor_from}→${w.floor_to}` });
    for (const s of project.plan.slabs)
      out.push({ element: s, type: 'slab', label: `Slab ${s.id} — F${s.floor}` });
    for (const st of project.plan.stairs)
      out.push({ element: st, type: 'stair', label: `Stair ${st.id} — ${st.floor_from}→${st.floor_to}` });
    return out;
  }, [project]);

  const selected = useMemo(() => {
    if (!elementKey) return null;
    const [type, id] = elementKey.split(':');
    return entries.find((e) => e.type === (type as ElementType) && e.element.id === id) ?? null;
  }, [entries, elementKey]);

  const debateItems: DebateItem[] = useMemo(() => {
    return messages
      .filter((m) => m.kind !== 'observation' || m.agent === 'moderator' || m.agent === 'risk' || m.agent === 'plan_parser')
      .map((m) => ({
        agent: toAgentId(m.agent) as AgentId,
        t: msToTimer(new Date(m.timestamp).getTime() - startTimeRef.current),
        text: m.content,
        flag: flagFromMessage(m),
        evidence: m.evidence,
        model: m.model,
      }));
  }, [messages]);

  const moderatorMsg = messages.findLast?.(
    (m) => m.agent === 'moderator' && m.kind === 'verdict',
  );
  const municipalityMsg = messages.findLast?.(
    (m) => m.agent === 'municipality' && m.kind === 'verdict',
  );
  const verdict = (moderatorMsg?.evidence as { verdict?: Verdict } | undefined)?.verdict ?? null;
  const narrative = (moderatorMsg?.evidence as { narrative?: string } | undefined)?.narrative ?? null;
  const modScore = (moderatorMsg?.evidence as { score?: { overall?: number } } | undefined)?.score?.overall;

  // Cinema modal on final verdict
  const [cinema, setCinema] = useState<VerdictCinemaPayload | null>(null);
  const cinemaShownRef = useRef<string | null>(null);
  useEffect(() => {
    if (!moderatorMsg || !verdict) return;
    if (cinemaShownRef.current === moderatorMsg.id) return;
    cinemaShownRef.current = moderatorMsg.id;
    const criticalIssues =
      ((moderatorMsg?.evidence as { critical_issues?: string[] } | undefined)?.critical_issues ?? []);
    const muni = municipalityMsg?.evidence as
      | { recommendation?: VerdictCinemaPayload['municipalRecommendation']; narrative?: string }
      | undefined;
    setCinema({
      verdict,
      overall: modScore ?? 0,
      narrative: narrative ?? '',
      criticalIssues,
      municipalRecommendation: muni?.recommendation ?? null,
      municipalNarrative: muni?.narrative ?? null,
    });
  }, [moderatorMsg, verdict, modScore, narrative, municipalityMsg]);

  // Re-trigger cinema when municipality arrives AFTER moderator (enrich)
  useEffect(() => {
    if (!cinema || !municipalityMsg) return;
    const muni = municipalityMsg.evidence as
      | { recommendation?: VerdictCinemaPayload['municipalRecommendation']; narrative?: string }
      | undefined;
    if (!muni) return;
    if (cinema.municipalRecommendation !== (muni.recommendation ?? null)) {
      setCinema({ ...cinema, municipalRecommendation: muni.recommendation ?? null, municipalNarrative: muni.narrative ?? null });
    }
  }, [municipalityMsg, cinema]);

  // ESC to close cinema
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setCinema(null);
    }
    if (cinema) {
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
  }, [cinema]);

  const categoryScores: CategoryScore[] = useMemo(() => {
    const s = (moderatorMsg?.evidence as { score?: Record<string, number> } | undefined)?.score;
    if (s) {
      return [
        { name: 'Plan conformance',  score: s.geometry ?? 0 },
        { name: 'Geometry',          score: s.geometry ?? 0 },
        { name: 'Cover thickness',   score: s.cover ?? 0 },
        { name: 'Code compliance',   score: s.compliance ?? 0 },
        { name: 'Material',          score: s.material ?? 0 },
        { name: 'Fraud / integrity', score: s.fraud ?? 0 },
        { name: 'Seismic context',   score: s.risk ?? 0 },
      ];
    }
    return CATEGORIES as unknown as CategoryScore[];
  }, [moderatorMsg]);

  // Animate overall score up to target
  useEffect(() => {
    const target = modScore ?? 0;
    if (!modScore) {
      setScore(0);
      return;
    }
    let raf: number;
    let start: number | null = null;
    const step = (t: number) => {
      if (start === null) start = t;
      const p = Math.min(1, (t - start) / 1400);
      setScore(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [modScore]);

  function startRun() {
    if (!project || !selected || photos.length === 0) return;
    setMessages([]);
    setScore(0);
    setRunning(true);
    setDone(false);
    startTimeRef.current = Date.now();
    cancelRef.current = startInspectionStream(
      {
        projectId: project.id,
        elementId: selected.element.id,
        elementType: selected.type,
        stage,
        photos,
        closeup: closeup ?? undefined,
        cover: cover ?? undefined,
      },
      (m) => setMessages((prev) => [...prev, m]),
      () => setRunning(false),
      () => {
        setRunning(false);
        setDone(true);
      },
    );
  }
  useEffect(() => () => cancelRef.current(), []);

  const meta = project?.plan.metadata;
  const detectedRebarCount =
    (messages.find((m) => m.agent === 'plan_parser')?.evidence?.detected_rebar_count as number) ??
    null;
  const projectContext = project
    ? `PROJ · ${(meta?.project_name ?? 'UNNAMED').toUpperCase().replace(/\s+/g, '-')} · POUR #NEW`
    : 'PROJ · LOADING';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)' }}>
      <VerdictCinema payload={cinema} onClose={() => setCinema(null)} />
      <TopNav projectContext={projectContext} />

      {/* Breadcrumb strip */}
      <div
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          borderBottom: '1px solid var(--line-1)',
          background: 'var(--bg-1)',
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.06em',
          color: 'var(--text-2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>INSPECTIONS</span>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span>{(meta?.project_name ?? '—').toUpperCase()}</span>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span>POUR · NEW</span>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span style={{ color: 'var(--text-0)' }}>
            {running ? 'RUNNING' : done ? 'COMPLETE' : 'DRAFT'}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>RUN ID · {project?.id.slice(0, 8).toUpperCase() ?? '—'}</span>
          <span>
            STARTED {startTimeRef.current ? new Date(startTimeRef.current).toLocaleTimeString('en-GB') : '—'}
          </span>
          <span style={{ color: running ? 'var(--hazard)' : 'var(--text-3)' }}>
            {running ? '● LIVE SSE' : '○ IDLE'}
          </span>
        </div>
      </div>

      {/* Main grid: left 320 | (center top 3D / center bottom debate+score) */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gridTemplateRows: '1fr 490px',
          minHeight: 'calc(100vh - 88px)',
        }}
      >
        {/* Left rail — inputs */}
        <div
          style={{
            gridRow: '1 / 3',
            borderRight: '1px solid var(--line-1)',
            background: 'var(--bg-1)',
            padding: 16,
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          <div>
            <Eyebrow>01 · Inputs</Eyebrow>
            <label
              style={{
                display: 'block',
                border: '1px dashed var(--line-2)',
                borderRadius: 4,
                padding: 18,
                textAlign: 'center',
                background: 'var(--bg-2)',
                cursor: 'pointer',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--text-1)', marginBottom: 4 }}>
                Drop plan + site photos
              </div>
              <div
                className="mono"
                style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em' }}
              >
                PDF · DWG · HEIC · JPG
              </div>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
                style={{ display: 'none' }}
              />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {photos.map((f, i) => (
              <FileChip key={i} kind="PHOTO" name={f.name} size={`${(f.size / 1024 / 1024).toFixed(1)} MB`} ok />
            ))}
            {closeup && <FileChip kind="CLOSEUP" name={closeup.name} size={`${(closeup.size / 1024 / 1024).toFixed(1)} MB`} ok />}
            {cover && <FileChip kind="COVER" name={cover.name} size={`${(cover.size / 1024 / 1024).toFixed(1)} MB`} ok />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SmallUpload label="Close-up" onFile={setCloseup} />
            <SmallUpload label="Cover marker" onFile={setCover} />
          </div>

          <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 14 }}>
            <Eyebrow>02 · Scope</Eyebrow>
            <ScopeSelect label="Element" value={elementKey} onChange={setElementKey} entries={entries} />
            <StageSelect value={stage} onChange={setStage} />
            <Field label="Floor" value={selected?.element && 'floor' in selected.element ? String((selected.element as { floor: string }).floor) : '—'} />
            <Field label="Pour spec" value="C30/37 · S4" />
          </div>

          <div style={{ borderTop: '1px solid var(--line-1)', paddingTop: 14 }}>
            <Eyebrow>03 · Metadata</Eyebrow>
            <Field label="Inspector" value="E. Yılmaz (TMMOB-4821)" />
            <Field label="Site" value={meta?.address ?? meta?.city ?? '—'} />
            <Field
              label="AFAD zone"
              value={`${meta?.earthquake_zone ?? '—'} · ${meta?.peak_ground_acceleration_g ?? '?'}g · ${meta?.soil_class ?? '—'} soil`}
            />
            <Field
              label="Height"
              value={`${meta?.floor_count ?? '?'} floors · ${meta?.total_height_m ?? '?'} m`}
            />
          </div>

          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 14 }}>
            <button
              className="btn primary"
              style={{ width: '100%', height: 40 }}
              onClick={startRun}
              disabled={running || !project || !selected || photos.length === 0}
            >
              {running ? 'Agents debating…' : done ? 'Run again →' : 'Start inspection →'}
            </button>
            <div
              className="mono"
              style={{
                fontSize: 10,
                color: 'var(--text-3)',
                letterSpacing: '0.06em',
                textAlign: 'center',
              }}
            >
              EST. 38s · 8 AGENTS · SUBSCRIPTION
            </div>
          </div>
        </div>

        {/* Center-top: 3D viewer */}
        <div
          style={{
            position: 'relative',
            borderBottom: '1px solid var(--line-1)',
            background: 'var(--bg-0)',
            overflow: 'hidden',
          }}
        >
          <div className="bp-grid" style={{ position: 'absolute', inset: 0 }} />
          <ClaudeBuildingViewer highlightFloorIndex={stageToFloorIndex(stage)} />

          {/* Corner annotations */}
          <div style={{ position: 'absolute', top: 16, left: 16, display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'none' }}>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em' }}>VIEW · N-NE ISO</div>
            <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.1em' }}>SCALE · 1:120</div>
          </div>

          {/* View-mode toggle top-right */}
          <div
            style={{
              position: 'absolute',
              top: 16,
              right: 16,
              display: 'flex',
              gap: 4,
              background: 'rgba(14,16,22,0.7)',
              border: '1px solid var(--line-2)',
              borderRadius: 3,
              padding: 3,
            }}
          >
            {([
              ['inspected', 'Inspected'],
              ['full', 'Full building'],
              ['section', 'Section cut'],
            ] as const).map(([id, l]) => (
              <button
                key={id}
                onClick={() => setViewMode(id)}
                style={{
                  height: 26,
                  padding: '0 10px',
                  fontSize: 11,
                  fontWeight: 500,
                  background: viewMode === id ? 'var(--hazard)' : 'transparent',
                  color: viewMode === id ? '#111' : 'var(--text-1)',
                  border: 'none',
                  borderRadius: 2,
                  cursor: 'pointer',
                  letterSpacing: '0.02em',
                }}
              >
                {l}
              </button>
            ))}
          </div>

          {/* Callout */}
          {selected && (
            <div
              style={{
                position: 'absolute',
                left: '44%',
                top: '48%',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                pointerEvents: 'none',
              }}
            >
              <div style={{ width: 80, height: 1, background: 'var(--hazard)', opacity: 0.5 }} />
              <div
                style={{
                  padding: '6px 10px',
                  background: 'rgba(14,16,22,0.9)',
                  border: '1px solid var(--hazard)',
                  borderRadius: 3,
                  fontFamily: 'var(--font-mono)',
                  fontSize: 10,
                  letterSpacing: '0.06em',
                  color: 'var(--hazard)',
                  textTransform: 'uppercase',
                  fontWeight: 600,
                  whiteSpace: 'nowrap',
                }}
              >
                {summaryOfElement(selected.element)}
              </div>
            </div>
          )}
        </div>

        {/* Bottom: debate + score */}
        <div
          style={{
            gridColumn: '2 / 3',
            display: 'grid',
            gridTemplateColumns: '1fr 440px',
            minHeight: 0,
          }}
        >
          <div
            style={{
              borderRight: '1px solid var(--line-1)',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
            }}
          >
            <div className="panel-h" style={{ borderBottom: '1px solid var(--line-1)' }}>
              <span>Agent debate · SSE stream</span>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ color: running ? 'var(--hazard)' : 'var(--text-3)' }}>●</span>
                <span style={{ color: 'var(--text-1)' }}>
                  {debateItems.length}/{AGENTS.length}
                </span>
              </span>
            </div>
            <DebateStream messages={debateItems} total={AGENTS.length} />
          </div>

          <div style={{ background: 'var(--bg-1)', display: 'flex', flexDirection: 'column' }}>
            <div className="panel-h" style={{ borderBottom: '1px solid var(--line-1)' }}>
              <span>Score · verdict</span>
              <span style={{ color: 'var(--text-1)' }}>7 CATEGORIES</span>
            </div>
            <ScorePanel
              score={score}
              verdict={verdict}
              categories={categoryScores}
              moderatorNarrative={narrative}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function summaryOfElement(el: StructuralElement): string {
  if (el.element_type === 'column') {
    const rebar = el.longitudinal[0];
    return `COLUMN ${el.id} · F${el.floor} · ${rebar ? `${rebar.count}Ø${rebar.diameter_mm}` : ''} · Ø${el.stirrup.diameter_mm}/${el.stirrup.spacing_mm}`;
  }
  if (el.element_type === 'shear_wall') {
    return `WALL ${el.id} · ${el.floor_from}→${el.floor_to} · t${el.thickness_mm}`;
  }
  if (el.element_type === 'beam') {
    return `BEAM ${el.id} · F${el.floor} · ${el.width_mm}×${el.depth_mm}`;
  }
  return `${el.element_type.toUpperCase()} ${el.id}`;
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontSize: 11,
        color: 'var(--text-3)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        marginBottom: 10,
        fontFamily: 'var(--font-mono)',
      }}
    >
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '6px 0',
        gap: 8,
        borderBottom: '1px dashed var(--line-1)',
      }}
    >
      <span
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--text-3)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
          whiteSpace: 'nowrap',
        }}
      >
        {label}
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-0)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function FileChip({
  kind,
  name,
  size,
  ok,
}: {
  kind: string;
  name: string;
  size: string;
  ok: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '8px 10px',
        background: 'var(--bg-2)',
        border: '1px solid var(--line-1)',
        borderRadius: 3,
      }}
    >
      <span className="chip" style={{ height: 18, fontSize: 9, padding: '0 6px' }}>
        {kind}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-0)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {name}
        </div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--text-3)' }}>
          {size}
        </div>
      </div>
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: 999,
          background: ok ? 'var(--green)' : 'var(--yellow)',
        }}
      />
    </div>
  );
}

function SmallUpload({ label, onFile }: { label: string; onFile: (f: File | null) => void }) {
  return (
    <label
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 10px',
        border: '1px dashed var(--line-2)',
        borderRadius: 3,
        cursor: 'pointer',
        background: 'var(--bg-2)',
      }}
    >
      <span className="mono" style={{ fontSize: 10, color: 'var(--text-3)', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        +  {label}
      </span>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        style={{ display: 'none' }}
      />
    </label>
  );
}

function StageSelect({
  value,
  onChange,
}: {
  value: InspectionStage;
  onChange: (v: InspectionStage) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--text-3)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        Stage
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as InspectionStage)}
        style={{
          height: 30,
          padding: '0 10px',
          fontSize: 12,
          background: 'var(--bg-2)',
          color: 'var(--text-0)',
          border: '1px solid var(--line-2)',
          borderRadius: 3,
          fontFamily: 'var(--font-sans)',
        }}
      >
        {STAGES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function ScopeSelect({
  label,
  value,
  onChange,
  entries,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  entries: ElementEntry[];
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
      <span
        className="mono"
        style={{
          fontSize: 10,
          color: 'var(--text-3)',
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          height: 30,
          padding: '0 10px',
          fontSize: 12,
          background: 'var(--bg-2)',
          color: 'var(--text-0)',
          border: '1px solid var(--line-2)',
          borderRadius: 3,
          fontFamily: 'var(--font-sans)',
        }}
      >
        {entries.map((e) => (
          <option key={`${e.type}:${e.element.id}`} value={`${e.type}:${e.element.id}`}>
            {e.label}
          </option>
        ))}
      </select>
    </div>
  );
}
