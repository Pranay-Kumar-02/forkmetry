import React from 'react';
import {
  Layers,
  GitFork,
  Cpu,
  MemoryStick,
  Terminal,
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sliders,
  Trash2,
  Server,
  Zap,
  Activity,
  CheckCircle2,
  Clock,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';
import { useOS, STATES, COLOR, LABEL } from '../context/OSContext';
import { Glass, StateChip, Eyebrow, Ring, Spark, SimulationDisclaimerBadge } from './Common';

export function OverviewDashboard() {
  const {
    procs,
    logs,
    tick,
    backendOnline,
    algorithm,
    quantum,
    isSimulating,
    step,
    toggleSimulate,
    setAlgorithm,
    setQuantum,
    reset,
    clearLogs,
  } = useOS();

  const alive = procs.filter((p) => p.state !== 'TERMINATED');
  const running =
    procs.find((p) => p.state === 'RUNNING' && p.pid !== 1) ||
    procs.find((p) => p.state === 'RUNNING');

  const counts = Object.fromEntries(
    STATES.map((s) => [s, procs.filter((p) => p.state === s).length])
  );
  const cpu = Math.min(100, alive.reduce((a, p) => a + p.cpuBurst, 0));
  const mem = alive.reduce((a, p) => a + p.memoryMb, 0);
  const load = Math.min(100, 36 + ((tick * 7) % 48));

  const kpis: [string, string | number, React.ElementType, string][] = [
    ['Total Tasks', procs.length, Layers, '#38bdf8'],
    ['Active Child Forks', alive.filter((p) => p.ppid !== 0).length, GitFork, '#10b981'],
    ['CPU Burst Allocated', `${cpu}%`, Cpu, '#f59e0b'],
    ['Virtual Memory In Use', `${mem} MB`, MemoryStick, '#a78bfa'],
  ];

  const queue = (s: string) =>
    procs
      .filter((p) => p.state === s)
      .sort((a, b) => b.priority - a.priority);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Simulation Quick Actions Control Bar */}
      <Glass className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* Simulation Controls */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={toggleSimulate}
              className={`btn-fork ${isSimulating ? 'btn-fork-danger' : 'btn-fork-primary'}`}
            >
              {isSimulating ? <Pause size={14} /> : <Play size={14} />}
              {isSimulating ? 'Pause Kernel Clock' : 'Start Auto-Scheduler'}
            </button>

            <button
              onClick={step}
              className="btn-fork"
              title="Advance single tick"
            >
              <SkipForward size={14} />
              Step Tick
            </button>

            <button
              onClick={reset}
              className="btn-fork text-slate-300"
              title="Reset kernel to init"
            >
              <RotateCcw size={14} />
              Reset State
            </button>
          </div>

          {/* Policy & Status */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Sliders size={13} className="text-cyan-400" />
              <span className="text-xs text-slate-400 font-medium">Policy:</span>
              <select
                value={algorithm}
                onChange={(e) => setAlgorithm(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-xs font-mono rounded-lg px-2.5 py-1 text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="ROUND_ROBIN">Round Robin</option>
                <option value="PRIORITY">Preemptive Priority</option>
                <option value="FCFS">First-Come First-Served</option>
                <option value="SJF">Shortest Job First</option>
              </select>
            </div>

            {algorithm === 'ROUND_ROBIN' && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-slate-400">Quantum:</span>
                <input
                  type="range"
                  min={1}
                  max={8}
                  value={quantum}
                  onChange={(e) => setQuantum(Number(e.target.value))}
                  className="w-18 accent-cyan-400 cursor-pointer"
                />
                <span className="font-mono text-xs font-bold text-cyan-300 px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded">
                  {quantum}t
                </span>
              </div>
            )}

            <div
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border ${
                backendOnline
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
              }`}
            >
              <Server size={12} />
              {backendOnline ? 'Django REST Engine: Online' : 'Local Sandbox Mode (Client Engine)'}
            </div>
          </div>
        </div>
      </Glass>

      {/* Hero Telemetry Status Banner */}
      <Glass className="p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Eyebrow>Kernel Status Snapshot</Eyebrow>
              <span className="font-mono text-xs text-cyan-400 font-semibold px-2 py-0.5 rounded bg-cyan-950/80 border border-cyan-800/60">
                Tick #{tick}
              </span>
              <SimulationDisclaimerBadge compact />
            </div>

            <h2 className="text-2xl font-display font-bold text-white tracking-tight">
              {alive.length} Active Tasks Allocated across Process Tree
            </h2>

            <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
              Real-time operating system kernel state. Tasks transition between NEW, READY, RUNNING, WAITING, and TERMINATED lifecycle states adhering to strict POSIX scheduling principles.
            </p>

            {/* Proportion Bar */}
            <div className="pt-2">
              <div className="h-3 w-full rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
                {STATES.map((s) => {
                  const pct = procs.length ? (counts[s] / procs.length) * 100 : 0;
                  return (
                    <div
                      key={s}
                      style={{ width: `${pct}%`, backgroundColor: COLOR[s] }}
                      title={`${LABEL[s]}: ${counts[s]} (${pct.toFixed(0)}%)`}
                      className="transition-all duration-500 hover:opacity-90"
                    />
                  );
                })}
              </div>

              <div className="flex flex-wrap gap-4 mt-2 font-mono text-[11px]">
                {STATES.map((s) => (
                  <div key={s} className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLOR[s] }} />
                    <span className="text-slate-400">{LABEL[s]}:</span>
                    <span className="font-bold text-white">{counts[s]}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Radial Telemetry Gauges */}
          <div className="flex items-center justify-around gap-6 lg:border-l lg:border-slate-800 lg:pl-8">
            <div className="text-center">
              <Ring value={load} color="#06b6d4" size={110}>
                <div>
                  <div className="text-lg font-mono font-bold text-cyan-300">{load}%</div>
                  <div className="text-[10px] text-slate-400 font-mono">CPU LOAD</div>
                </div>
              </Ring>
              <div className="text-xs font-semibold text-slate-200 mt-1">Core 0 Activity</div>
            </div>

            <div className="text-center">
              <Ring value={Math.min(100, Math.round((mem / 1024) * 100))} color="#a78bfa" size={110}>
                <div>
                  <div className="text-lg font-mono font-bold text-violet-300">{mem}</div>
                  <div className="text-[10px] text-slate-400 font-mono">MB / 1GB</div>
                </div>
              </Ring>
              <div className="text-xs font-semibold text-slate-200 mt-1">Virtual RAM</div>
            </div>
          </div>
        </div>
      </Glass>

      {/* KPI Cards with Wave Sparklines */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map(([title, val, Icon, color], idx) => (
          <Glass key={title} className="p-4 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>{title}</span>
              <Icon size={16} style={{ color }} />
            </div>
            <div className="text-2xl font-display font-bold text-white mt-1.5 font-mono">
              {val}
            </div>
            <div className="mt-2">
              <Spark seedN={idx * 3 + tick * 0.1} color={color} />
            </div>
          </Glass>
        ))}
      </div>

      {/* Core PCB & Scheduling Queues */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Core 0 PCB Card */}
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Cpu size={16} className="text-cyan-400" />
              <h3 className="text-base font-display font-bold text-white">
                Active CPU Core #0
              </h3>
            </div>
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
            </span>
          </div>

          {running ? (
            <div className="space-y-4">
              <div className="p-3 bg-slate-900/90 rounded-xl border border-cyan-900/40">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-white text-sm">
                    {running.name}
                  </span>
                  <StateChip state={running.state} />
                </div>
                <div className="flex items-center gap-4 mt-2 text-xs font-mono text-slate-400">
                  <span>PID: <strong className="text-cyan-300">{running.pid}</strong></span>
                  <span>PPID: {running.ppid}</span>
                  <span>Priority: {running.priority}</span>
                  <span>Burst: {running.cpuBurst}t</span>
                </div>
              </div>

              {/* Hardware Registers */}
              <div>
                <Eyebrow className="mb-2">Hardware PCB Registers</Eyebrow>
                <div className="grid grid-cols-2 gap-2">
                  <div className="reg-chip">
                    <span className="text-slate-500">PC:</span>
                    <span className="text-cyan-300 font-semibold">{running.registers?.PC || '0x00400000'}</span>
                  </div>
                  <div className="reg-chip">
                    <span className="text-slate-500">SP:</span>
                    <span className="text-slate-300">{running.registers?.SP || '0x7ffd0000'}</span>
                  </div>
                  <div className="reg-chip">
                    <span className="text-slate-500">RAX:</span>
                    <span className="text-amber-300">{running.registers?.RAX || '0x00000000'}</span>
                  </div>
                  <div className="reg-chip">
                    <span className="text-slate-500">RIP:</span>
                    <span className="text-emerald-300">{running.registers?.RIP || '0x00401000'}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6 text-center text-slate-500 font-mono text-xs">
              Core idling. No process in RUNNING state.
            </div>
          )}
        </Glass>

        {/* Ready & Waiting Queues */}
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-emerald-400" />
              <h3 className="text-base font-display font-bold text-white">
                Scheduler Queues
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              Priority Sorted
            </span>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-emerald-400 font-semibold">Ready Queue ({queue('READY').length})</span>
                <span className="text-slate-500">Head of Queue</span>
              </div>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {queue('READY').map((p) => (
                  <div
                    key={p.pid}
                    className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono"
                  >
                    <span className="font-semibold text-slate-200">
                      PID {p.pid} · {p.name}
                    </span>
                    <span className="text-[10px] text-emerald-300 px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/40">
                      p{p.priority} · {p.cpuBurst}t
                    </span>
                  </div>
                ))}
                {queue('READY').length === 0 && (
                  <div className="text-xs text-slate-500 font-mono p-2 text-center">
                    Queue empty
                  </div>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono mb-2">
                <span className="text-amber-400 font-semibold">Waiting Queue ({queue('WAITING').length})</span>
                <span className="text-slate-500">I/O Blocked</span>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {queue('WAITING').map((p) => (
                  <div
                    key={p.pid}
                    className="p-2 rounded-lg bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs font-mono"
                  >
                    <span className="text-slate-300">
                      PID {p.pid} · {p.name}
                    </span>
                    <span className="text-[10px] text-amber-300 px-1.5 py-0.5 rounded bg-amber-950/60 border border-amber-800/40">
                      I/O Wait
                    </span>
                  </div>
                ))}
                {queue('WAITING').length === 0 && (
                  <div className="text-xs text-slate-500 font-mono p-2 text-center">
                    No blocked processes
                  </div>
                )}
              </div>
            </div>
          </div>
        </Glass>

        {/* Kernel Console dmesg buffer */}
        <Glass className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Terminal size={16} className="text-cyan-400" />
              <h3 className="text-base font-display font-bold text-white">
                Kernel Log (dmesg)
              </h3>
            </div>
            <button
              onClick={clearLogs}
              className="text-slate-500 hover:text-slate-300 text-xs flex items-center gap-1 font-mono transition"
            >
              <Trash2 size={12} />
              Clear
            </button>
          </div>

          <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800/80 h-72 overflow-y-auto space-y-1.5 font-mono text-xs">
            {logs.map((log) => {
              const levelColor =
                log.lvl === 'ERROR'
                  ? 'text-rose-400'
                  : log.lvl === 'WARN'
                  ? 'text-amber-400'
                  : log.lvl === 'SUCCESS'
                  ? 'text-emerald-400'
                  : 'text-cyan-400';

              return (
                <div key={log.id} className="leading-tight flex items-start gap-2">
                  <span className={`font-bold ${levelColor} shrink-0 text-[10px]`}>
                    [{log.lvl}]
                  </span>
                  <span className="text-slate-300 break-words">{log.msg}</span>
                </div>
              );
            })}
            {logs.length === 0 && (
              <div className="text-center text-slate-600 pt-8">Log buffer empty.</div>
            )}
          </div>
        </Glass>
      </div>
    </div>
  );
}
