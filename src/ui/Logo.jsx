import { useId } from 'react';

export function Logo({ size = 24, title = 'BreadBai' }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="bb-logo" width={size} height={size} viewBox="0 0 64 64" role="img" aria-label={title}>
      <defs>
        <linearGradient id={`${id}t`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff7e3d" />
          <stop offset="1" stopColor="#e8470d" />
        </linearGradient>
        <radialGradient id={`${id}g`}>
          <stop offset="0" stopColor="#ffe48a" stopOpacity=".95" />
          <stop offset="1" stopColor="#ffe48a" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="64" height="64" rx="15" fill={`url(#${id}t)`} />
      <rect x="1.5" y="1.5" width="61" height="61" rx="13.5" fill="none" stroke="#fff" strokeOpacity=".28" />
      <rect x="9" y="15" width="46" height="34" rx="6" fill="#fff" fillOpacity=".92" />
      <rect x="9" y="30.2" width="46" height="3.6" fill="#e7ddd6" />
      {[16, 24, 32, 40].map((x) => (
        <g key={x}>
          <circle cx={x} cy="22.5" r="2.3" fill="#2b1409" />
          <circle cx={x} cy="41.5" r="2.3" fill="#2b1409" />
        </g>
      ))}
      <circle cx="48" cy="22.5" r="9" fill={`url(#${id}g)`} />
      <circle cx="48" cy="22.5" r="3.4" fill="#ffc531" stroke="#2b1409" strokeWidth="1.2" />
      <path d="M16 41.5C16 30 40 34 40 22.5" fill="none" stroke="#e8470d" strokeWidth="3.2" strokeLinecap="round" />
      <circle cx="16" cy="41.5" r="3" fill="#e8470d" />
      <circle cx="40" cy="22.5" r="3" fill="#e8470d" />
    </svg>
  );
}
