'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from './Logo';

const ITEMS = [
  { href: '/', id: 'home', label: 'Home' },
  { href: '/dashboard', id: 'projects', label: 'Projects' },
  { href: '/inspection/new', id: 'inspections', label: 'Inspections' },
  { href: '/quick', id: 'quick', label: 'Quick Scan' },
  { href: '/watch', id: 'watch', label: 'Citizen Watch' },
  { href: '/demo', id: 'demo', label: 'Demo' },
  { href: '/agents', id: 'agents', label: 'Agents' },
];

type Props = {
  projectContext?: string;
  live?: boolean;
};

export function TopNav({
  projectContext = 'PROJ · 1340-ADA-43 · POUR #142',
  live = true,
}: Props) {
  const pathname = usePathname() || '/';
  const activeId = ITEMS.find((i) => pathname === i.href || (i.href !== '/' && pathname.startsWith(i.href)))?.id ?? 'dashboard';
  return (
    <div
      style={{
        height: 52,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        background: 'var(--bg-0)',
        borderBottom: '1px solid var(--line-1)',
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Link href="/" style={{ textDecoration: 'none' }}>
          <Logo />
        </Link>
        <div style={{ width: 1, height: 20, background: 'var(--line-2)' }} />
        <nav style={{ display: 'flex', gap: 4 }}>
          {ITEMS.map((i) => (
            <Link
              key={i.id}
              href={i.href}
              style={{
                padding: '6px 10px',
                fontSize: 13,
                fontWeight: 500,
                color: i.id === activeId ? 'var(--text-0)' : 'var(--text-2)',
                background: i.id === activeId ? 'var(--bg-2)' : 'transparent',
                borderRadius: 4,
                textDecoration: 'none',
              }}
            >
              {i.label}
            </Link>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span
          className="mono"
          style={{ fontSize: 11, color: 'var(--text-3)', letterSpacing: '0.08em' }}
        >
          {projectContext}
        </span>
        <div style={{ width: 1, height: 20, background: 'var(--line-2)' }} />
        <span className="chip" style={{ background: 'transparent', color: 'var(--text-2)' }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: live ? 'var(--green)' : 'var(--text-3)',
            }}
          />
          {live ? 'API LIVE' : 'API IDLE'}
        </span>
        <div
          style={{
            width: 28,
            height: 28,
            borderRadius: 999,
            background: 'linear-gradient(135deg, var(--amber), var(--hazard))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 11,
            fontWeight: 700,
            color: '#111',
          }}
        >
          EY
        </div>
      </div>
    </div>
  );
}
