import React, { useEffect, useRef, useCallback } from 'react';

interface RobotAvatarProps {
  isPasswordFocused: boolean;
  isSuccess: boolean;
  isLoading: boolean;
}

const LERP = 0.09; // smoothing factor — higher = snappier, lower = more lag

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const RobotAvatar: React.FC<RobotAvatarProps> = ({
  isPasswordFocused,
  isSuccess,
  isLoading,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Target values (updated instantly on mousemove)
  const target = useRef({ headX: 0, headY: 0, eyeX: 0, eyeY: 0 });
  // Current smoothed values
  const current = useRef({ headX: 0, headY: 0, eyeX: 0, eyeY: 0 });
  // RAF handle
  const rafRef = useRef<number>(0);

  // DOM refs for direct mutations — no setState during animation
  const headGroupRef = useRef<SVGGElement>(null);
  const antennaGroupRef = useRef<SVGGElement>(null);
  const leftPupilRef = useRef<SVGGElement>(null);
  const rightPupilRef = useRef<SVGGElement>(null);

  // Prop refs so the RAF loop can read them without stale closure
  const isPasswordFocusedRef = useRef(isPasswordFocused);
  const isSuccessRef = useRef(isSuccess);
  isPasswordFocusedRef.current = isPasswordFocused;
  isSuccessRef.current = isSuccess;

  const getSpeechText = () => {
    if (isSuccess) return "Enjoy Card Gen! 🎉";
    if (isLoading) return "Signing you in... ⚡";
    if (isPasswordFocused) return "I'm looking away! 🙈";
    return "Welcome! Let's sign in 👋";
  };

  // Apply smoothed values directly to DOM refs
  const applyTransforms = useCallback(() => {
    const { headX, headY, eyeX, eyeY } = current.current;

    if (headGroupRef.current) {
      headGroupRef.current.style.transform =
        `translate(${headX}px, ${headY}px) rotate(${headX * 1.2}deg)`;
    }
    if (antennaGroupRef.current) {
      antennaGroupRef.current.style.transform =
        `translate(${headX * 0.6}px, ${headY * 0.6}px)`;
    }
    if (leftPupilRef.current && !isPasswordFocusedRef.current && !isSuccessRef.current) {
      leftPupilRef.current.style.transform = `translate(${eyeX}px, ${eyeY}px)`;
    }
    if (rightPupilRef.current && !isPasswordFocusedRef.current && !isSuccessRef.current) {
      rightPupilRef.current.style.transform = `translate(${eyeX}px, ${eyeY}px)`;
    }
  }, []);

  // Main animation loop
  useEffect(() => {
    const tick = () => {
      const { headX: tx, headY: ty, eyeX: ex, eyeY: ey } = target.current;
      const c = current.current;

      c.headX = lerp(c.headX, tx, LERP);
      c.headY = lerp(c.headY, ty, LERP);
      c.eyeX  = lerp(c.eyeX,  ex, LERP);
      c.eyeY  = lerp(c.eyeY,  ey, LERP);

      applyTransforms();
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [applyTransforms]);

  // Mouse tracking — only writes to target ref, does NOT call setState
  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      if (isPasswordFocusedRef.current) {
        target.current = { headX: 0, headY: 12, eyeX: 0, eyeY: 5 };
        return;
      }
      if (isSuccessRef.current) {
        target.current = { headX: 0, headY: -8, eyeX: 0, eyeY: 0 };
        return;
      }

      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return;

      const maxHead = 18;
      const maxEye  = 9;
      const factor  = Math.min(dist / 280, 1);
      const norm    = { x: dx / dist, y: dy / dist };

      target.current = {
        headX: norm.x * maxHead * factor,
        headY: norm.y * maxHead * factor,
        eyeX:  norm.x * maxEye  * factor,
        eyeY:  norm.y * maxEye  * factor,
      };
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMouseMove);
  }, []); // no deps — reads from refs

  // When props change, snap target to the right override position
  useEffect(() => {
    if (isPasswordFocused) {
      target.current = { headX: 0, headY: 12, eyeX: 0, eyeY: 5 };
    } else if (isSuccess) {
      target.current = { headX: 0, headY: -8, eyeX: 0, eyeY: 0 };
    }
  }, [isPasswordFocused, isSuccess]);

  return (
    <div ref={containerRef} className="relative flex flex-col items-center justify-center h-52 w-full select-none">
      {/* Speech bubble */}
      <div className={`absolute top-3 bg-slate-900 border border-slate-800 text-sky-400 text-[10px] font-bold tracking-wide uppercase px-3 py-1.5 rounded-xl shadow-lg flex items-center gap-1 transition-all duration-300 transform -translate-y-2 ${
        isSuccess ? 'bg-emerald-950 border-emerald-800 text-emerald-400 scale-105' : ''
      }`}>
        <span className="relative z-10">{getSpeechText()}</span>
        <div className={`absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-slate-900 border-r border-b border-slate-800 rotate-45 ${
          isSuccess ? 'bg-emerald-950 border-emerald-800' : ''
        }`} />
      </div>

      {/* Robot SVG */}
      <svg width="150" height="150" viewBox="0 0 160 160" className="overflow-visible mt-4">
        <defs>
          <linearGradient id="botGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" style={{ stopColor: 'hsl(var(--primary-h, 160) var(--primary-s, 84%) var(--primary-l, 39%))' }} />
            <stop offset="100%" style={{ stopColor: 'hsl(calc(var(--primary-h, 160) + 40) var(--primary-s, 84%) calc(var(--primary-l, 39%) + 10%))' }} />
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Floating Shadow */}
        <ellipse cx="80" cy="150" rx="24" ry="4" fill="rgba(0, 0, 0, 0.25)" filter="url(#glow)" />

        {/* Left Arm (Waving) */}
        <path 
          d="M 44 112 C 28 102 18 84 22 76 C 26 68 40 76 50 88 C 52 90 54 94 53 98 Z" 
          fill="url(#botGrad)" 
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="0.8"
        />
        <path 
          d="M 44 112 C 34 105 28 92 30 86 C 31 82 38 88 44 96" 
          fill="none" 
          stroke="white" 
          strokeWidth="1.5" 
          opacity="0.3" 
          strokeLinecap="round"
        />

        {/* Right Arm */}
        <path 
          d="M 116 112 C 122 108 128 102 126 96 C 124 90 114 98 110 106 Z" 
          fill="url(#botGrad)"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth="0.8"
        />

        {/* Neck */}
        <rect x="72" y="88" width="16" height="10" rx="3" fill="url(#botGrad)" opacity="0.9" />

        {/* Body */}
        <path 
          d="M 52 100 C 52 86 108 86 108 100 C 108 124 96 144 80 144 C 64 144 52 124 52 100 Z" 
          fill="url(#botGrad)"
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1.2"
        />
        <path 
          d="M 98 102 C 104 112 104 124 98 134 C 95 124 91 112 95 104" 
          fill="none" 
          stroke="white" 
          strokeWidth="2" 
          opacity="0.25" 
          strokeLinecap="round"
        />
        <circle cx="80" cy="116" r="3" fill="white" opacity="0.6" filter="url(#glow)" />

        {/* Head Group — moves with cursor */}
        <g
          ref={headGroupRef}
          style={{ transformOrigin: '80px 80px', willChange: 'transform' }}
        >
          {/* Ear Bolts */}
          <rect x="26" y="52" width="6" height="16" fill="url(#botGrad)" rx="2" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
          <rect x="128" y="52" width="6" height="16" fill="url(#botGrad)" rx="2" stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />

          {/* Head Shape */}
          <rect x="30" y="24" width="100" height="66" rx="28" fill="url(#botGrad)" stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" />
          
          {/* Highlights */}
          <ellipse cx="110" cy="38" rx="6" ry="3" transform="rotate(30, 110, 38)" fill="white" opacity="0.5" />
          <path d="M 40 40 C 60 32 100 32 120 40" fill="none" stroke="white" strokeWidth="1.5" opacity="0.2" />

          {/* Screen Faceplate */}
          <rect x="42" y="38" width="76" height="42" fill="#040c1a" rx="18" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

          {/* Eyes & Mouth */}
          {isPasswordFocused ? (
            <>
              {/* Closed Eyes */}
              <path d="M 50 60 Q 58 68 66 60" stroke="#38bdf8" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#glow)" />
              <path d="M 94 60 Q 102 68 110 60" stroke="#38bdf8" strokeWidth="3" fill="none" strokeLinecap="round" filter="url(#glow)" />
              {/* Smile */}
              <path d="M 74 70 Q 80 73 86 70" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
            </>
          ) : isSuccess ? (
            <>
              {/* Happy eyes */}
              <path d="M 50 62 Q 58 52 66 62" stroke="#10b981" strokeWidth="3.5" fill="none" strokeLinecap="round" filter="url(#glow)" />
              <path d="M 94 62 Q 102 52 110 62" stroke="#10b981" strokeWidth="3.5" fill="none" strokeLinecap="round" filter="url(#glow)" />
              {/* Happy open smile */}
              <path d="M 72 68 Q 80 78 88 68 Z" fill="white" />
            </>
          ) : (
            <>
              {/* Eye Sockets */}
              <circle cx="58" cy="58" r="10" fill="#01050e" />
              {/* Left Pupil Group */}
              <g ref={leftPupilRef} style={{ willChange: 'transform' }}>
                <circle cx="58" cy="58" r="8" fill="#040e22" />
                <circle cx="58" cy="58" r="6" style={{ fill: 'hsl(var(--primary-h, 160) var(--primary-s, 84%) var(--primary-l, 39%))' }} filter="url(#glow)" opacity="0.85" />
                <circle cx="56" cy="55.5" r="2.2" fill="white" />
                <circle cx="60" cy="60.5" r="0.9" fill="white" />
              </g>

              {/* Right Eye Sockets */}
              <circle cx="102" cy="58" r="10" fill="#01050e" />
              {/* Right Pupil Group */}
              <g ref={rightPupilRef} style={{ willChange: 'transform' }}>
                <circle cx="102" cy="58" r="8" fill="#040e22" />
                <circle cx="102" cy="58" r="6" style={{ fill: 'hsl(var(--primary-h, 160) var(--primary-s, 84%) var(--primary-l, 39%))' }} filter="url(#glow)" opacity="0.85" />
                <circle cx="100" cy="55.5" r="2.2" fill="white" />
                <circle cx="104" cy="60.5" r="0.9" fill="white" />
              </g>

              {/* Mouth */}
              {isLoading ? (
                <circle cx="80" cy="70" r="3" fill="none" style={{ stroke: 'hsl(var(--primary-h, 160) var(--primary-s, 84%) var(--primary-l, 39%))' }} strokeWidth="2" filter="url(#glow)" className="animate-ping" />
              ) : (
                <path d="M 72 70 Q 80 77 88 70 Z" fill="white" />
              )}
            </>
          )}
        </g>

        {/* Antenna Group */}
        <g
          ref={antennaGroupRef}
          style={{ transformOrigin: '80px 24px', willChange: 'transform' }}
        >
          <rect x="78.5" y="10" width="3" height="15" fill="url(#botGrad)" rx="1.5" />
          <circle
            cx="80"
            cy="8"
            r="5"
            style={{ fill: 'hsl(var(--primary-h, 160) var(--primary-s, 84%) var(--primary-l, 39%))' }}
            filter="url(#glow)"
            className={isLoading ? "animate-pulse" : ""}
          />
          <rect x="72" y="22" width="16" height="4" rx="1.5" fill="url(#botGrad)" />
        </g>
      </svg>
    </div>
  );
};

export default RobotAvatar;
