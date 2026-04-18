'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type {
  AgentMessage,
  ElementType,
  Project,
  StructuralElement,
} from '@/lib/api';
import { startInspectionStream, BACKEND_URL } from '@/lib/api';
import AgentDebateFeed from '@/components/AgentDebateFeed';
import BuildingPane from '@/components/BuildingPane';
import ScorePanel, { type Score, type Verdict } from '@/components/ScorePanel';

type ElementEntry = {
  element: StructuralElement;
  type: ElementType;
  label: string;
};

export default function NewInspection() {
  const params = useSearchParams();
  const projectId = params.get('project') || '';

  const [project, setProject] = useState<Project | null>(null);
  const [elementKey, setElementKey] = useState<string>('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [closeup, setCloseup] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

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
    const p = project.plan;
    const out: ElementEntry[] = [];
    for (const c of p.columns) out.push({ element: c, type: 'column', label: `Column ${c.id} (Floor ${c.floor}, ${c.width_mm}×${c.depth_mm})` });
    for (const b of p.beams) out.push({ element: b, type: 'beam', label: `Beam ${b.id} (Floor ${b.floor}, ${b.width_mm}×${b.depth_mm})` });
    for (const w of p.shear_walls) out.push({ element: w, type: 'shear_wall', label: `Wall ${w.id} (${w.floor_from}→${w.floor_to}, t${w.thickness_mm})` });
    for (const s of p.slabs) out.push({ element: s, type: 'slab', label: `Slab ${s.id} (Floor ${s.floor}, t${s.thickness_mm})` });
    for (const st of p.stairs) out.push({ element: st, type: 'stair', label: `Stair ${st.id} (${st.floor_from}→${st.floor_to})` });
    return out;
  }, [project]);

  const selected = useMemo(() => {
    if (!elementKey) return null;
    const [type, id] = elementKey.split(':');
    return entries.find((e) => e.type === (type as ElementType) && e.element.id === id) ?? null;
  }, [entries, elementKey]);

  const detectedRebarCount =
    (messages.find((m) => m.agent === 'plan_parser')?.evidence?.detected_rebar_count as number) ??
    null;
  const moderator = messages.findLast?.(
    (m) => m.agent === 'moderator' && m.kind === 'verdict',
  );
  const score = (moderator?.evidence?.score ?? null) as Score | null;
  const verdict = ((moderator?.evidence?.verdict ?? null) as Verdict | null) ?? null;
  const narrative = (moderator?.evidence?.narrative as string) ?? null;

  function startRun() {
    if (!project || !selected || photos.length === 0) return;
    setMessages([]);
    setRunning(true);
    setDone(false);
    startInspectionStream(
      {
        projectId: project.id,
        elementId: selected.element.id,
        elementType: selected.type,
        photos,
        closeup: closeup ?? undefined,
        cover: cover ?? undefined,
      },
      (m) => setMessages((prev) => [...prev, m]),
      (e) => {
        console.error(e);
        setRunning(false);
      },
      () => {
        setRunning(false);
        setDone(true);
      },
    );
  }

  const meta = project?.plan.metadata;

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 sm:py-10">
      <Link href="/dashboard" className="text-xs text-[var(--color-text-muted)] hover:text-white">
        ← dashboard
      </Link>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Site Inspection</h1>
          <p className="text-sm text-[var(--color-text-muted)]">
            {meta?.project_name ?? 'Loading project...'}
          </p>
        </div>
        {meta && (
          <div className="flex flex-wrap gap-1 text-[10px] font-mono text-[var(--color-text-muted)]">
            {meta.city && <Badge>{meta.city}</Badge>}
            {meta.earthquake_zone && <Badge>{meta.earthquake_zone}</Badge>}
            {meta.soil_class && <Badge>Soil {meta.soil_class}</Badge>}
            {meta.floor_count && <Badge>{meta.floor_count} floors</Badge>}
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr_340px]">
        {/* LEFT — form */}
        <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
          <Field label="Element">
            <select
              value={elementKey}
              onChange={(e) => setElementKey(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] bg-black/40 px-2 py-2 text-sm"
            >
              {entries.map((e) => (
                <option key={`${e.type}:${e.element.id}`} value={`${e.type}:${e.element.id}`}>
                  {e.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Site photos (one or more)">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
              className="w-full text-xs"
            />
            <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
              {photos.length} selected
            </div>
          </Field>

          <Field label="Rebar close-up (optional)">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCloseup(e.target.files?.[0] ?? null)}
              className="w-full text-xs"
            />
          </Field>

          <Field label="Concrete-cover photo (optional)">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
              className="w-full text-xs"
            />
          </Field>

          <button
            onClick={startRun}
            disabled={running || !project || !selected || photos.length === 0}
            className="mt-2 w-full rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
          >
            {running ? '7 agents debating...' : done ? 'Run again' : 'Start inspection'}
          </button>

          <p className="text-[10px] text-[var(--color-text-muted)]">
            City, soil class, and floor count are auto-extracted from the project. No manual entry.
          </p>
        </div>

        {/* CENTER — agent debate */}
        <div className="flex h-[560px] flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4 lg:h-[720px]">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Agent debate</h2>
            <div className="text-xs text-[var(--color-text-muted)]">
              Hermes Agent + Kimi K2.5 live
            </div>
          </div>
          <AgentDebateFeed messages={messages} />
        </div>

        {/* RIGHT — score + 3D */}
        <div className="space-y-4">
          <ScorePanel score={score} verdict={verdict} narrative={narrative} />
          <BuildingPane
            plan={project?.plan ?? null}
            selectedElement={selected?.element ?? null}
            detectedRebarCount={detectedRebarCount}
            onSelectById={(id, type) => {
              if (!id) return;
              const match = entries.find(
                (e) => e.element.id.startsWith(id) && (type === '' || e.type === type),
              );
              if (match) setElementKey(`${match.type}:${match.element.id}`);
            }}
          />
        </div>
      </div>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs text-[var(--color-text-muted)]">{label}</div>
      {children}
    </label>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded border border-[var(--color-border)] px-2 py-0.5">{children}</span>
  );
}
