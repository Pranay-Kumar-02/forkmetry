import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  GitFork,
  ListTree,
  Plus,
  Clock,
  Server,
  CalendarClock,
  Scale,
  BookOpen,
  Cpu,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { OSProvider, useOS, COLOR } from './context/OSContext';
import { OverviewDashboard } from './components/OverviewDashboard';
import { ForkTree } from './components/ForkTree';
import { ProcessManager } from './components/ProcessManager';
import { CpuSchedulingLab } from './components/CpuSchedulingLab';
import { SchedulingComparator } from './components/SchedulingComparator';
import { LearnSystemCalls } from './components/LearnSystemCalls';
import { Inspector } from './components/Inspector';
import { CreateModal } from './components/CreateModal';
import { ForkmetryLogo, Eyebrow, SimulationDisclaimerBadge } from './components/Common';

const PAGES = [
  {
    path: '/dashboard',
    label: 'Overview Telemetry',
    sub: 'Kernel state & active core',
    icon: LayoutDashboard,
  },
  {
    path: '/fork-tree',
    label: 'Fork Tree Lineage',
    sub: '2D & 3D process hierarchy',
    icon: GitFork,
  },
  {
    path: '/processes',
    label: 'Process Manager',
    sub: 'PCB table & 5-state engine',
    icon: ListTree,
  },
  {
    path: '/scheduling-lab',
    label: 'Scheduling Lab & Gantt',
    sub: 'Timeline & decision explainer',
    icon: CalendarClock,
  },
  {
    path: '/comparator',
    label: 'Algorithm Comparator',
    sub: 'Head-to-head OS benchmark',
    icon: Scale,
  },
  {
    path: '/system-calls',
    label: 'POSIX & Syscall Manual',
    sub: 'Low-level OS architecture guide',
    icon: BookOpen,
  },
];

function MainShell() {
  const { procs, tick, backendOnline, algorithm, quantum } = useOS();
  const [path, setPath] = useState<string>(() =>
    PAGES.some((p) => p.path === window.location.pathname) ? window.location.pathname : '/dashboard'
  );
  const [inspect, setInspect] = useState<number | null>(null);
  const [creating, setCreating] = useState<boolean>(false);

  const go = (p: string) => {
    window.history.pushState(null, '', p);
    setPath(p);
  };

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const active = procs.filter((p) => p.state !== 'TERMINATED').length;
  const page = PAGES.find((p) => p.path === path) || PAGES[0];
  const clock = `${String(Math.floor(tick / 3600)).padStart(2, '0')}:${String(
    Math.floor(tick / 60) % 60
  ).padStart(2, '0')}:${String(tick % 60).padStart(2, '0')}`;

  return (
    <>
      {/* Ambient Cyber Telemetry Backdrop */}
      <div className="forkmetry-ambient" />
      <div className="grid-telemetry" />

      <div className="relative z-10 flex min-h-screen p-3 sm:p-4 gap-4">
        {/* Navigation Sidebar */}
        <aside className="fork-card w-64 shrink-0 p-4 sticky top-4 h-[calc(100vh-32px)] flex flex-col justify-between overflow-y-auto">
          <div className="space-y-6">
            {/* Logo */}
            <div className="pb-4 border-b border-slate-800/80">
              <ForkmetryLogo />
            </div>

            {/* Navigation links */}
            <div>
              <Eyebrow className="px-2 mb-2">Workspace Navigation</Eyebrow>
              <nav className="space-y-1">
                {PAGES.map(({ path: p, label, sub, icon: Icon }) => {
                  const isActive = path === p;
                  return (
                    <button
                      key={p}
                      onClick={() => go(p)}
                      className={`nav-link ${isActive ? 'active' : ''}`}
                    >
                      <Icon
                        size={17}
                        className={isActive ? 'text-cyan-400' : 'text-slate-400'}
                      />
                      <div className="truncate">
                        <div className="text-xs font-semibold">{label}</div>
                        <div className="text-[10px] text-slate-500 font-mono truncate">{sub}</div>
                      </div>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Sidebar Footer Cards */}
          <div className="space-y-3 pt-4 border-t border-slate-800/80">
            {/* Backend status */}
            <div className="p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-semibold uppercase text-slate-400">
                  Django REST API
                </span>
                <span
                  className={`w-2 h-2 rounded-full ${
                    backendOnline ? 'bg-emerald-400' : 'bg-amber-400'
                  }`}
                />
              </div>
              <div className="font-mono text-[11px] text-slate-200 mt-1">
                {backendOnline ? '127.0.0.1:8000 (Connected)' : 'Local Fallback Engine'}
              </div>
            </div>

            {/* Active Policy Widget */}
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-800 text-xs">
              <div className="text-[10px] font-mono font-semibold uppercase text-cyan-400 flex items-center justify-between">
                <span>Active Scheduler</span>
                <Cpu size={12} />
              </div>
              <div className="font-semibold text-white mt-1 text-xs">
                {algorithm === 'ROUND_ROBIN'
                  ? `Round Robin (q=${quantum})`
                  : algorithm === 'PRIORITY'
                  ? 'Preemptive Priority'
                  : algorithm === 'SJF'
                  ? 'Shortest Job First'
                  : 'First-Come First-Served'}
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                Core 0 · Single Hardware Thread
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 space-y-4">
          {/* Top Bar */}
          <header className="fork-card sticky top-4 z-30 p-3.5 px-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-semibold text-slate-400 uppercase tracking-wider">
                  {page.sub}
                </span>
                <SimulationDisclaimerBadge compact />
              </div>
              <h1 className="text-xl font-display font-bold text-white tracking-tight">
                {page.label}
              </h1>
            </div>

            <div className="flex items-center gap-3">
              {/* Live tick clock */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
                <Clock size={13} className="text-cyan-400" />
                <span>{clock}</span>
                <span className="text-slate-500">·</span>
                <span className="text-cyan-400 font-bold">t{tick}</span>
              </div>

              {/* Active processes badge */}
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 font-mono text-xs text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>{active} active</span>
              </div>

              {/* Spawn Process trigger */}
              <button
                onClick={() => setCreating(true)}
                className="btn-fork btn-fork-primary text-xs"
              >
                <Plus size={14} />
                <span>Spawn Task</span>
              </button>
            </div>
          </header>

          {/* Dynamic Page Component */}
          <div>
            {path === '/dashboard' && <OverviewDashboard />}
            {path === '/fork-tree' && <ForkTree onInspect={setInspect} inspecting={inspect} />}
            {path === '/processes' && (
              <ProcessManager onInspect={setInspect} openCreate={() => setCreating(true)} />
            )}
            {path === '/scheduling-lab' && <CpuSchedulingLab />}
            {path === '/comparator' && <SchedulingComparator />}
            {path === '/system-calls' && <LearnSystemCalls />}
          </div>
        </main>
      </div>

      {/* PCB Inspector Drawer */}
      {inspect !== null && <Inspector pid={inspect} onClose={() => setInspect(null)} />}

      {/* Spawn Process Modal */}
      {creating && <CreateModal onClose={() => setCreating(false)} />}
    </>
  );
}

export default function App() {
  return (
    <OSProvider>
      <MainShell />
    </OSProvider>
  );
}
