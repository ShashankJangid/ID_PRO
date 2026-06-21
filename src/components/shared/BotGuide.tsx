import React, { useEffect, useRef, useCallback, useState } from 'react';

interface BotGuideProps {
  hasSetup: boolean;
  hasTemplate: boolean;
  hasData: boolean;
}

const LERP = 0.065;
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

interface StepTip {
  message: string;
  sub: string;
  emoji: string;
  color: string;
  bgColor: string;
}

const STEP_TIPS: Record<number, StepTip> = {
  0: {
    message: "Set up your Organization first!",
    sub: "Add your company name, logo & branding",
    emoji: "🏢",
    color: "#c084fc",
    bgColor: "rgba(168,85,247,0.1)",
  },
  1: {
    message: "Choose an ID Card Template",
    sub: "Pick from built-in designs or create custom",
    emoji: "🎨",
    color: "#60a5fa",
    bgColor: "rgba(96,165,250,0.1)",
  },
  2: {
    message: "Import your Card Data",
    sub: "Upload Excel/CSV or enter data manually",
    emoji: "📊",
    color: "#fb923c",
    bgColor: "rgba(251,146,60,0.1)",
  },
  3: {
    message: "All set! Just Export",
    sub: "Go to Preview & Export to save your ID cards!",
    emoji: "🚀",
    color: "#34d399",
    bgColor: "rgba(52,211,153,0.1)",
  },
};

const getStepIndex = (hasSetup: boolean, hasTemplate: boolean, hasData: boolean): number => {
  if (!hasSetup) return 0;
  if (!hasTemplate) return 1;
  if (!hasData) return 2;
  return 3;
};

export const BotGuide: React.FC<BotGuideProps> = ({ hasSetup, hasTemplate, hasData }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const leftPupilRef = useRef<SVGGElement>(null);
  const rightPupilRef = useRef<SVGGElement>(null);
  const headRef = useRef<SVGGElement>(null);
  const rafRef = useRef<number>(0);
  const target = useRef({ eyeX: 0, eyeY: 0, headX: 0, headY: 0 });
  const current = useRef({ eyeX: 0, eyeY: 0, headX: 0, headY: 0 });

  const [showTip, setShowTip] = useState(false);
  const [isBlinking, setIsBlinking] = useState(false);
  const [antennaColor, setAntennaColor] = useState('#10b981');
  const [prevStep, setPrevStep] = useState<number | null>(null);
  const [bouncing, setBouncing] = useState(false);

  const stepIndex = getStepIndex(hasSetup, hasTemplate, hasData);
  const tip = STEP_TIPS[stepIndex];

  // Random blink
  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const scheduleBlink = () => {
      timeout = setTimeout(() => {
        setIsBlinking(true);
        setTimeout(() => {
          setIsBlinking(false);
          scheduleBlink();
        }, 110);
      }, 2800 + Math.random() * 2200);
    };
    scheduleBlink();
    return () => clearTimeout(timeout);
  }, []);

  // Antenna and bounce on step change
  useEffect(() => {
    if (prevStep !== null && prevStep !== stepIndex) {
      // Flash yellow then settle to tip color
      setAntennaColor('#facc15');
      setBouncing(true);
      setTimeout(() => setAntennaColor(tip.color), 900);
      setTimeout(() => setBouncing(false), 600);
    } else if (prevStep === null) {
      setAntennaColor(tip.color);
    }
    setPrevStep(stepIndex);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIndex]);

  const applyTransforms = useCallback(() => {
    const { eyeX, eyeY, headX, headY } = current.current;

    // Move pupils inside eye sockets
    if (leftPupilRef.current) {
      leftPupilRef.current.style.transform = `translate(${eyeX * 1.4}px, ${eyeY * 1.4}px)`;
    }
    if (rightPupilRef.current) {
      rightPupilRef.current.style.transform = `translate(${eyeX * 1.4}px, ${eyeY * 1.4}px)`;
    }
    // Tilt head
    if (headRef.current) {
      headRef.current.style.transform = `translate(${headX * 0.8}px, ${headY * 0.7}px) rotate(${headX * 0.7}deg)`;
    }
  }, []);

  // RAF animation loop
  useEffect(() => {
    const tick = () => {
      const c = current.current;
      const t = target.current;
      c.eyeX = lerp(c.eyeX, t.eyeX, LERP);
      c.eyeY = lerp(c.eyeY, t.eyeY, LERP);
      c.headX = lerp(c.headX, t.headX, LERP);
      c.headY = lerp(c.headY, t.headY, LERP);
      applyTransforms();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [applyTransforms]);

  // Cursor tracking
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = e.clientX - cx;
      const dy = e.clientY - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) return;
      const norm = { x: dx / dist, y: dy / dist };
      const factor = Math.min(dist / 280, 1);
      target.current = {
        eyeX: norm.x * 4.5 * factor,
        eyeY: norm.y * 4.5 * factor,
        headX: norm.x * 6 * factor,
        headY: norm.y * 5 * factor,
      };
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => window.removeEventListener('mousemove', onMove);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative flex items-center gap-2 cursor-pointer select-none group"
      onMouseEnter={() => setShowTip(true)}
      onMouseLeave={() => setShowTip(false)}
      aria-label="AI Guide Bot — hover for tips"
    >
      {/* Circular Glassmorphism Container with contrast borders and padding */}
      <div
        className="relative flex items-center justify-center rounded-full border border-white/30 bg-white/20 dark:bg-white/10 shadow-[0_8px_32px_0_rgba(0,0,0,0.1)] backdrop-blur-md transition-all duration-300 hover:scale-105"
        style={{
          width: 60,
          height: 60,
          padding: '6px',
          animation: bouncing ? 'botBounce 0.55s cubic-bezier(0.36,0.07,0.19,0.97)' : undefined,
        }}
      >
        <svg
          viewBox="0 0 160 160"
          width="44"
          height="44"
          style={{
            overflow: 'visible',
            filter: `drop-shadow(0 0 8px ${tip.color}66)`,
            transition: 'filter 0.5s ease',
          }}
        >
          <defs>
            <linearGradient id="botGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: 'hsl(var(--primary-h, 160) var(--primary-s, 84%) var(--primary-l, 39%))' }} />
              <stop offset="100%" style={{ stopColor: 'hsl(calc(var(--primary-h, 160) + 40) var(--primary-s, 84%) calc(var(--primary-l, 39%) + 10%))' }} />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Shadow */}
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
            ref={headRef}
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
            <g style={{ transform: isBlinking ? 'scaleY(0.08)' : 'none', transformOrigin: '58px 58px', transition: 'transform 0.06s' }}>
              <circle cx="58" cy="58" r="10" fill="#01050e" />
              <g ref={leftPupilRef} style={{ willChange: 'transform' }}>
                <circle cx="58" cy="58" r="8" fill="#040e22" />
                <circle cx="58" cy="58" r="6" fill={tip.color} filter="url(#glow)" opacity="0.85" style={{ transition: 'fill 0.5s' }} />
                <circle cx="56" cy="55.5" r="2.2" fill="white" />
                <circle cx="60" cy="60.5" r="0.9" fill="white" />
              </g>
            </g>

            <g style={{ transform: isBlinking ? 'scaleY(0.08)' : 'none', transformOrigin: '102px 58px', transition: 'transform 0.06s' }}>
              <circle cx="102" cy="58" r="10" fill="#01050e" />
              <g ref={rightPupilRef} style={{ willChange: 'transform' }}>
                <circle cx="102" cy="58" r="8" fill="#040e22" />
                <circle cx="102" cy="58" r="6" fill={tip.color} filter="url(#glow)" opacity="0.85" style={{ transition: 'fill 0.5s' }} />
                <circle cx="100" cy="55.5" r="2.2" fill="white" />
                <circle cx="104" cy="60.5" r="0.9" fill="white" />
              </g>
            </g>

            {/* Mouth */}
            {stepIndex === 3 ? (
              <path d="M 72 68 Q 80 78 88 68 Z" fill="white" />
            ) : (
              <path d="M 72 70 Q 80 77 88 70 Z" fill="white" />
            )}
          </g>

          {/* Antenna Group */}
          <g
            style={{ transformOrigin: '80px 24px' }}
          >
            <rect x="78.5" y="10" width="3" height="15" fill="url(#botGrad)" rx="1.5" />
            <circle
              cx="80"
              cy="8"
              r="5"
              fill={antennaColor}
              filter="url(#glow)"
              style={{ transition: 'fill 0.7s ease' }}
            />
            <rect x="72" y="22" width="16" height="4" rx="1.5" fill="url(#botGrad)" />
          </g>
        </svg>

        {/* Pulse ring */}
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: 0,
            border: `2px solid ${tip.color}`,
            borderRadius: '50%',
            animation: 'bgBotPulse 2.8s ease-in-out infinite',
            opacity: 0.35,
            transition: 'border-color 0.5s ease',
          }}
        />
      </div>

      {/* AI badge */}
      <div
        className="flex flex-col items-start gap-0.5"
      >
        <span
          className="text-[8px] font-black tracking-[0.15em] px-1.5 py-0.5 rounded-md"
          style={{
            background: tip.bgColor,
            color: tip.color,
            border: `1px solid ${tip.color}44`,
            transition: 'all 0.5s ease',
          }}
        >
          AI GUIDE
        </span>
        <span className="text-[9px] text-white/40 font-medium hidden md:block">
          hover for tips
        </span>
      </div>

      {/* Tooltip */}
      {showTip && (
        <div
          className="absolute z-[9999] pointer-events-none"
          style={{
            bottom: 'calc(100% + 12px)',
            left: '50%',
            transform: 'translateX(-50%)',
            animation: 'bgBotTipIn 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards',
            minWidth: 220,
          }}
        >
          {/* Tooltip card */}
          <div
            className="rounded-2xl shadow-2xl px-4 py-3 text-center"
            style={{
              background: 'rgba(3, 8, 20, 0.95)',
              border: `1.5px solid ${tip.color}44`,
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px ${tip.color}22, inset 0 1px 0 rgba(255,255,255,0.05)`,
            }}
          >
            {/* Emoji */}
            <div className="text-2xl mb-1.5" style={{ lineHeight: 1 }}>{tip.emoji}</div>
            {/* Main message */}
            <p
              className="text-xs font-bold mb-0.5"
              style={{ color: tip.color }}
            >
              {tip.message}
            </p>
            {/* Sub message */}
            <p className="text-[10px] text-white/40 leading-relaxed">
              {tip.sub}
            </p>
            {/* Step indicator dots */}
            <div className="flex items-center justify-center gap-1 mt-2">
              {[0, 1, 2, 3].map((s) => (
                <div
                  key={s}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: s === stepIndex ? 12 : 5,
                    height: 5,
                    background: s === stepIndex ? tip.color : 'rgba(255,255,255,0.15)',
                  }}
                />
              ))}
            </div>
          </div>
          {/* Arrow */}
          <div
            className="mx-auto"
            style={{
              width: 10,
              height: 10,
              background: 'rgba(3,8,20,0.95)',
              border: `1.5px solid ${tip.color}44`,
              borderTop: 'none',
              borderLeft: 'none',
              transform: 'rotate(45deg)',
              marginTop: -6,
              marginLeft: 'calc(50% - 5px)',
            }}
          />
        </div>
      )}

      <style>{`
        @keyframes bgBotPulse {
          0%, 100% { transform: scale(1); opacity: 0.35; }
          50% { transform: scale(1.22); opacity: 0.1; }
        }
        @keyframes bgBotTipIn {
          0% { opacity: 0; transform: translateX(-50%) scale(0.88) translateY(10px); }
          100% { opacity: 1; transform: translateX(-50%) scale(1) translateY(0); }
        }
        @keyframes botBounce {
          0%,100% { transform: translateY(0); }
          20% { transform: translateY(-8px); }
          40% { transform: translateY(-3px); }
          60% { transform: translateY(-6px); }
          80% { transform: translateY(-1px); }
        }
      `}</style>
    </div>
  );
};

export default BotGuide;
