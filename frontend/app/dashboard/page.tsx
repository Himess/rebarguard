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
    <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16">
      <Link href="/" className="text-xs text-[var(--color-text-muted)] hover:text-white">
        ← home
      </Link>
      <h1 className="mt-4 text-2xl font-semibold tracking-tight sm:text-3xl">
        Public Inspection Board
      </h1>
      <p className="mt-2 text-sm text-[var(--color-text-muted)]">
        Every uploaded project and pending pour-approval inspection. Anyone can submit.
      </p>

      {err && (
        <div className="mt-6 rounded border border-red-400/40 bg-red-500/10 p-3 text-sm text-red-300">
          Backend unreachable: {err}
        </div>
      )}

      <div className="mt-8 overflow-x-auto rounded-lg border border-[var(--color-border)]">
        <table className="w-full min-w-[720px] text-sm">
          <thead className="bg-[var(--color-panel-2)] text-left text-xs uppercase tracking-wider text-[var(--color-text-muted)]">
            <tr>
              <th className="px-4 py-3">Project</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Elements</th>
              <th className="px-4 py-3">Zone</th>
              <th className="px-4 py-3">Soil</th>
              <th className="px-4 py-3">Floors</th>
              <th className="px-4 py-3">Conf.</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => {
              const m = p.plan.metadata;
              const totalElements =
                p.plan.columns.length +
                p.plan.beams.length +
                p.plan.slabs.length +
                p.plan.shear_walls.length +
                p.plan.stairs.length;
              return (
                <tr key={p.id} className="border-t border-[var(--color-border)]">
                  <td className="px-4 py-3">
                    <div className="font-medium">{m.project_name || 'Untitled'}</div>
                    {m.address && (
                      <div className="text-xs text-[var(--color-text-muted)]">{m.address}</div>
                    )}
                  </td>
                  <td className="px-4 py-3">{m.city ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="font-mono text-xs">
                      {p.plan.columns.length}C • {p.plan.beams.length}B • {p.plan.slabs.length}S
                      {p.plan.shear_walls.length > 0 ? ` • ${p.plan.shear_walls.length}W` : ''}
                    </div>
                  </td>
                  <td className="px-4 py-3">{m.earthquake_zone ?? '—'}</td>
                  <td className="px-4 py-3">{m.soil_class ?? '—'}</td>
                  <td className="px-4 py-3">{m.floor_count ?? '—'}</td>
                  <td className="px-4 py-3">{Math.round(p.plan.confidence * 100)}%</td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/inspection/new?project=${p.id}`}
                      className="rounded bg-[var(--color-accent)] px-3 py-1 text-xs font-medium text-black hover:opacity-90"
                    >
                      Inspect →
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!err && projects.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-[var(--color-text-muted)]">
                  No projects yet.{' '}
                  <Link href="/upload" className="text-[var(--color-accent)]">
                    Upload →
                  </Link>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
