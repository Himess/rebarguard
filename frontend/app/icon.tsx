import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const size = { width: 64, height: 64 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          background: '#0E1116',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FF6A1F',
          fontSize: 38,
          fontWeight: 800,
          fontFamily: 'monospace',
          letterSpacing: -1,
        }}
      >
        R
      </div>
    ),
    size,
  );
}
