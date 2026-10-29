import React from 'react';
import { X, GitFork, Skull, Eye, Cpu, HardDrive, FileText, Activity } from 'lucide-react';
import { useOS, COLOR, ProcessState } from '../context/OSContext';
import { StateChip, Eyebrow, SimulationDisclaimerBadge } from './Common';

export function Inspector({
  pid,
  onClose,
}: {
  pid: number | null;
  onClose: () => void;
}) {
  const { procs, tick, fork, kill } = useOS();
  const p = procs.find((x) => x.pid === pid);
  if (!p) return null;

  const fds: [string, string, string][] = [
    ['0', 'stdin', '/dev/pts/0 (terminal input)'],
    ['1', 'stdout', '/dev/pts/0 (terminal output)'],
    ['2', 'stderr', '/dev/pts/0 (standard error)'],
    ...(p.name.includes('web') ? ([['3', 'socket', 'TCP *:443 (HTTP/2 TLS listener)']] as [string, string, string][]) : []),
    ...(p.name.includes('db') ? ([['3', 'socket', '/run/postgresql/.s.PGSQL.5432']] as [string, string, string][]) : []),
    ...(p.name.includes('worker')
      ? ([['3', 'pipe', `[ipc:pipe_fd:${p.ppid % 9}] (Parent duplex channel)`]] as [string, string, string][])
      : []),
  ];

  const Sec: React.FC<{ t: string; icon?: React.ElementType; children: React.ReactNode }> = ({
    t,
    icon: Icon,
    children,
  }) => (
    <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon size={13} className="text-cyan-400" />}
        <Eyebrow>{t}</Eyebrow>
      </div>
      <div className="space-y-1.5 pt-1">{children}</div>
    </div>
  );

  const Row: React.FC<{ k: string; v: React.ReactNode }> = ({ k, v }) => (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-400">{k}</span>
      <span className="font-mono text-slate-200 font-semibold">{v}</span>
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/70 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <aside
        className="w-full max-w-md m-3 p-6 rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-y-auto space-y-5 text-slate-100 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Eyebrow>Process Control Block (PCB)</Eyebrow>
              <SimulationDisclaimerBadge compact />
            </div>
            <div className="text-2xl font-display font-bold text-white mt-1">
              PID {p.pid}
            </div>
            <div className="text-xs font-mono text-cyan-400 font-semibold mt-0.5">
              {p.name}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* State line */}
        <div
          className="h-1 w-full rounded-full"
          style={{
            background: `linear-gradient(90deg, ${COLOR[p.state]}, transparent)`,
          }}
        />

        {/* Identity & Scheduling */}
        <Sec t="Process Identity &amp; State" icon={Activity}>
          <Row k="Parent PID (PPID)" v={p.ppid === 0 ? '0 (init root)' : p.ppid} />
          <Row k="Lifecycle State" v={<StateChip state={p.state} />} />
          <Row k="Scheduler Priority" v={`Level ${p.priority} (1=High, 10=Low)`} />
          <Row k="Remaining CPU Burst" v={`${p.cpuBurst} ticks`} />
          <Row k="Virtual Address Space" v={`${p.memoryMb} MB`} />
        </Sec>

        {/* Hardware Register Snapshot */}
        <Sec t="CPU Hardware Register Snapshot" icon={Cpu}>
          <div className="grid grid-cols-2 gap-2 text-xs font-mono">
            <div className="reg-chip">
              <span className="text-slate-500">RIP:</span>
              <span className="text-cyan-300">{p.registers?.RIP || '0x00401000'}</span>
            </div>
            <div className="reg-chip">
              <span className="text-slate-500">RSP:</span>
              <span className="text-slate-300">{p.registers?.SP || '0x7ffd0000'}</span>
            </div>
            <div className="reg-chip">
              <span className="text-slate-500">RAX:</span>
              <span className="text-amber-300">{p.registers?.RAX || '0x00000000'}</span>
            </div>
            <div className="reg-chip">
              <span className="text-slate-500">RBX:</span>
              <span className="text-slate-300">{p.registers?.RBX || '0x00000000'}</span>
            </div>
            <div className="reg-chip">
              <span className="text-slate-500">RCX:</span>
              <span className="text-slate-300">{p.registers?.RCX || '0x00000000'}</span>
            </div>
            <div className="reg-chip">
              <span className="text-slate-500">RDX:</span>
              <span className="text-slate-300">{p.registers?.RDX || '0x00000000'}</span>
            </div>
          </div>
        </Sec>

        {/* Child Lineage */}
        <Sec t="Process Tree Lineage" icon={GitFork}>
          <div className="text-xs">
            <span className="text-slate-400">Spawned Child PIDs:</span>
            {p.childrenPids && p.childrenPids.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {p.childrenPids.map((cid) => (
                  <span
                    key={cid}
                    className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-xs font-semibold"
                  >
                    PID {cid}
                  </span>
                ))}
              </div>
            ) : (
              <div className="text-slate-500 font-mono text-xs mt-1">
                Leaf node · no child tasks forked
              </div>
            )}
          </div>
        </Sec>

        {/* Open File Descriptors */}
        <Sec t="Open File Descriptors (FD Table)" icon={FileText}>
          <div className="space-y-1.5">
            {fds.map(([fd, type, target]) => (
              <div
                key={fd + type}
                className="flex items-center justify-between text-xs font-mono p-1.5 rounded bg-slate-950/60 border border-slate-800"
              >
                <div className="flex items-center gap-2">
                  <span className="text-cyan-400 font-bold">fd:{fd}</span>
                  <span className="text-slate-400 text-[10px]">({type})</span>
                </div>
                <span className="text-slate-300 text-[11px] truncate max-w-[180px]">{target}</span>
              </div>
            ))}
          </div>
        </Sec>

        {/* Bottom Actions */}
        <div className="pt-2 flex items-center gap-3">
          <button
            disabled={p.state === 'TERMINATED'}
            onClick={() => {
              fork(p.pid);
              onClose();
            }}
            className="flex-1 btn-fork btn-fork-primary py-2 text-xs"
          >
            <GitFork size={13} />
            Fork Child Task
          </button>
          {p.pid !== 1 && p.state !== 'TERMINATED' && (
            <button
              onClick={() => {
                kill(p.pid);
                onClose();
              }}
              className="flex-1 btn-fork btn-fork-danger py-2 text-xs"
            >
              <Skull size={13} />
              Deliver SIGTERM
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}
