import React, { useState, useMemo } from 'react';
import {
  Scale,
  Play,
  RotateCcw,
  Sparkles,
  Trophy,
  Zap,
  Clock,
  Activity,
  Layers,
  ArrowRight,
  Download,
  Sliders,
  CheckCircle2,
  Info,
} from 'lucide-react';
import { Glass, Eyebrow, SimulationDisclaimerBadge } from './Common';
import {
  runSchedulingSimulation,
  SchedulingProcessInput,
  WORKLOAD_PRESETS,
  exportMetricsToCSV,
} from '../utils/schedulingAlgorithms';

const ALGORITHMS: { id: 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'PRIORITY'; label: string; desc: string; color: string }[] = [
  { id: 'FCFS', label: 'First-Come First-Served', desc: 'Non-preemptive queue ordered strictly by arrival order.', color: '#38bdf8' },
  { id: 'SJF', label: 'Shortest Job First', desc: 'Non-preemptive job scheduling prioritizing minimum total burst.', color: '#10b981' },
  { id: 'SRTF', label: 'Shortest Remaining Time', desc: 'Preemptive variant of SJF checking remaining burst on every tick.', color: '#06b6d4' },
  { id: 'RR', label: 'Round Robin', desc: 'Fair time-sliced preemptive queue with configurable time quantum.', color: '#f59e0b' },
  { id: 'PRIORITY', label: 'Priority Scheduling', desc: 'Highest priority tasks dispatched first (1=Highest, 10=Lowest).', color: '#a78bfa' },
];

export function SchedulingComparator() {
  const [selectedPreset, setSelectedPreset] = useState<string>(WORKLOAD_PRESETS[0].id);
  const [processes, setProcesses] = useState<SchedulingProcessInput[]>(WORKLOAD_PRESETS[0].processes);
  const [quantum, setQuantum] = useState<number>(3);
  const [metricTab, setMetricTab] = useState<'TAT' | 'WT' | 'RT' | 'UTIL'>('WT');

  const handleSelectPreset = (presetId: string) => {
    const found = WORKLOAD_PRESETS.find(p => p.id === presetId);
    if (found) {
      setSelectedPreset(presetId);
      setProcesses(found.processes);
      setQuantum(found.quantum);
    }
  };

  // Run simulation across all 5 algorithms
  const results = useMemo(() => {
    return ALGORITHMS.map(algo => {
      const sim = runSchedulingSimulation(algo.id, processes, quantum);
      return {
        ...algo,
        sim,
      };
    });
  }, [processes, quantum]);

  // Identify winners for each metric
  const bestWT = useMemo(() => [...results].sort((a, b) => a.sim.avgWaitingTime - b.sim.avgWaitingTime)[0], [results]);
  const bestTAT = useMemo(() => [...results].sort((a, b) => a.sim.avgTurnaroundTime - b.sim.avgTurnaroundTime)[0], [results]);
  const bestRT = useMemo(() => [...results].sort((a, b) => a.sim.avgResponseTime - b.sim.avgResponseTime)[0], [results]);
  const bestUtil = useMemo(() => [...results].sort((a, b) => b.sim.cpuUtilization - a.sim.cpuUtilization)[0], [results]);

  const maxWT = Math.max(...results.map(r => r.sim.avgWaitingTime), 1);
  const maxTAT = Math.max(...results.map(r => r.sim.avgTurnaroundTime), 1);
  const maxRT = Math.max(...results.map(r => r.sim.avgResponseTime), 1);

  const handleExportAll = () => {
    let combined = `FORKMETRY MULTI-ALGORITHM SCHEDULING BENCHMARK REPORT\nGenerated at: ${new Date().toISOString()}\nQuantum: ${quantum}\nProcesses: ${processes.length}\n\n`;
    results.forEach(r => {
      combined += `\n========================================\nALGORITHM: ${r.label} (${r.id})\n========================================\n`;
      combined += exportMetricsToCSV(r.sim) + '\n\n';
    });

    const blob = new Blob([combined], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `forkmetry-benchmark-${selectedPreset}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Panel */}
      <Glass className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Scale className="w-5 h-5 text-cyan-400" />
              <h1 className="text-xl font-display font-bold text-white tracking-tight">
                Multi-Algorithm Scheduling Comparator
              </h1>
              <SimulationDisclaimerBadge compact />
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Execute identical process workloads concurrently across all 5 standard Operating System CPU scheduling algorithms. Inspect turnaround time, waiting latency, context switches, and CPU efficiency.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportAll}
              className="btn-fork btn-fork-primary text-xs"
            >
              <Download size={14} />
              Export Full Report (CSV)
            </button>
          </div>
        </div>

        {/* Preset Selector & Controls */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Eyebrow>Workload Scenario:</Eyebrow>
            <div className="flex flex-wrap gap-2">
              {WORKLOAD_PRESETS.map(preset => (
                <button
                  key={preset.id}
                  onClick={() => handleSelectPreset(preset.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    selectedPreset === preset.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {preset.title}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <span className="text-xs font-mono text-slate-400">RR Quantum:</span>
            <input
              type="range"
              min="1"
              max="10"
              value={quantum}
              onChange={e => setQuantum(Number(e.target.value))}
              className="w-24 accent-cyan-400 cursor-pointer"
            />
            <span className="font-mono text-xs font-semibold text-cyan-400 px-2 py-0.5 bg-slate-900 border border-slate-800 rounded">
              {quantum} ticks
            </span>
          </div>
        </div>
      </Glass>

      {/* Podium / Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Glass className="p-4 border-l-4 border-l-emerald-400">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Minimum Waiting Time</span>
            <Trophy size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2 text-xl font-display font-bold text-white">
            {bestWT.label}
          </div>
          <div className="mt-1 text-xs font-mono text-emerald-400">
            {bestWT.sim.avgWaitingTime} ticks avg latency
          </div>
        </Glass>

        <Glass className="p-4 border-l-4 border-l-cyan-400">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Fastest Turnaround</span>
            <Zap size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 text-xl font-display font-bold text-white">
            {bestTAT.label}
          </div>
          <div className="mt-1 text-xs font-mono text-cyan-400">
            {bestTAT.sim.avgTurnaroundTime} ticks avg completion
          </div>
        </Glass>

        <Glass className="p-4 border-l-4 border-l-violet-400">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Quickest Initial Response</span>
            <Clock size={16} className="text-violet-400" />
          </div>
          <div className="mt-2 text-xl font-display font-bold text-white">
            {bestRT.label}
          </div>
          <div className="mt-1 text-xs font-mono text-violet-400">
            {bestRT.sim.avgResponseTime} ticks avg response
          </div>
        </Glass>

        <Glass className="p-4 border-l-4 border-l-amber-400">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>CPU Core Utilization</span>
            <Activity size={16} className="text-amber-400" />
          </div>
          <div className="mt-2 text-xl font-display font-bold text-white">
            {bestUtil.sim.cpuUtilization}% Peak
          </div>
          <div className="mt-1 text-xs font-mono text-amber-400">
            Total Duration: {bestUtil.sim.totalTime} ticks
          </div>
        </Glass>
      </div>

      {/* Visual Metric Bar Charts */}
      <Glass className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-display font-bold text-white">
              Comparative Metric Analysis
            </h2>
            <p className="text-xs text-slate-400">
              Visualizing scheduler performance differences on the selected workload.
            </p>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 border border-slate-800 rounded-lg">
            {[
              { id: 'WT', label: 'Waiting Time' },
              { id: 'TAT', label: 'Turnaround Time' },
              { id: 'RT', label: 'Response Time' },
              { id: 'UTIL', label: 'CPU Utilization %' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setMetricTab(tab.id as any)}
                className={`px-3 py-1 rounded text-xs font-medium transition ${
                  metricTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 shadow-sm font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Comparative Bars */}
        <div className="space-y-4">
          {results.map(r => {
            let val = 0;
            let maxVal = 1;
            let displayVal = '';

            if (metricTab === 'WT') {
              val = r.sim.avgWaitingTime;
              maxVal = maxWT;
              displayVal = `${val} ticks`;
            } else if (metricTab === 'TAT') {
              val = r.sim.avgTurnaroundTime;
              maxVal = maxTAT;
              displayVal = `${val} ticks`;
            } else if (metricTab === 'RT') {
              val = r.sim.avgResponseTime;
              maxVal = maxRT;
              displayVal = `${val} ticks`;
            } else {
              val = r.sim.cpuUtilization;
              maxVal = 100;
              displayVal = `${val}%`;
            }

            const pct = Math.max(4, Math.min(100, (val / maxVal) * 100));
            const isWinner =
              (metricTab === 'WT' && r.id === bestWT.id) ||
              (metricTab === 'TAT' && r.id === bestTAT.id) ||
              (metricTab === 'RT' && r.id === bestRT.id) ||
              (metricTab === 'UTIL' && r.id === bestUtil.id);

            return (
              <div key={r.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-200">{r.label}</span>
                    <span className="font-mono text-[10px] text-slate-500 uppercase">({r.id})</span>
                    {isWinner && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <CheckCircle2 size={10} /> Optimal
                      </span>
                    )}
                  </div>
                  <span className="font-mono font-bold text-cyan-300">{displayVal}</span>
                </div>

                <div className="h-3 w-full bg-slate-900/90 rounded-full overflow-hidden border border-slate-800">
                  <div
                    className="h-full rounded-full transition-all duration-700 ease-out"
                    style={{
                      width: `${pct}%`,
                      backgroundColor: isWinner ? '#34d399' : r.color,
                      boxShadow: isWinner ? '0 0 10px rgba(52, 211, 153, 0.4)' : 'none',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Glass>

      {/* Head-to-Head Table */}
      <Glass className="p-6">
        <h2 className="text-base font-display font-bold text-white mb-4">
          Detailed Scheduling Leaderboard
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs font-mono">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="pb-3 font-semibold">Algorithm</th>
                <th className="pb-3 font-semibold">Avg Waiting Time (WT)</th>
                <th className="pb-3 font-semibold">Avg Turnaround (TAT)</th>
                <th className="pb-3 font-semibold">Avg Response (RT)</th>
                <th className="pb-3 font-semibold">CPU Utilization</th>
                <th className="pb-3 font-semibold">Total Duration</th>
                <th className="pb-3 font-semibold">Gantt Slices</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {results.map(r => (
                <tr key={r.id} className="hover:bg-slate-800/30 transition">
                  <td className="py-3 font-sans font-semibold text-white flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: r.color }} />
                    {r.label}
                  </td>
                  <td className="py-3 font-semibold text-emerald-300">{r.sim.avgWaitingTime} ticks</td>
                  <td className="py-3 font-semibold text-cyan-300">{r.sim.avgTurnaroundTime} ticks</td>
                  <td className="py-3 text-violet-300">{r.sim.avgResponseTime} ticks</td>
                  <td className="py-3 text-amber-300">{r.sim.cpuUtilization}%</td>
                  <td className="py-3 text-slate-400">{r.sim.totalTime} ticks</td>
                  <td className="py-3 text-slate-400">{r.sim.ganttChart.length} blocks</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Glass>

      {/* Educational takeaway callout */}
      <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 flex items-start gap-3">
        <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-white">OS Scheduling Engineering Insight: </span>
          Shortest Job First (SJF/SRTF) is mathematically provable to minimize Average Waiting Time, but risks starving long tasks if shorter jobs keep arriving. Round Robin ensures fairness and low response time for interactive environments, while FCFS is susceptible to the Convoy Effect.
        </div>
      </div>
    </div>
  );
}
