import React, { useState } from 'react';
import { X, GitFork, Cpu, ShieldAlert, Sparkles } from 'lucide-react';
import { useOS, COLOR } from '../context/OSContext';
import { Eyebrow, SimulationDisclaimerBadge } from './Common';

export function CreateModal({ onClose }: { onClose: () => void }) {
  const { procs, fork } = useOS();
  const alive = procs.filter((p) => p.state !== 'TERMINATED');
  const [f, setF] = useState({
    name: '',
    ppid: 1,
    priority: 5,
    cpuBurst: 10,
    memoryMb: 32,
  });
  const [err, setErr] = useState<{ [key: string]: string }>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: { [key: string]: string } = {};

    if (!/^[a-z0-9-_]{2,28}$/i.test(f.name)) {
      er.name = 'Must be 2–28 characters (letters, numbers, hyphens, underscores)';
    }
    if (!(f.priority >= 1 && f.priority <= 10)) {
      er.priority = 'Priority must be between 1 and 10';
    }
    if (!(f.cpuBurst >= 1 && f.cpuBurst <= 100)) {
      er.cpuBurst = 'CPU burst must be between 1 and 100 ticks';
    }
    if (!(f.memoryMb >= 4 && f.memoryMb <= 512)) {
      er.memoryMb = 'Memory must be between 4 and 512 MB';
    }

    setErr(er);
    if (Object.keys(er).length) return;

    fork(Number(f.ppid), {
      name: f.name.toLowerCase().trim(),
      priority: Number(f.priority),
      cpuBurst: Number(f.cpuBurst),
      memoryMb: Number(f.memoryMb),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg p-6 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl space-y-4 text-slate-100 font-sans"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Eyebrow>POSIX syscall fork() + execve()</Eyebrow>
              <SimulationDisclaimerBadge compact />
            </div>
            <h2 className="text-xl font-display font-bold text-white mt-1">
              Spawn New Process
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Instantiate a simulated PCB and insert it into the scheduler's READY queue.
            </p>
          </div>
          <button
            type="button"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
            onClick={onClose}
          >
            <X size={16} />
          </button>
        </div>

        {/* Process Name */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">
            Process Binary Name
          </label>
          <input
            type="text"
            autoFocus
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
            placeholder="e.g. nginx-worker, db-sync, compiler"
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400 placeholder:text-slate-600"
          />
          {err.name && (
            <p className="text-[11px] font-mono text-rose-400">{err.name}</p>
          )}
        </div>

        {/* Parent PID Selector */}
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-300">
            Parent Process (PPID)
          </label>
          <select
            value={f.ppid}
            onChange={(e) => setF({ ...f, ppid: Number(e.target.value) })}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-cyan-400"
          >
            {alive.map((p) => (
              <option key={p.pid} value={p.pid}>
                PID {p.pid} — {p.name} ({p.state})
              </option>
            ))}
          </select>
        </div>

        {/* Priority & Burst */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">Static Priority</span>
              <span className="font-mono text-cyan-400 font-bold">{f.priority} (1=High)</span>
            </div>
            <input
              type="range"
              min="1"
              max="10"
              value={f.priority}
              onChange={(e) => setF({ ...f, priority: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            {err.priority && (
              <p className="text-[11px] font-mono text-rose-400">{err.priority}</p>
            )}
          </div>

          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="font-semibold text-slate-300">CPU Burst</span>
              <span className="font-mono text-cyan-400 font-bold">{f.cpuBurst} ticks</span>
            </div>
            <input
              type="range"
              min="1"
              max="60"
              value={f.cpuBurst}
              onChange={(e) => setF({ ...f, cpuBurst: Number(e.target.value) })}
              className="w-full accent-cyan-400 cursor-pointer"
            />
            {err.cpuBurst && (
              <p className="text-[11px] font-mono text-rose-400">{err.cpuBurst}</p>
            )}
          </div>
        </div>

        {/* Virtual Memory Allocation */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-slate-300">Virtual Memory Address Space</span>
            <span className="font-mono text-violet-400 font-bold">{f.memoryMb} MB</span>
          </div>
          <input
            type="range"
            min="8"
            max="256"
            step="8"
            value={f.memoryMb}
            onChange={(e) => setF({ ...f, memoryMb: Number(e.target.value) })}
            className="w-full accent-violet-400 cursor-pointer"
          />
          {err.memoryMb && (
            <p className="text-[11px] font-mono text-rose-400">{err.memoryMb}</p>
          )}
        </div>

        {/* Actions */}
        <div className="pt-2 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="btn-fork text-xs"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-fork btn-fork-primary text-xs"
          >
            <GitFork size={13} />
            Spawn Process
          </button>
        </div>
      </form>
    </div>
  );
}
