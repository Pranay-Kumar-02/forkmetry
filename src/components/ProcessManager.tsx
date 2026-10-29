import React, { useState } from 'react';
import {
  Search,
  Trash2,
  RefreshCw,
  Plus,
  GitFork,
  Skull,
  Eye,
  Activity,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { useOS, STATES, COLOR, ProcessState } from '../context/OSContext';
import { Glass, StateChip, Eyebrow, SimulationDisclaimerBadge } from './Common';
import { ProcessStateFlowDiagram } from './ProcessStateFlowDiagram';

export function ProcessManager({
  onInspect,
  openCreate,
}: {
  onInspect: (pid: number) => void;
  openCreate: () => void;
}) {
  const { procs, setState, fork, kill, reap, reset } = useOS();
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<string>('ALL');
  const [showStateDiagram, setShowStateDiagram] = useState<boolean>(true);

  const rows = procs.filter(
    (p) =>
      (tab === 'ALL' || p.state === tab) &&
      (p.name.toLowerCase().includes(q.toLowerCase()) || String(p.pid).includes(q))
  );

  return (
    <div className="space-y-6 pb-12">
      {/* State Flow Diagram Collapsible Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-display font-bold text-white tracking-wide uppercase">
              OS 5-State Architecture Engine
            </h2>
            <SimulationDisclaimerBadge compact />
          </div>
          <button
            onClick={() => setShowStateDiagram((s) => !s)}
            className="btn-fork text-xs"
          >
            <Activity size={13} className="text-cyan-400" />
            {showStateDiagram ? 'Hide State Diagram' : 'Show State Diagram'}
          </button>
        </div>
        {showStateDiagram && <ProcessStateFlowDiagram />}
      </div>

      {/* Process Table & Filter Actions Bar */}
      <Glass className="p-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search process by name or PID..."
              className="w-full pl-9 pr-4 py-1.5 bg-slate-900 border border-slate-700/80 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
            />
          </div>

          {/* Filter tabs */}
          <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-lg border border-slate-800 flex-wrap">
            {['ALL', ...STATES].map((s) => {
              const count = s === 'ALL' ? procs.length : procs.filter((p) => p.state === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setTab(s)}
                  className={`px-3 py-1 rounded text-xs font-mono font-medium transition flex items-center gap-1.5 ${
                    tab === s
                      ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <span>{s}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={openCreate}
              className="btn-fork btn-fork-primary text-xs"
            >
              <Plus size={13} />
              Spawn Task
            </button>
            <button
              onClick={reap}
              className="btn-fork text-xs"
              title="Reap zombie processes and re-parent orphans to PID 1"
            >
              <Trash2 size={13} className="text-amber-400" />
              Reap Zombies
            </button>
            <button
              onClick={reset}
              className="btn-fork text-xs text-slate-400"
              title="Reset process table to init state"
            >
              <RefreshCw size={13} />
              Reset Init
            </button>
          </div>
        </div>
      </Glass>

      {/* Main Process Table */}
      <Glass className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400">
                <th className="py-3 px-4 font-semibold">PID</th>
                <th className="py-3 px-4 font-semibold">PPID</th>
                <th className="py-3 px-4 font-semibold">Process Name</th>
                <th className="py-3 px-4 font-semibold">Lifecycle State</th>
                <th className="py-3 px-4 font-semibold">Priority</th>
                <th className="py-3 px-4 font-semibold">CPU Burst</th>
                <th className="py-3 px-4 font-semibold">Memory</th>
                <th className="py-3 px-4 font-semibold">Children</th>
                <th className="py-3 px-4 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {rows.map((p) => {
                const isTerminated = p.state === 'TERMINATED';
                return (
                  <tr
                    key={p.pid}
                    className={`hover:bg-slate-800/30 transition ${
                      isTerminated ? 'opacity-50' : ''
                    }`}
                  >
                    <td className="py-3 px-4 font-bold text-white">
                      PID {p.pid}
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {p.ppid === 0 ? 'root' : p.ppid}
                    </td>
                    <td className="py-3 px-4 font-sans font-semibold text-slate-100">
                      {p.name}
                    </td>
                    <td className="py-3 px-4">
                      <select
                        value={p.state}
                        disabled={isTerminated}
                        onChange={(e) => setState(p.pid, e.target.value as ProcessState)}
                        className="bg-slate-900 border border-slate-700/80 rounded px-2 py-0.5 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 disabled:opacity-50"
                      >
                        {STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="w-4 text-right">{p.priority}</span>
                        <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-cyan-400 rounded-full"
                            style={{ width: `${(p.priority / 10) * 100}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-cyan-300">
                      {p.cpuBurst} ticks
                    </td>
                    <td className="py-3 px-4 text-violet-300">
                      {p.memoryMb} MB
                    </td>
                    <td className="py-3 px-4 text-slate-400">
                      {p.childrenPids?.length ? `${p.childrenPids.length} active` : 'none'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => onInspect(p.pid)}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                          title="Inspect PCB Details"
                        >
                          <Eye size={13} />
                        </button>
                        <button
                          disabled={isTerminated}
                          onClick={() => fork(p.pid)}
                          className="p-1.5 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition disabled:opacity-30"
                          title="Fork Child"
                        >
                          <GitFork size={13} />
                        </button>
                        {p.pid !== 1 && !isTerminated && (
                          <button
                            onClick={() => kill(p.pid)}
                            className="p-1.5 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition"
                            title="Deliver SIGTERM"
                          >
                            <Skull size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500 font-mono">
                    No processes matching query "{q}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Glass>
    </div>
  );
}
