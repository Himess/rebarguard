import Link from 'next/link';
import { TopNav } from '@/components/TopNav';
import { SeedFistikButton } from '@/components/SeedFistikButton';
import { listProjects, type Project } from '@/lib/api';

export const dynamic = 'force-dynamic';

export default async function Dashboard() {
  let projects: Project[] = [];
  let err: string | null = null;
  try {
    projects = await listProjects();
  } catch (e) {
    err = (e as Error).message;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-1)' }}>
      <TopNav projectContext="PROJ · ALL · GLOBAL" />

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
          <span>PROJECTS</span>
          <span style={{ color: 'var(--text-3)' }}>/</span>
          <span style={{ color: 'var(--text-0)' }}>ALL</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span>{projects.length} PROJECTS</span>
          <span style={{ color: err ? 'var(--red)' : 'var(--green)' }}>
            {err ? '● OFFLINE' : '● ONLINE'}
          </span>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Public Inspection Board</h1>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-2)' }}>
              Every uploaded project and pending pour-approval inspection. Anyone can submit.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <Link href="/demo" className="btn ghost sm" style={{ textDecoration: 'none' }}>
              Demo scenarios
            </Link>
            <SeedFistikButton />
            <Link href="/quick" className="btn ghost sm" style={{ textDecoration: 'none' }}>
              Quick scan
            </Link>
            <Link href="/upload" className="btn primary sm" style={{ textDecoration: 'none' }}>
              Upload project →
            </Link>
          </div>
        </div>

        {err && (
          <div
            style={{
              padding: '10px 14px',
              background: 'color-mix(in oklch, var(--red) 12%, var(--bg-2))',
              border: '1px solid color-mix(in oklch, var(--red) 40%, var(--line-2))',
              borderRadius: 4,
              color: 'var(--text-1)',
              fontSize: 12,
              marginBottom: 16,
            }}
          >
            <span className="mono" style={{ color: 'var(--red)', letterSpacing: '0.06em' }}>
              BACKEND OFFLINE
            </span>{' '}
            — {err}
          </div>
        )}

        <div
          className="panel"
          style={{
            overflow: 'hidden',
            border: '1px solid var(--line-1)',
            background: 'var(--bg-2)',
          }}
        >
          <div className="panel-h">
            <span>Projects</span>
            <span>{projects.length} total</span>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table
              style={{
                width: '100%',
                minWidth: 900,
                borderCollapse: 'collapse',
                fontSize: 13,
              }}
            >
              <thead>
                <tr
                  className="mono"
                  style={{
                    fontSize: 10,
                    color: 'var(--text-3)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    background: 'var(--bg-1)',
                  }}
                >
                  <Th>Project</Th>
                  <Th>City</Th>
                  <Th align="right">Elements</Th>
                  <Th>Zone</Th>
                  <Th>Soil</Th>
                  <Th align="right">Floors</Th>
                  <Th align="right">Conf.</Th>
                  <Th align="right" />
                </tr>
              </thead>
              <tbody>
                {projects.map((p) => {
                  const m = p.plan.metadata;
                  const total =
                    p.plan.columns.length +
                    p.plan.beams.length +
                    p.plan.slabs.length +
                    p.plan.shear_walls.length +
                    p.plan.stairs.length;
                  const confPct = Math.round((p.plan.confidence ?? 0) * 100);
                  return (
                    <tr
                      key={p.id}
                      style={{
                        borderTop: '1px solid var(--line-1)',
                      }}
                    >
                      <Td>
                        <div style={{ fontWeight: 600, color: 'var(--text-0)' }}>
                          {m.project_name || 'Untitled'}
                        </div>
                        {m.parcel_no && (
                          <div
                            className="mono"
                            style={{
                              fontSize: 10,
                              color: 'var(--text-3)',
                              letterSpacing: '0.04em',
                              marginTop: 2,
                            }}
                          >
                            {m.parcel_no}
                          </div>
                        )}
                      </Td>
                      <Td>{m.city ?? '—'}</Td>
                      <Td align="right">
                        <span className="mono" style={{ color: 'var(--text-0)' }}>
                          {total}
                        </span>{' '}
                        <span
                          className="mono"
                          style={{ color: 'var(--text-3)', fontSize: 10 }}
                        >
                          {p.plan.columns.length}C · {p.plan.beams.length}B ·{' '}
                          {p.plan.shear_walls.length}W
                        </span>
                      </Td>
                      <Td>
                        {m.earthquake_zone ? (
                          <span className="chip">{m.earthquake_zone.replace(/\(.*\)/, '').trim()}</span>
                        ) : (
                          '—'
                        )}
                      </Td>
                      <Td>
                        {m.soil_class ? (
                          <span className="chip">{m.soil_class}</span>
                        ) : (
                          '—'
                        )}
                      </Td>
                      <Td align="right">
                        <span className="mono num">{m.floor_count ?? '—'}</span>
                      </Td>
                      <Td align="right">
                        <span className="mono num">{confPct}%</span>
                      </Td>
                      <Td align="right">
                        <Link
                          href={`/inspection/new?project=${p.id}`}
                          className="btn primary sm"
                          style={{ textDecoration: 'none', display: 'inline-flex' }}
                        >
                          Inspect →
                        </Link>
                      </Td>
                    </tr>
                  );
                })}
                {!err && projects.length === 0 && (
                  <tr>
                    <td
                      colSpan={8}
                      style={{
                        padding: '40px 20px',
                        textAlign: 'center',
                        color: 'var(--text-2)',
                        fontSize: 13,
                      }}
                    >
                      No projects yet.{' '}
                      <Link href="/upload" style={{ color: 'var(--hazard)' }}>
                        Upload your first →
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {!err && projects.length === 0 && (
          <div
            style={{
              marginTop: 14,
              padding: '14px 16px',
              background: 'var(--bg-2)',
              border: '1px dashed var(--line-2)',
              borderRadius: 4,
              fontSize: 12,
              color: 'var(--text-2)',
              fontFamily: 'var(--font-mono)',
              letterSpacing: '0.04em',
            }}
          >
            Tip: <span style={{ color: 'var(--text-0)' }}>POST /api/demo/fistik</span> seeds a
            realistic 1340 Ada 43 Parsel project (6+2 floors, 7.95×15m, İnş. Müh. Ferhat Baş) so
            you can walk the full demo flow.
          </div>
        )}
      </div>
    </div>
  );
}

function Th({ children, align }: { children?: React.ReactNode; align?: 'right' | 'left' }) {
  return (
    <th
      style={{
        padding: '10px 14px',
        textAlign: align ?? 'left',
        fontWeight: 500,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  align,
}: {
  children?: React.ReactNode;
  align?: 'right' | 'left';
}) {
  return (
    <td
      style={{
        padding: '12px 14px',
        textAlign: align ?? 'left',
        color: 'var(--text-1)',
        verticalAlign: 'top',
      }}
    >
      {children}
    </td>
  );
}
