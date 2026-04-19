'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BACKEND_URL } from '@/lib/api';

export function SeedFistikButton() {
  const router = useRouter();
  const [seeding, setSeeding] = useState(false);
  const [seedId, setSeedId] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    if (seedId) {
      router.push(`/inspection/new?project=${seedId}`);
      return;
    }
    setSeeding(true);
    setErr(null);
    try {
      const res = await fetch(`${BACKEND_URL}/api/demo/fistik`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      const data = (await res.json()) as { id: string };
      setSeedId(data.id);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSeeding(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <button
        onClick={run}
        disabled={seeding}
        className="btn ghost sm"
        style={{ cursor: seeding ? 'wait' : 'pointer' }}
      >
        {seeding ? 'Seeding…' : seedId ? 'Open seeded →' : 'Seed Fıstık demo'}
      </button>
      {err && (
        <span
          className="mono"
          style={{ fontSize: 10, color: 'var(--red)', letterSpacing: '0.06em' }}
        >
          SEED FAILED · {err.slice(0, 48)}
        </span>
      )}
    </div>
  );
}
