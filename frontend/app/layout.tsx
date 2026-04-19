import type { Metadata } from 'next';
import { IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const sans = IBM_Plex_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-sans',
  display: 'swap',
});
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-plex-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RebarGuard — Pre-pour Inspection',
  description:
    'Once concrete pours, the rebar is invisible. RebarGuard runs 8 AI agents against the approved structural plan before each pour. Hermes Agent + Kimi K2.5.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sans.variable} ${mono.variable}`}>
      <body style={{ margin: 0, fontFamily: 'var(--font-plex-sans), var(--font-sans)' }}>
        {children}
      </body>
    </html>
  );
}
