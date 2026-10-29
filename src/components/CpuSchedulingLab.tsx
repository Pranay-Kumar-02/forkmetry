import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Play,
  Plus,
  Trash2,
  RotateCcw,
  BarChart3,
  TrendingUp,
  Timer,
  Activity,
  Zap,
  Sliders,
  Sparkles,
  Download,
  HelpCircle,
  ChevronRight,
  Info,
  Clock,
  ChevronDown,
} from 'lucide-react';
import { Glass, Eyebrow, SimulationDisclaimerBadge } from './Common';
import {
  runSchedulingSimulation,
  SchedulingProcessInput,
  WORKLOAD_PRESETS,
  exportMetricsToCSV,
  exportWorkloadToJSON,
} from '../utils/schedulingAlgorithms';

const PALETTE = ['#38bdf8', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#f97316'];

export function CpuSchedulingLab() {
  const [algorithm, setAlgorithm] = useState<'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'PRIORITY'>('RR');
  const [quantum, setQuantum] = useState<number>(3);
  const [processes, setProcesses] = useState<SchedulingProcessInput[]>(WORKLOAD_PRESETS[0].processes);
  const [selectedPreset, setSelectedPreset] = useState<string>(WORKLOAD_PRESETS[0].id);
  const [showExplainer, setShowExplainer] = useState<boolean>(true);
  const [playbackTime, setPlaybackTime] = useState<number | null>(null);

  // New process input form state
  const [newProc, setNewProc] = useState({
    name: '',
    arrivalTime: 0,
    burstTime: 4,
    priority: 3,
  });

  const handleSelectPreset = (presetId: string) => {
    const found = WORKLOAD_PRESETS.find((p) => p.id === presetId);
    if (found) {
      setSelectedPreset(presetId);
      setProcesses(found.processes);
      setQuantum(found.quantum);
      setPlaybackTime(null);
    }
  };

  // Run full simulation with detailed decision logs
  const sim = useMemo(() => {
    return runSchedulingSimulation(algorithm, processes, quantum);
  }, [algorithm, processes, quantum]);

  const handleAddProcess = (e: React.FormEvent) => {
    e.preventDefault();
    const nextPid = processes.length > 0 ? Math.max(...processes.map((p) => p.pid)) + 1 : 1;
    const procName = newProc.name.trim() || `P${nextPid} (Custom)`;
    const newEntry: SchedulingProcessInput = {
      pid: nextPid,
      name: procName,
      arrivalTime: Math.max(0, Number(newProc.arrivalTime)),
      burstTime: Math.max(1, Number(newProc.burstTime)),
      priority: Math.max(1, Math.min(10, Number(newProc.priority))),
      color: PALETTE[(nextPid - 1) % PALETTE.length],
    };

    setProcesses((prev) => [...prev, newEntry]);
    setNewProc({ name: '', arrivalTime: 0, burstTime: 4, priority: 3 });
  };

  const handleRemoveProcess = (pid: number) => {
    setProcesses((prev) => prev.filter((p) => p.pid !== pid));
  };

  const handleExportCSV = () => {
    const csv = exportMetricsToCSV(sim);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forkmetry-${algorithm.toLowerCase()}-schedule.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportJSON = () => {
    const jsonStr = exportWorkloadToJSON(processes, quantum);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forkmetry-workload.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header Card */}
      <Glass className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5 text-cyan-400" />
              <h1 className="text-xl font-display font-bold text-white tracking-tight">
                CPU Scheduling Lab &amp; Gantt Engine
              </h1>
              <SimulationDisclaimerBadge compact />
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Configurable OS scheduler simulator supporting FCFS, SJF, SRTF, Round Robin with quantum, and Priority scheduling. Computes Completion Time (CT), Turnaround Time (TAT), Waiting Time (WT), and Response Time (RT).
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handleExportCSV}
              className="btn-fork text-xs"
              title="Export results to CSV"
            >
              <Download size={13} />
              Export CSV
            </button>
            <button
              onClick={handleExportJSON}
              className="btn-fork text-xs"
              title="Export workload to JSON"
            >
              <Download size={13} />
              Export Workload JSON
            </button>
          </div>
        </div>

        {/* Algorithm Selector Tabs & Controls */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'FCFS', label: 'FCFS', sub: 'First-Come First-Served' },
              { id: 'SJF', label: 'SJF', sub: 'Shortest Job First' },
              { id: 'SRTF', label: 'SRTF', sub: 'Preemptive SJF' },
              { id: 'RR', label: 'Round Robin', sub: 'Time Sliced' },
              { id: 'PRIORITY', label: 'Priority', sub: 'Non-Preemptive' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setAlgorithm(item.id as any);
                  setPlaybackTime(null);
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition text-left ${
                  algorithm === item.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                <div className="font-semibold">{item.label}</div>
                <div className="text-[10px] text-slate-500 font-mono">{item.sub}</div>
              </button>
            ))}
          </div>

          {algorithm === 'RR' && (
            <div className="flex items-center gap-3 p-2 bg-slate-900/80 border border-slate-800 rounded-lg">
              <span className="text-xs font-mono text-slate-400">Time Quantum:</span>
              <input
                type="range"
                min="1"
                max="8"
                value={quantum}
                onChange={(e) => setQuantum(Number(e.target.value))}
                className="w-24 accent-cyan-400 cursor-pointer"
              />
              <span className="font-mono text-xs font-bold text-cyan-300 px-2 py-0.5 bg-slate-800 rounded">
                {quantum} ticks
              </span>
            </div>
          )}
        </div>

        {/* Presets Row */}
        <div className="mt-4 pt-3 border-t border-slate-800/40 flex items-center gap-2 flex-wrap">
          <Eyebrow>Preset Scenarios:</Eyebrow>
          {WORKLOAD_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleSelectPreset(p.id)}
              className={`px-2.5 py-1 text-[11px] rounded font-medium transition ${
                selectedPreset === p.id
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'bg-slate-900/40 text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              {p.title}
            </button>
          ))}
        </div>
      </Glass>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Glass className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Avg Waiting Time</span>
            <Timer size={15} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-emerald-300">
            {sim.avgWaitingTime} <span className="text-xs font-sans text-slate-500">ticks</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">WT = TAT − Burst Time</div>
        </Glass>

        <Glass className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Avg Turnaround Time</span>
            <Clock size={15} className="text-cyan-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-cyan-300">
            {sim.avgTurnaroundTime} <span className="text-xs font-sans text-slate-500">ticks</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">TAT = CT − Arrival Time</div>
        </Glass>

        <Glass className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Avg Response Time</span>
            <Zap size={15} className="text-violet-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-violet-300">
            {sim.avgResponseTime} <span className="text-xs font-sans text-slate-500">ticks</span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1">RT = First Run − Arrival Time</div>
        </Glass>

        <Glass className="p-4">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CPU Core Utilization</span>
            <Activity size={15} className="text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-mono font-bold text-amber-300">
            {sim.cpuUtilization}%
          </div>
          <div className="text-[10px] text-slate-400 mt-1">
            Busy: {sim.busyTime}t · Idle: {sim.idleTime}t
          </div>
        </Glass>
      </div>

      {/* Gantt Chart Timeline Card */}
      <Glass className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Eyebrow>Execution Schedule</Eyebrow>
              <span className="font-mono text-[10px] text-slate-400">
                [Total Duration: {sim.totalTime} ticks]
              </span>
            </div>
            <h3 className="text-base font-display font-bold text-white mt-0.5">
              Gantt Chart Timeline
            </h3>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowExplainer((s) => !s)}
              className="btn-fork text-xs"
            >
              <Info size={13} className="text-cyan-400" />
              {showExplainer ? 'Hide Step Explanations' : 'Show Step Explanations'}
            </button>
          </div>
        </div>

        {/* Gantt Bar */}
        <div className="relative mt-4">
          <div className="h-14 w-full flex rounded-xl overflow-hidden border border-slate-700/80 bg-slate-950 shadow-inner">
            {sim.ganttChart.map((block, i) => {
              const widthPct = sim.totalTime > 0 ? (block.duration / sim.totalTime) * 100 : 0;
              const isIdle = block.pid === 'IDLE';
              const proc = processes.find((p) => p.pid === block.pid);
              const color = isIdle ? '#334155' : proc?.color || '#0284c7';

              return (
                <div
                  key={i}
                  style={{ width: `${widthPct}%`, backgroundColor: color }}
                  className={`h-full flex flex-col items-center justify-center text-white border-r border-slate-900/60 transition-all hover:brightness-110 cursor-pointer relative group ${
                    isIdle ? 'bg-stripes' : ''
                  }`}
                  title={`${block.processName || block.pid} [t=${block.startTime} → t=${block.endTime}] (${block.duration} ticks)`}
                  onClick={() => setPlaybackTime(block.startTime)}
                >
                  <span className="font-mono font-bold text-xs truncate px-1">
                    {isIdle ? 'IDLE' : block.processName?.split(' ')[0] || `P${block.pid}`}
                  </span>
                  <span className="font-mono text-[9px] opacity-80">
                    {block.duration}t
                  </span>
                </div>
              );
            })}
          </div>

          {/* Time tick labels */}
          <div className="flex justify-between mt-2 font-mono text-[10px] text-slate-400 px-0.5">
            <span>t=0</span>
            {sim.ganttChart.map((b, idx) => (
              <span key={idx}>t={b.endTime}</span>
            ))}
          </div>
        </div>

        {/* Step-by-Step Scheduling Explainer Panel */}
        {showExplainer && (
          <div className="mt-6 pt-5 border-t border-slate-800">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={14} className="text-cyan-400" />
              <Eyebrow>Scheduler Decision Log &amp; Rationale</Eyebrow>
            </div>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {sim.decisions.map((dec, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg text-xs font-mono border flex items-start gap-3 transition ${
                    dec.selectedPid === 'IDLE'
                      ? 'bg-slate-900/40 border-slate-800 text-slate-400'
                      : 'bg-slate-900/80 border-cyan-900/40 text-slate-200'
                  }`}
                >
                  <span className="px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-bold shrink-0">
                    t={dec.time}
                  </span>
                  <div className="flex-1">
                    <span className="font-semibold text-white mr-1.5">
                      [{dec.selectedName}]
                    </span>
                    <span className="text-slate-300">{dec.reason}</span>
                    {dec.readyQueueSnapshot.length > 0 && (
                      <div className="mt-1 flex items-center gap-1.5 text-[10px] text-slate-500">
                        <span>Ready Queue:</span>
                        {dec.readyQueueSnapshot.map((q) => (
                          <span
                            key={q.pid}
                            className="px-1.5 py-0.2 rounded bg-slate-800/80 text-slate-300"
                          >
                            P{q.pid} ({q.metricValue})
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Glass>

      {/* Process Table & Workload Form */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Results Table */}
        <Glass className="lg:col-span-2 p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <Eyebrow>Process Performance Analysis</Eyebrow>
              <h3 className="text-base font-display font-bold text-white">
                Detailed Metrics by Process
              </h3>
            </div>
            <span className="text-xs font-mono text-slate-400">
              {processes.length} Processes
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-3 font-semibold">Process</th>
                  <th className="pb-3 font-semibold">AT</th>
                  <th className="pb-3 font-semibold">BT</th>
                  <th className="pb-3 font-semibold">Prio</th>
                  <th className="pb-3 font-semibold">CT</th>
                  <th className="pb-3 font-semibold">TAT</th>
                  <th className="pb-3 font-semibold">WT</th>
                  <th className="pb-3 font-semibold">RT</th>
                  <th className="pb-3 font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-200">
                {sim.processMetrics.map((p) => {
                  const orig = processes.find((x) => x.pid === p.pid);
                  return (
                    <tr key={p.pid} className="hover:bg-slate-800/30 transition">
                      <td className="py-3 font-sans font-semibold text-white flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: orig?.color || '#38bdf8' }}
                        />
                        {p.name}
                      </td>
                      <td className="py-3 text-slate-400">{p.arrivalTime}</td>
                      <td className="py-3 text-slate-200 font-semibold">{p.burstTime}</td>
                      <td className="py-3 text-slate-400">{p.priority}</td>
                      <td className="py-3 text-slate-300 font-semibold">{p.completionTime}</td>
                      <td className="py-3 text-cyan-300 font-bold">{p.turnaroundTime}</td>
                      <td className="py-3 text-emerald-300 font-bold">{p.waitingTime}</td>
                      <td className="py-3 text-violet-300">{p.responseTime}</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleRemoveProcess(p.pid)}
                          className="text-slate-500 hover:text-rose-400 transition"
                          title="Remove process"
                        >
                          <Trash2 size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Glass>

        {/* Add Process Form */}
        <Glass className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Plus size={16} className="text-cyan-400" />
            <h3 className="text-base font-display font-bold text-white">
              Add Process
            </h3>
          </div>

          <form onSubmit={handleAddProcess} className="space-y-4 text-xs font-mono">
            <div>
              <label className="block text-slate-400 mb-1">Process Name</label>
              <input
                type="text"
                value={newProc.name}
                onChange={(e) => setNewProc({ ...newProc, name: e.target.value })}
                placeholder="e.g. Worker Task"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white font-sans text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 mb-1">Arrival Time (AT)</label>
                <input
                  type="number"
                  min="0"
                  value={newProc.arrivalTime}
                  onChange={(e) => setNewProc({ ...newProc, arrivalTime: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Burst Time (BT)</label>
                <input
                  type="number"
                  min="1"
                  value={newProc.burstTime}
                  onChange={(e) => setNewProc({ ...newProc, burstTime: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 mb-1">
                Priority (1 = Highest, 10 = Lowest)
              </label>
              <input
                type="number"
                min="1"
                max="10"
                value={newProc.priority}
                onChange={(e) => setNewProc({ ...newProc, priority: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-xs focus:outline-none focus:border-cyan-400"
              />
            </div>

            <button
              type="submit"
              className="w-full btn-fork btn-fork-primary py-2.5 text-xs font-semibold"
            >
              <Plus size={14} />
              Append to Schedule
            </button>
          </form>

          {/* Mathematical formulas callout */}
          <div className="mt-6 pt-5 border-t border-slate-800 text-[11px] text-slate-400 space-y-1.5 font-mono">
            <div className="font-semibold text-slate-300">Standard OS Formulas:</div>
            <div>• TAT = Completion Time − Arrival Time</div>
            <div>• WT = Turnaround Time − Burst Time</div>
            <div>• RT = First Response Time − Arrival Time</div>
            <div>• CPU Utilization = (Busy Time / Total Time) × 100%</div>
          </div>
        </Glass>
      </div>
    </div>
  );
}
