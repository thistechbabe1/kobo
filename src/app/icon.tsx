import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#14A877',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Simplified wallet shape */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <rect x="2" y="7" width="20" height="14" rx="3" stroke="white" strokeWidth="2" fill="none" />
          <path d="M2 11h20" stroke="white" strokeWidth="2" />
          <circle cx="17" cy="15" r="1.5" fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
