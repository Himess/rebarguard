'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { uploadProject } from '@/lib/api';

export default function UploadPage() {
  const router = useRouter();
  const [pdf, setPdf] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

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

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-xs text-[var(--color-text-muted)] hover:text-white">
        ← home
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">
        Upload the approved project PDF
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Municipality-approved reinforced-concrete structural drawing. Kimi K2.5 will extract the
        column schedule.
      </p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-[var(--color-border)] bg-[var(--color-panel)] px-6 py-12 hover:border-white/30">
          <div className="text-sm">
            {pdf ? pdf.name : 'Choose a PDF or drag it here'}
          </div>
          <div className="text-xs text-[var(--color-text-muted)]">
            {pdf ? `${(pdf.size / 1024 / 1024).toFixed(1)} MB` : 'Max 25 MB'}
          </div>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => setPdf(e.target.files?.[0] ?? null)}
            className="hidden"
          />
        </label>

        {err && (
          <div className="rounded border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
            {err}
          </div>
        )}

        <button
          type="submit"
          disabled={!pdf || busy}
          className="rounded bg-[var(--color-accent)] px-5 py-3 text-sm font-medium text-black disabled:opacity-40"
        >
          {busy ? 'Parsing with Kimi K2.5...' : 'Upload and parse project'}
        </button>
      </form>
    </main>
  );
}
