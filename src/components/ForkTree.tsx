import React, { useMemo, useRef, useState, Component, ErrorInfo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, Float, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import {
  GitFork,
  ZoomIn,
  ZoomOut,
  Crosshair,
  RotateCw,
  Box,
  Network,
  Info,
  Search,
  Plus,
  Skull,
  Eye,
  Activity,
  Maximize2,
} from 'lucide-react';
import { useOS, ProcessState, STATES, COLOR, LABEL } from '../context/OSContext';
import { Process } from '../services/api';
import { Glass, StateChip, Eyebrow, SimulationDisclaimerBadge } from './Common';

/* ============================ Tree layout ============================ */
interface PosMap {
  [pid: number]: { x: number; depth: number };
}

function layoutTree(procs: Process[]): { pos: PosMap; leaves: number } {
  const by = Object.fromEntries(procs.map((p) => [p.pid, p]));
  const pos: PosMap = {};
  let leaf = 0;

  const walk = (pid: number, depth: number): number => {
    const proc = by[pid];
    if (!proc) return 0;
    const kids = (proc.childrenPids || []).filter((c) => by[c]);
    if (!kids.length) {
      pos[pid] = { x: leaf++, depth };
      return pos[pid].x;
    }
    const xs = kids.map((k) => walk(k, depth + 1));
    pos[pid] = { x: (xs[0] + xs[xs.length - 1]) / 2, depth };
    return pos[pid].x;
  };

  procs.filter((p) => !by[p.ppid] || p.ppid === 0).forEach((r) => walk(r.pid, 0));
  return { pos, leaves: Math.max(1, leaf) };
}

/* ============================== 3D Tree ============================== */
function Node3D({
  p,
  position,
  selected,
  onSelect,
  onFork,
  onCycle,
  onKill,
}: {
  p: Process;
  position: [number, number, number];
  selected: boolean;
  onSelect: (pid: number) => void;
  onFork: (pid: number) => void;
  onCycle: (p: Process) => void;
  onKill: (pid: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hover, setHover] = useState(false);
  const c = COLOR[p.state] || '#38bdf8';
  const r = 0.35 + Math.min(64, p.memoryMb) / 360;

  useFrame((_, d) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y += d * (p.state === 'RUNNING' ? 1.6 : 0.35);
    const target = hover || selected ? 1.2 : 1;
    meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 1 - Math.exp(-10 * d));
  });

  return (
    <group position={position}>
      <Float speed={p.state === 'TERMINATED' ? 0 : 1.6} floatIntensity={0.35} rotationIntensity={0}>
        <mesh
          ref={meshRef}
          castShadow
          onClick={(e) => {
            e.stopPropagation();
            onSelect(p.pid);
          }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHover(true);
            document.body.style.cursor = 'pointer';
          }}
          onPointerOut={() => {
            setHover(false);
            document.body.style.cursor = '';
          }}
        >
          <icosahedronGeometry args={[r, 1]} />
          <meshPhysicalMaterial
            color={c}
            transmission={0.4}
            thickness={0.8}
            roughness={0.15}
            metalness={0.1}
            clearcoat={1}
            emissive={c}
            emissiveIntensity={p.state === 'RUNNING' ? 0.75 : 0.25}
          />
        </mesh>

        {/* Orbit ring for running process */}
        {p.state === 'RUNNING' && (
          <mesh rotation={[Math.PI / 2.5, 0, 0]}>
            <ringGeometry args={[r * 1.5, r * 1.65, 32]} />
            <meshBasicMaterial color="#38bdf8" side={THREE.DoubleSide} transparent opacity={0.65} />
          </mesh>
        )}

        {/* HTML 3D Node Tooltip Card */}
        <Html
          position={[0, r + 0.3, 0]}
          center
          distanceFactor={11}
          style={{
            pointerEvents: 'auto',
            transition: 'opacity 0.2s',
            opacity: hover || selected ? 1 : 0.85,
          }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onSelect(p.pid);
            }}
            className="p-2.5 rounded-xl bg-slate-950/90 border border-slate-700/80 shadow-2xl backdrop-blur-md text-white select-none whitespace-nowrap cursor-pointer transition hover:border-cyan-400"
            style={{
              boxShadow: selected ? `0 0 15px ${COLOR[p.state]}` : '0 10px 25px rgba(0,0,0,0.6)',
            }}
          >
            <div className="flex items-center justify-between gap-3 text-xs">
              <span className="font-mono font-bold text-white">PID {p.pid}</span>
              <StateChip state={p.state} />
            </div>
            <div className="text-[11px] font-semibold text-slate-300 mt-0.5 truncate max-w-[120px]">
              {p.name}
            </div>
            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
              {p.memoryMb}MB · Prio {p.priority}
            </div>

            <div className="flex gap-1.5 mt-2" onClick={(e) => e.stopPropagation()}>
              <button
                disabled={p.state === 'TERMINATED'}
                onClick={() => onFork(p.pid)}
                className="px-2 py-0.5 text-[9px] font-mono font-semibold rounded bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition disabled:opacity-30"
              >
                Fork
              </button>
              <button
                disabled={p.state === 'TERMINATED'}
                onClick={() => onCycle(p)}
                className="px-2 py-0.5 text-[9px] font-mono font-semibold rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 transition disabled:opacity-30"
              >
                State
              </button>
              {p.pid !== 1 && p.state !== 'TERMINATED' && (
                <button
                  onClick={() => onKill(p.pid)}
                  className="px-2 py-0.5 text-[9px] font-mono font-semibold rounded bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 transition"
                >
                  Kill
                </button>
              )}
            </div>
          </div>
        </Html>
      </Float>
    </group>
  );
}

function Tree3DCanvas({
  selected,
  onSelect,
  autoRotate,
  resetKey,
}: {
  selected: number | null;
  onSelect: (pid: number) => void;
  autoRotate: boolean;
  resetKey: number;
}) {
  const { procs, fork, setState, kill } = useOS();
  const { pos, leaves } = useMemo(() => layoutTree(procs), [procs]);

  const maxD = Math.max(1, ...Object.values(pos).map((p) => p.depth));
  const X_SPACING = 2.4;
  const Y_SPACING = 2.0;

  const at = (pid: number): [number, number, number] | null => {
    const q = pos[pid];
    if (!q) return null;
    return [(q.x - (leaves - 1) / 2) * X_SPACING, (maxD / 2 - q.depth) * Y_SPACING, 0];
  };

  const cycle = (p: Process) => {
    const curIdx = STATES.indexOf(p.state);
    const next = STATES[(curIdx + 1) % 3];
    setState(p.pid, next as ProcessState);
  };

  return (
    <Canvas
      key={resetKey}
      shadows
      camera={{ position: [0, 0, 14], fov: 48 }}
      className="w-full h-full bg-[#080c14]"
    >
      <ambientLight intensity={0.65} />
      <directionalLight position={[10, 15, 10]} intensity={1.2} castShadow />
      <pointLight position={[-10, -5, -5]} intensity={0.4} color="#38bdf8" />

      {procs.map((p) => {
        const pt = at(p.pid);
        return pt ? (
          <Node3D
            key={p.pid}
            p={p}
            position={pt}
            selected={selected === p.pid}
            onSelect={onSelect}
            onFork={fork}
            onCycle={cycle}
            onKill={kill}
          />
        ) : null;
      })}

      <ContactShadows position={[0, -4.5, 0]} opacity={0.3} scale={28} blur={2.5} far={10} />
      <OrbitControls
        makeDefault
        enableDamping
        autoRotate={autoRotate}
        autoRotateSpeed={0.6}
        minDistance={5}
        maxDistance={30}
        target={[0, 0, 0]}
      />
    </Canvas>
  );
}

class ThreeErrorBoundary extends Component<
  { children: React.ReactNode; fallback: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('Three.js ErrorBoundary caught error:', error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return this.props.fallback;
    }
    return this.props.children;
  }
}

/* ============================== 2D Tree ============================== */
function Tree2D({
  zoom,
  onSelect,
  selected,
  searchQuery,
}: {
  zoom: number;
  onSelect: (pid: number) => void;
  selected: number | null;
  searchQuery: string;
}) {
  const { procs, fork, setState, kill } = useOS();
  const { pos } = useMemo(() => layoutTree(procs), [procs]);
  const W = 220;
  const H = 125;
  const GX = 40;
  const GY = 80;

  const at = (pid: number) =>
    pos[pid] && { x: pos[pid].x * (W + GX), y: pos[pid].depth * (H + GY) };

  const xs = Object.values(pos).map((p) => p.x);
  const depths = Object.values(pos).map((p) => p.depth);
  const w = (xs.length ? Math.max(...xs) : 0) * (W + GX) + W + 80;
  const h = (depths.length ? Math.max(...depths) : 0) * (H + GY) + H + 80;

  return (
    <div className="w-full h-full overflow-auto">
      <div style={{ width: w * zoom + 100, height: h * zoom + 140, padding: '50px 40px' }}>
        <div
          style={{
            position: 'relative',
            width: w,
            height: h,
            transform: `scale(${zoom})`,
            transformOrigin: '0 0',
          }}
        >
          {/* SVG Connectors */}
          <svg width={w} height={h} className="absolute inset-0 pointer-events-none">
            <defs>
              <linearGradient id="connector-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.4" />
              </linearGradient>
            </defs>
            {procs.map((p) => {
              const a = at(p.ppid);
              const b = at(p.pid);
              if (!a || !b) return null;
              const x1 = a.x + W / 2;
              const y1 = a.y + H;
              const x2 = b.x + W / 2;
              const y2 = b.y;
              const m = (y1 + y2) / 2;
              const isDead = p.state === 'TERMINATED';

              return (
                <path
                  key={p.pid}
                  d={`M${x1},${y1} C${x1},${m} ${x2},${m} ${x2},${y2}`}
                  fill="none"
                  stroke={isDead ? '#f43f5e' : 'rgba(56, 189, 248, 0.45)'}
                  strokeWidth={isDead ? '1.5' : '2.2'}
                  strokeDasharray={isDead ? '5 5' : ''}
                />
              );
            })}
          </svg>

          {/* Process Node Cards */}
          {procs.map((p) => {
            const q = at(p.pid);
            if (!q) return null;
            const isSelected = selected === p.pid;
            const isTerminated = p.state === 'TERMINATED';
            const matchesSearch =
              searchQuery &&
              (p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                String(p.pid) === searchQuery);

            return (
              <div
                key={p.pid}
                onClick={() => onSelect(p.pid)}
                style={{
                  position: 'absolute',
                  left: q.x,
                  top: q.y,
                  width: W,
                  height: H,
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer select-none bg-slate-900/90 backdrop-blur-md ${
                  isSelected
                    ? 'border-cyan-400 ring-2 ring-cyan-400/40 shadow-lg shadow-cyan-500/20'
                    : matchesSearch
                    ? 'border-amber-400 ring-2 ring-amber-400/50 shadow-md'
                    : 'border-slate-800 hover:border-slate-700 shadow-md hover:-translate-y-0.5'
                } ${isTerminated ? 'opacity-50' : 'opacity-100'}`}
              >
                {/* Status indicator border strip */}
                <div
                  className="absolute left-0 top-3 bottom-3 w-1 rounded-r"
                  style={{ backgroundColor: COLOR[p.state] }}
                />

                <div className="flex items-center justify-between">
                  <span className="font-mono font-bold text-xs text-white">
                    PID {p.pid}
                  </span>
                  <span className="font-mono text-[10px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                    PPID {p.ppid}
                  </span>
                </div>

                <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
                  {p.name}
                </div>

                <div className="flex items-center gap-1.5 mt-1.5">
                  <StateChip state={p.state} />
                  <span className="text-[10px] font-mono text-slate-400">
                    {p.memoryMb}MB · P{p.priority}
                  </span>
                </div>

                {/* Inline Action Buttons */}
                <div
                  className="flex items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-800"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    disabled={isTerminated}
                    onClick={() => fork(p.pid)}
                    className="flex-1 py-1 rounded text-[10px] font-mono font-semibold bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 border border-cyan-500/30 transition disabled:opacity-30"
                    title="Fork child process"
                  >
                    Fork
                  </button>
                  <button
                    disabled={isTerminated}
                    onClick={() => {
                      const curIdx = STATES.indexOf(p.state);
                      const next = STATES[(curIdx + 1) % 3];
                      setState(p.pid, next as ProcessState);
                    }}
                    className="flex-1 py-1 rounded text-[10px] font-mono font-semibold bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 border border-amber-500/30 transition disabled:opacity-30"
                    title="Cycle process state"
                  >
                    State
                  </button>
                  {p.pid !== 1 && !isTerminated && (
                    <button
                      onClick={() => kill(p.pid)}
                      className="px-2 py-1 rounded text-[10px] font-mono font-semibold bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 border border-rose-500/30 transition"
                      title="Deliver SIGTERM"
                    >
                      Kill
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ============================ Main ForkTree ============================ */
export function ForkTree({
  onInspect,
  inspecting,
}: {
  onInspect: (pid: number) => void;
  inspecting: number | null;
}) {
  const { fork } = useOS();
  const [mode, setMode] = useState<'3d' | '2d'>('2d');
  const [zoom, setZoom] = useState<number>(0.95);
  const [spin, setSpin] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [resetKey, setResetKey] = useState<number>(0);

  return (
    <Glass className="relative w-full h-[calc(100vh-130px)] min-h-[580px] p-0 overflow-hidden flex flex-col">
      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-3 pointer-events-auto">
        {/* Left: Mode switcher & search */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 backdrop-blur-md">
          <div className="flex bg-slate-900 rounded-lg p-0.5">
            <button
              onClick={() => setMode('2d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                mode === '2d'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network size={14} />
              2D Hierarchy
            </button>
            <button
              onClick={() => setMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                mode === '3d'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Box size={14} />
              3D Crystal Lattice
            </button>
          </div>

          <div className="relative ml-2">
            <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find PID or name..."
              className="pl-8 pr-3 py-1 text-xs bg-slate-900 border border-slate-700/80 rounded-lg text-white font-mono focus:outline-none focus:border-cyan-400 w-36 sm:w-48"
            />
          </div>
        </div>

        {/* Right: Zoom & Fork Controls */}
        <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-xl border border-slate-800 backdrop-blur-md">
          {mode === '2d' ? (
            <>
              <button
                onClick={() => setZoom((z) => Math.max(0.4, Number((z - 0.1).toFixed(2))))}
                className="btn-fork p-1.5"
                title="Zoom Out"
              >
                <ZoomOut size={14} />
              </button>
              <span className="font-mono text-xs text-slate-300 w-12 text-center">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.1).toFixed(2))))}
                className="btn-fork p-1.5"
                title="Zoom In"
              >
                <ZoomIn size={14} />
              </button>
              <button
                onClick={() => setZoom(0.95)}
                className="btn-fork text-xs"
                title="Fit / Reset Zoom"
              >
                <Maximize2 size={13} />
                Fit View
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setSpin((s) => !s)}
                className={`btn-fork text-xs ${spin ? 'border-cyan-400 text-cyan-300' : ''}`}
                title="Toggle Auto-Orbit"
              >
                <RotateCw size={13} className={spin ? 'animate-spin' : ''} />
                Auto-Orbit
              </button>
              <button
                onClick={() => setResetKey((k) => k + 1)}
                className="btn-fork text-xs"
                title="Reset Camera"
              >
                <Crosshair size={13} />
                Reset Camera
              </button>
            </>
          )}

          <button
            onClick={() => fork(1)}
            className="btn-fork btn-fork-primary text-xs"
            title="Fork child from PID 1 (systemd)"
          >
            <GitFork size={13} />
            Fork Root
          </button>
        </div>
      </div>

      {/* Bottom Floating Legend */}
      <div className="absolute bottom-4 left-4 z-20 flex items-center gap-3 bg-slate-950/85 px-3 py-1.5 rounded-full border border-slate-800 text-[11px] font-mono backdrop-blur-md">
        {STATES.map((s) => (
          <span key={s} className="flex items-center gap-1.5 text-slate-300">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR[s] }} />
            {LABEL[s]}
          </span>
        ))}
      </div>

      {/* Canvas View Container */}
      <div className="w-full h-full relative">
        {mode === '3d' ? (
          <ThreeErrorBoundary
            fallback={
              <div className="w-full h-full grid place-items-center text-slate-400">
                <div className="text-center">
                  <p className="text-sm">3D WebGL Canvas could not initialize.</p>
                  <button onClick={() => setMode('2d')} className="mt-3 btn-fork btn-fork-primary text-xs">
                    Switch to 2D Tree Canvas
                  </button>
                </div>
              </div>
            }
          >
            <Tree3DCanvas
              selected={inspecting}
              onSelect={onInspect}
              autoRotate={spin && inspecting == null}
              resetKey={resetKey}
            />
          </ThreeErrorBoundary>
        ) : (
          <Tree2D
            zoom={zoom}
            onSelect={onInspect}
            selected={inspecting}
            searchQuery={search}
          />
        )}
      </div>
    </Glass>
  );
}
