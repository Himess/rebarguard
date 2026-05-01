'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BACKEND_URL } from '@/lib/api';

/**
 * One-click jump into the inspection cockpit running a deterministic replay.
 * Seeds the 1340 Ada 43 Parsel project (idempotent) and pushes to
 * `/inspection/new?project=<id>&replay=fistik_reject` so the demo video
 * always sees the same 9-agent debate timing — no Kimi cold start risk.
 */
export function ReplayDemoButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/demo/fistik`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string };
      router.push(`/inspection/new?project=${data.id}&replay=fistik_reject`);
    } catch (e) {
      setErr((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        onClick={run}
        disabled={busy}
        className="btn primary sm"
        style={{ cursor: busy ? 'wait' : 'pointer' }}
        title="Seed the Fıstık project and open the inspection cockpit in deterministic replay mode (no Kimi cold start)"
      >
        {busy ? 'Loading replay…' : '▶ Replay cockpit'}
      </button>
      {err && (
        <span
          className="mono"
          style={{ fontSize: 10, color: 'var(--red)', letterSpacing: '0.06em' }}
        >
          REPLAY FAILED · {err.slice(0, 48)}
        </span>
      )}
    </div>
  );
}
