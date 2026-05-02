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

const SITE_URL = 'https://rebarguard.vercel.app';
const TITLE = 'RebarGuard — 9 AI agents auditing rebar before concrete pours';
const DESCRIPTION =
  'Once concrete pours, the rebar is invisible. RebarGuard runs 9 Hermes-orchestrated AI agents against the approved structural plan before each pour — Kimi K2.6 vision + Hermes 4 70B reasoning, grounded in TBDY 2018 / TS 500.';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: '%s · RebarGuard',
  },
  description: DESCRIPTION,
  keywords: [
    'rebar inspection',
    'TBDY 2018',
    'TS 500',
    'reinforced concrete',
    'AI civil engineering',
    'Hermes Agent',
    'Kimi K2.6',
    'Nous Research',
    'Kahramanmaraş',
    'pre-pour inspection',
  ],
  authors: [{ name: 'Himess', url: 'https://github.com/Himess' }],
  creator: 'Himess',
  category: 'Construction tech',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: 'RebarGuard',
    title: TITLE,
    description: DESCRIPTION,
    // images: auto-detected from app/opengraph-image.tsx (Next.js convention)
  },
  twitter: {
    card: 'summary_large_image',
    site: '@NousResearch',
    creator: '@himesseth',
    title: TITLE,
    description: DESCRIPTION,
    // images: auto-detected from app/twitter-image.tsx or opengraph-image.tsx
  },
  robots: {
    index: true,
    follow: true,
  },
  // icon: app/icon.tsx generates a 64x64 PNG dynamically — no static asset needed
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
