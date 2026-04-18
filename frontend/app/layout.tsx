import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RebarGuard — Betonarme Denetim Ajanı',
  description:
    'Hermes + Kimi-VL destekli çoklu-ajan betonarme saha denetim sistemi. Beton dökümünden önce demir işçiliği otomatik analiz edilir.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] antialiased">
        {children}
      </body>
    </html>
  );
}
