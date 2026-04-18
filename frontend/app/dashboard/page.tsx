import Link from 'next/link';
import { listProjects } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  let projects: Awaited<ReturnType<typeof listProjects>> = [];
  let err: string | null = null;
  try {
    projects = await listProjects();
  } catch (e) {
    err = (e as Error).message;
  }

  return (
    <main className="mx-auto max-w-5xl px-6 py-16">
      <Link href="/" className="text-xs text-[var(--color-text-muted)] hover:text-white">
        ← ana sayfa
      </Link>
      <h1 className="mt-4 text-3xl font-semibold tracking-tight">Belediye Paneli</h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Yüklenmiş projeler ve bekleyen denetimler
      </p>

      {err && (
        <div className="mt-6 rounded border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
          Backend bağlanamadı: {err}
        </div>
      )}

      <div className="mt-8 overflow-hidden rounded-lg border border-[var(--color-border)]">
        <table className="w-full text-sm">
          <thead className="bg-[var(--color-panel-2)] text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Proje</th>
              <th className="px-4 py-3">Kolon Sayısı</th>
              <th className="px-4 py-3">Deprem Bölgesi</th>
              <th className="px-4 py-3">Güven</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} className="border-t border-[var(--color-border)]">
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">{p.plan.columns.length}</td>
                <td className="px-4 py-3">{p.plan.earthquake_zone ?? '—'}</td>
                <td className="px-4 py-3">{Math.round(p.plan.confidence * 100)}%</td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href={`/inspection/new?project=${p.id}`}
                    className="rounded bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-black hover:opacity-90"
                  >
                    Denetim başlat →
                  </Link>
                </td>
              </tr>
            ))}
            {!err && projects.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  Henüz proje yok. <Link href="/upload" className="text-[var(--color-accent)]">Yükle →</Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
