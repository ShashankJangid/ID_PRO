import React from 'react';

interface LogoProps {
  className?: string;
}

export const Logo: React.FC<LogoProps> = ({ className = 'w-8 h-8' }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
  >
    <defs>
      <linearGradient id="logoOrbitGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="url(#logoOrbitGrad)" /> {/* Falls back or uses theme colors */}
        <stop offset="0%" stopColor="hlsa(var(--primary-h), var(--primary-s), var(--primary-l), 1)" />
        <stop offset="100%" stopColor="hlsa(var(--gradient-h), var(--gradient-s), var(--gradient-l, 50%), 1)" />
      </linearGradient>
      <linearGradient id="logoCardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="#ffffff" />
        <stop offset="100%" stopColor="#f8fafc" />
      </linearGradient>
      <linearGradient id="chipGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#f59e0b" />
        <stop offset="50%" stopColor="#fbbf24" />
        <stop offset="100%" stopColor="#d97706" />
      </linearGradient>
      <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    {/* React orbits */}
    <g className="animate-[spin_25s_linear_infinite]" style={{ transformOrigin: '50px 50px' }}>
      <ellipse cx="50" cy="50" rx="43" ry="15" fill="none" stroke="url(#logoOrbitGrad)" strokeWidth="2.2" opacity="0.85" filter="url(#logoGlow)" />
      <ellipse cx="50" cy="50" rx="43" ry="15" fill="none" stroke="url(#logoOrbitGrad)" strokeWidth="2.2" opacity="0.85" transform="rotate(60 50 50)" filter="url(#logoGlow)" />
      <ellipse cx="50" cy="50" rx="43" ry="15" fill="none" stroke="url(#logoOrbitGrad)" strokeWidth="2.2" opacity="0.85" transform="rotate(120 50 50)" filter="url(#logoGlow)" />
      <circle cx="50" cy="50" r="4" fill="url(#logoOrbitGrad)" filter="url(#logoGlow)" />
    </g>
    {/* ID Card */}
    <g transform="translate(32, 26) rotate(-8)">
      {/* Drop shadow */}
      <rect x="1" y="1" width="35" height="48" rx="4.5" fill="rgba(0,0,0,0.12)" />
      {/* Card base with gradient border */}
      <rect x="0" y="0" width="35" height="48" rx="4.5" fill="url(#logoCardGrad)" stroke="url(#logoOrbitGrad)" strokeWidth="1.2" />
      {/* Card top branding line */}
      <rect x="2" y="2" width="31" height="5" rx="1.5" fill="url(#logoOrbitGrad)" opacity="0.9" />
      {/* Smart Chip */}
      <rect x="4" y="10" width="8" height="6.5" rx="1.5" fill="url(#chipGrad)" stroke="#b45309" strokeWidth="0.4" />
      {/* Name and title lines */}
      <rect x="14" y="11" width="17" height="2" rx="0.5" fill="url(#logoOrbitGrad)" opacity="0.85" />
      <rect x="14" y="14" width="11" height="1.5" rx="0.5" fill="#64748b" />
      {/* Avatar box */}
      <rect x="4" y="20" width="11" height="13" rx="1.5" fill="#f1f5f9" stroke="#cbd5e1" strokeWidth="0.5" />
      <circle cx="9.5" cy="24" r="2.2" fill="#94a3b8" />
      <path d="M 5.5 31 Q 9.5 28 13.5 31" fill="#94a3b8" />
      {/* Info lines */}
      <rect x="18" y="21" width="13" height="1.5" rx="0.5" fill="#64748b" />
      <rect x="18" y="24" width="10" height="1.5" rx="0.5" fill="#94a3b8" />
      <rect x="18" y="27" width="8" height="1.5" rx="0.5" fill="#cbd5e1" />
      {/* Barcode section */}
      <rect x="4" y="37" width="27" height="6.5" rx="1" fill="#fafafa" stroke="#e2e8f0" strokeWidth="0.4" />
      <g opacity="0.85">
        <line x1="6.5" y1="39" x2="6.5" y2="41.5" stroke="#334155" strokeWidth="1.2" />
        <line x1="9" y1="39" x2="9" y2="41.5" stroke="#334155" strokeWidth="0.5" />
        <line x1="11" y1="39" x2="11" y2="41.5" stroke="#334155" strokeWidth="1.8" />
        <line x1="13.5" y1="39" x2="13.5" y2="41.5" stroke="#334155" strokeWidth="0.5" />
        <line x1="15.5" y1="39" x2="15.5" y2="41.5" stroke="#334155" strokeWidth="1.2" />
        <line x1="18" y1="39" x2="18" y2="41.5" stroke="#334155" strokeWidth="0.5" />
        <line x1="20.5" y1="39" x2="20.5" y2="41.5" stroke="#334155" strokeWidth="1.5" />
        <line x1="23.5" y1="39" x2="23.5" y2="41.5" stroke="#334155" strokeWidth="0.5" />
        <line x1="25.5" y1="39" x2="25.5" y2="41.5" stroke="#334155" strokeWidth="1.2" />
        <line x1="28.5" y1="39" x2="28.5" y2="41.5" stroke="#334155" strokeWidth="0.8" />
      </g>
    </g>
  </svg>
);

export default Logo;
