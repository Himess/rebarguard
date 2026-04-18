'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import type { AgentMessage, Column, Project } from '@/lib/api';
import { startInspectionStream, BACKEND_URL } from '@/lib/api';
import AgentDebateFeed from '@/components/AgentDebateFeed';
import ScorePanel, { type Score, type Verdict } from '@/components/ScorePanel';
import ThreeOverlay from '@/components/ThreeOverlay';

export default function NewInspection() {
  const params = useSearchParams();
  const projectId = params.get('project') || '';

  const [project, setProject] = useState<Project | null>(null);
  const [columnId, setColumnId] = useState<string>('');
  const [photos, setPhotos] = useState<File[]>([]);
  const [closeup, setCloseup] = useState<File | null>(null);
  const [cover, setCover] = useState<File | null>(null);
  const [city, setCity] = useState('Istanbul');
  const [soilClass, setSoilClass] = useState('ZC');
  const [floors, setFloors] = useState(5);

  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    fetch(`${BACKEND_URL}/api/projects/${projectId}`)
      .then((r) => r.json())
      .then((p: Project) => {
        setProject(p);
        if (p.plan.columns[0]) setColumnId(p.plan.columns[0].id);
      });
  }, [projectId]);

  const column: Column | null =
    project?.plan.columns.find((c) => c.id === columnId) ?? null;
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
    if (!project || !columnId || photos.length === 0) return;
    setMessages([]);
    setRunning(true);
    setDone(false);
    startInspectionStream(
      {
        projectId: project.id,
        columnId,
        city,
        soilClass,
        floors,
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

  return (
    <main className="mx-auto max-w-7xl px-6 py-10">
      <Link href="/dashboard" className="text-xs text-[var(--color-text-muted)] hover:text-white">
        ← panel
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight">Saha Denetimi</h1>
      <p className="text-sm text-[var(--color-text-muted)]">
        {project?.name ?? 'Proje yükleniyor...'}
      </p>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-[360px_1fr_360px]">
        {/* LEFT — form */}
        <div className="space-y-4 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
          <Field label="Kolon">
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value)}
              className="w-full rounded border border-[var(--color-border)] bg-black/40 px-2 py-2 text-sm"
            >
              {project?.plan.columns.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.id} — Kat {c.floor} ({c.width_mm}×{c.depth_mm})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Saha fotoğrafları (birden çok)">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => setPhotos(Array.from(e.target.files ?? []))}
              className="w-full text-xs"
            />
            <div className="mt-1 text-[10px] text-[var(--color-text-muted)]">
              {photos.length} foto seçildi
            </div>
          </Field>

          <Field label="Çelik yakın çekim (opsiyonel)">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCloseup(e.target.files?.[0] ?? null)}
              className="w-full text-xs"
            />
          </Field>

          <Field label="Paspayı fotoğrafı (opsiyonel)">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setCover(e.target.files?.[0] ?? null)}
              className="w-full text-xs"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <Field label="Şehir">
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] bg-black/40 px-2 py-1 text-sm"
              />
            </Field>
            <Field label="Zemin">
              <select
                value={soilClass}
                onChange={(e) => setSoilClass(e.target.value)}
                className="w-full rounded border border-[var(--color-border)] bg-black/40 px-2 py-1 text-sm"
              >
                {['ZA', 'ZB', 'ZC', 'ZD', 'ZE'].map((z) => (
                  <option key={z} value={z}>
                    {z}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Kat sayısı">
            <input
              type="number"
              value={floors}
              min={1}
              max={40}
              onChange={(e) => setFloors(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded border border-[var(--color-border)] bg-black/40 px-2 py-1 text-sm"
            />
          </Field>

          <button
            onClick={startRun}
            disabled={running || !project || !columnId || photos.length === 0}
            className="mt-2 w-full rounded bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-40"
          >
            {running ? '7 ajan tartışıyor...' : done ? 'Yeniden çalıştır' : 'Denetimi başlat'}
          </button>
        </div>

        {/* CENTER — agent debate */}
        <div className="flex h-[720px] flex-col rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-medium">Ajan tartışması</h2>
            <div className="text-xs text-[var(--color-text-muted)]">
              Hermes 4 + Kimi-VL canlı
            </div>
          </div>
          <AgentDebateFeed messages={messages} />
        </div>

        {/* RIGHT — score + 3D */}
        <div className="space-y-4">
          <ScorePanel score={score} verdict={verdict} narrative={narrative} />
          <ThreeOverlay column={column} detectedRebarCount={detectedRebarCount} />
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
