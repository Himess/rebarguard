import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RebarGuard — Reinforced-Concrete Inspection Agent',
  description:
    'Multi-agent AI inspector for reinforced-concrete construction sites. Hermes Agent + Kimi K2.5 analyze rebar workmanship against seismic codes before concrete pours.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        {children}
      </body>
    </html>
  );
}
