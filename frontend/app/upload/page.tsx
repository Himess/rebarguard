'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { uploadProject } from '@/lib/api';
import { SAMPLE_STRUCTURAL_PDF, fetchSampleStructuralPdf } from '@/lib/sample-media';

export default function UploadPage() {
  const router = useRouter();
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [loadingSample, setLoadingSample] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pdf) return;
    setBusy(true);
    setErr(null);
    try {
      const p = await uploadProject(pdf);
      router.push(`/inspection/new?project=${p.id}`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  async function loadSample() {
    if (loadingSample || busy) return;
    setLoadingSample(true);
    setErr(null);
    try {
      const file = await fetchSampleStructuralPdf();
      setPdf(file);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setLoadingSample(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)' }}>
      <TopNav projectContext="PROJ · NEW UPLOAD" />

      {/* Breadcrumb */}
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
          <Link
            href="/dashboard"
            style={{
              color: 'var(--text-2)',
              textDecoration: 'none',
              letterSpacing: '0.06em',
            }}
          >
            PROJECTS
          </Link>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span style={{ color: 'var(--text-0)' }}>UPLOAD</span>
        </div>
        <div style={{ color: 'var(--text-3)' }}>ACCEPTS · PDF · MAX 25 MB</div>
      </div>

      <div
        style={{
          padding: 40,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 24,
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 560 }}>
          <span className="chip hazard">01 · PROJECT INGESTION</span>
          <h1
            style={{
              margin: '14px 0 10px',
              fontSize: 32,
              fontWeight: 600,
              letterSpacing: '-0.01em',
            }}
          >
            Upload the approved project
          </h1>
          <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.55 }}>
            Drop the municipality-approved structural drawing as a PDF. Kimi K2.6 will
            extract metadata, column schedule, beams, walls and slabs in the next
            ~30 seconds. (DWG users: plot/export to PDF in your CAD tool first.)
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          style={{ width: '100%', maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 14 }}
        >
          <label
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              padding: '48px 32px',
              border: '1px dashed var(--line-2)',
              background: 'var(--bg-2)',
              borderRadius: 6,
              cursor: 'pointer',
              textAlign: 'center',
            }}
          >
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path
                d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14"
                stroke="var(--hazard)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            <div style={{ fontSize: 14, color: 'var(--text-0)' }}>
              {pdf ? pdf.name : 'Drag & drop plan, or click to browse'}
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.06em' }}>
              {pdf ? `${(pdf.size / 1024 / 1024).toFixed(1)} MB` : 'PDF · MAX 25 MB'}
            </div>
            <input
              type="file"
              accept="application/pdf"
              onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
              style={{ display: 'none' }}
            />
          </label>

          {err && (
            <div
              style={{
                padding: '10px 14px',
                border: '1px solid color-mix(in oklch, var(--red) 40%, var(--line-2))',
                background: 'color-mix(in oklch, var(--red) 12%, var(--bg-2))',
                color: 'var(--text-1)',
                fontSize: 13,
                borderRadius: 4,
              }}
            >
              <span className="mono" style={{ color: 'var(--red)', letterSpacing: '0.06em' }}>
                UPLOAD FAILED
              </span>{' '}
              — {err}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/dashboard" className="btn ghost" style={{ flex: 1, textDecoration: 'none' }}>
              Back to dashboard
            </Link>
            <button
              type="submit"
              className="btn primary"
              style={{ flex: 2 }}
              disabled={!pdf || busy}
            >
              {busy ? 'Parsing with Kimi K2.6…' : 'Parse & continue →'}
            </button>
          </div>

          <button
            type="button"
            onClick={loadSample}
            disabled={loadingSample || busy}
            className="mono"
            style={{
              marginTop: 4,
              padding: '10px 14px',
              background: 'transparent',
              border: '1px dashed var(--line-2)',
              borderRadius: 4,
              color: 'var(--text-1)',
              fontSize: 11,
              letterSpacing: '0.06em',
              cursor: loadingSample ? 'wait' : 'pointer',
              textTransform: 'uppercase',
              textAlign: 'left',
            }}
          >
            {loadingSample
              ? 'Loading sample…'
              : `Try with sample sheet · ${SAMPLE_STRUCTURAL_PDF.title}`}
            <span
              style={{
                display: 'block',
                marginTop: 3,
                fontSize: 10,
                color: 'var(--text-3)',
                textTransform: 'none',
                letterSpacing: 0,
              }}
            >
              {SAMPLE_STRUCTURAL_PDF.hint}
            </span>
          </button>
        </form>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            width: '100%',
            maxWidth: 900,
            marginTop: 40,
          }}
        >
          {[
            { step: '01', title: 'Ingest', body: 'PDF → Kimi K2.6 OCR → structured StructuralPlan (the spec)' },
            { step: '02', title: 'Inspect', body: 'Site photos vs plan → 9-agent debate → geometry / code / fraud / risk' },
            { step: '03', title: 'Authorize', body: 'Moderator verdict → Municipality Agent → human pour-approval' },
          ].map((s) => (
            <div
              key={s.step}
              style={{
                padding: '14px 16px',
                background: 'var(--bg-2)',
                border: '1px solid var(--line-1)',
                borderRadius: 4,
              }}
            >
              <div
                className="mono"
                style={{
                  fontSize: 10,
                  color: 'var(--hazard)',
                  letterSpacing: '0.1em',
                  marginBottom: 6,
                }}
              >
                {s.step} · {s.title.toUpperCase()}
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.5 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
