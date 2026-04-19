export function Logo({ size = 22 }: { size?: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size} viewBox="0 0 22 22" fill="none" aria-hidden>
        <rect x="1" y="1" width="20" height="20" rx="3" stroke="var(--hazard)" strokeWidth="1.5" />
        <path d="M1 6 L21 6 M1 11 L21 11 M1 16 L21 16" stroke="var(--hazard)" strokeWidth="1" opacity="0.5" />
        <path d="M6 1 L6 21 M11 1 L11 21 M16 1 L16 21" stroke="var(--hazard)" strokeWidth="1" opacity="0.5" />
        <circle cx="11" cy="11" r="2.5" fill="var(--hazard)" />
      </svg>
      <span
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 13,
          fontWeight: 600,
          letterSpacing: '0.12em',
          color: 'var(--text-0)',
        }}
      >
        REBARGUARD
      </span>
    </div>
  );
}
