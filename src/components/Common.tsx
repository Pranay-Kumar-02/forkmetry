import React from 'react';
import { COLOR, tint } from '../context/OSContext';
import { ShieldAlert, Cpu } from 'lucide-react';

/* =======================================================================
   Forkmetry Bespoke Logo Component
   ======================================================================= */
export const ForkmetryLogo: React.FC<{ size?: number; showText?: boolean }> = ({
  size = 36,
  showText = true,
}) => (
  <div className="flex items-center gap-3 select-none">
    <div
      style={{ width: size, height: size }}
      className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 via-sky-600 to-indigo-600 shadow-lg shadow-cyan-500/20 border border-cyan-400/30 group"
    >
      <svg
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-3/4 h-3/4 text-white drop-shadow-sm transition-transform duration-300 group-hover:scale-105"
      >
        {/* Parent Node */}
        <circle cx="16" cy="6" r="3" fill="#38bdf8" />
        {/* Trunk */}
        <path d="M16 9V14" stroke="#e0f2fe" strokeWidth="2.2" strokeLinecap="round" />
        {/* Bifurcation Junction */}
        <circle cx="16" cy="14" r="2" fill="#f59e0b" />
        {/* Left Child Lineage */}
        <path d="M16 14L8 20V26" stroke="#34d399" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="8" cy="26" r="2.8" fill="#34d399" />
        {/* Right Child Lineage */}
        <path d="M16 14L24 20V26" stroke="#a78bfa" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="26" r="2.8" fill="#a78bfa" />
        {/* Telemetry pulse wave */}
        <path d="M12 21H20" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="1.5 2" />
      </svg>
      {/* Subtle indicator ring */}
      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping opacity-75" />
      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-cyan-400" />
    </div>

    {showText && (
      <div>
        <div className="flex items-center gap-1.5 font-display text-lg font-bold tracking-tight text-white">
          <span>Forkmetry</span>
          <span className="px-1.5 py-0.5 text-[9px] font-mono font-semibold tracking-wider text-cyan-300 bg-cyan-950/80 border border-cyan-800/60 rounded">
            v2.0
          </span>
        </div>
        <div className="font-mono text-[9px] font-medium text-slate-400 tracking-wider uppercase">
          OS Kernel &amp; Process Telemetry
        </div>
      </div>
    )}
  </div>
);

/* =======================================================================
   Card / Panel Containers
   ======================================================================= */
interface ForkCardProps extends React.HTMLAttributes<HTMLDivElement> {
  glow?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export const Glass: React.FC<ForkCardProps> = ({ glow, className = '', children, ...props }) => (
  <div
    {...props}
    className={`fork-card ${glow ? 'fork-card-glow' : ''} ${className}`}
  >
    {children}
  </div>
);

/* =======================================================================
   Process State Badge
   ======================================================================= */
export const StateChip: React.FC<{ state: string }> = ({ state }) => {
  const normalized = state.toUpperCase();
  const isRunning = normalized === 'RUNNING';

  return (
    <span className={`state-badge state-badge-${normalized}`}>
      <span
        className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'bg-cyan-400 animate-ping' : ''}`}
        style={{ backgroundColor: COLOR[normalized] || '#94a3b8' }}
      />
      {normalized}
    </span>
  );
};

/* =======================================================================
   Eyebrow Label
   ======================================================================= */
export const Eyebrow: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => (
  <div className={`font-mono text-[10px] font-semibold tracking-widest uppercase text-slate-400 ${className}`}>
    {children}
  </div>
);

/* =======================================================================
   Simulation vs Physical Disclaimer Pill
   ======================================================================= */
export const SimulationDisclaimerBadge: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-mono font-medium ${compact ? 'text-[9px]' : ''}`}>
    <ShieldAlert size={12} className="text-amber-400 shrink-0" />
    <span>Simulated OS Environment (Isolated Sandbox)</span>
  </div>
);

/* =======================================================================
   Radial Gauge (CPU Core / Memory)
   ======================================================================= */
export function Ring({
  value,
  color = '#0284c7',
  size = 110,
  stroke = 9,
  children,
}: {
  value: number;
  color?: string;
  size?: number;
  stroke?: number;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div style={{ position: 'relative', width: size, height: size }} className="inline-block select-none">
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <defs>
          <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={color} />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255, 255, 255, 0.07)"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={`url(#grad-${color.replace('#', '')})`}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped / 100)}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16, 1, 0.3, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">{children}</div>
    </div>
  );
}

/* =======================================================================
   SVG Telemetry Waveform Sparkline
   ======================================================================= */
export function Spark({ seedN, color = '#38bdf8' }: { seedN: number; color?: string }) {
  const pts = Array.from(
    { length: 24 },
    (_, i) => 20 + 15 * Math.sin(i * 0.7 + seedN) + 8 * Math.sin(i * 1.8 + seedN * 2)
  );
  const d = pts.map((y, i) => `${i ? 'L' : 'M'}${(i / 23) * 100},${48 - y}`).join(' ');
  const gradId = `spark-grad-${color.replace('#', '')}`;

  return (
    <svg viewBox="0 0 100 48" preserveAspectRatio="none" className="w-full h-10 select-none">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L100,48 L0,48 Z`} fill={`url(#${gradId})`} />
      <path d={d} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
