import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { api, Process, KernelLog, SimulationStatus } from '../services/api';

export const STATES = ['RUNNING', 'READY', 'WAITING', 'TERMINATED'] as const;
export type ProcessState = typeof STATES[number];

export const COLOR: Record<string, string> = {
  RUNNING: '#0ea5e9',
  READY: '#10b981',
  WAITING: '#f59e0b',
  TERMINATED: '#f43f5e',
};

export const LABEL: Record<string, string> = {
  RUNNING: 'Running',
  READY: 'Ready',
  WAITING: 'Waiting',
  TERMINATED: 'Terminated',
};

export const tint = (hex: string, a: number) =>
  hex + Math.round(a * 255).toString(16).padStart(2, '0');

export const seed = (): Process[] => {
  const raw: [number, number, string, ProcessState, number, number, number][] = [
    [1, 0, 'systemd', 'RUNNING', 10, 4, 12],
    [101, 1, 'bash', 'READY', 6, 8, 6],
    [102, 1, 'web-server', 'RUNNING', 8, 20, 128],
    [103, 1, 'db-client', 'WAITING', 7, 14, 64],
    [104, 102, 'worker', 'READY', 5, 10, 48],
    [105, 102, 'worker', 'WAITING', 5, 12, 48],
    [106, 101, 'vim', 'READY', 4, 6, 18],
    [107, 103, 'pg-pool', 'TERMINATED', 3, 0, 0],
    [108, 102, 'cache-sync', 'READY', 6, 7, 32],
  ];
  return raw.map(([pid, ppid, name, state, priority, cpuBurst, memoryMb]) => ({
    pid,
    ppid,
    name,
    state,
    priority,
    cpuBurst,
    totalBurst: cpuBurst,
    memoryMb,
    childrenPids: raw.filter((r) => r[1] === pid).map((r) => r[0]),
    registers: {
      PC: `0x${(0x00400000 + pid * 0x100).toString(16).padStart(8, '0')}`,
      SP: `0x${(0x7ffd0000 + pid * 0x20).toString(16).padStart(8, '0')}`,
      RAX: `0x${((pid * 2654435761) >>> 0).toString(16).padStart(8, '0')}`,
      RBX: `0x${((pid * 40503) >>> 0).toString(16).padStart(8, '0')}`,
      RCX: `0x0000000${priority}`,
      RDX: `0x000000${memoryMb.toString(16).padStart(2, '0')}`,
      RIP: `0x${(0x00401000 + pid * 0x10).toString(16).padStart(8, '0')}`,
    },
  }));
};

interface OSContextType {
  procs: Process[];
  tick: number;
  logs: KernelLog[];
  backendOnline: boolean;
  algorithm: string;
  quantum: number;
  isSimulating: boolean;
  fork: (ppid: number, opts?: Partial<Process>) => Promise<number>;
  setState: (pid: number, state: ProcessState) => Promise<void>;
  kill: (pid: number) => Promise<void>;
  reap: () => Promise<void>;
  reset: () => Promise<void>;
  step: () => Promise<void>;
  toggleSimulate: () => void;
  setAlgorithm: (algo: string) => Promise<void>;
  setQuantum: (q: number) => Promise<void>;
  clearLogs: () => Promise<void>;
}

const Ctx = createContext<OSContextType | null>(null);

export const useOS = () => {
  const context = useContext(Ctx);
  if (!context) {
    throw new Error('useOS must be used within an OSProvider');
  }
  return context;
};

export const OSProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [procs, setProcs] = useState<Process[]>(seed);
  const [tick, setTick] = useState<number>(0);
  const nextPid = useRef(109);
  const [logs, setLogs] = useState<KernelLog[]>([
    { id: 1, lvl: 'INFO', msg: 'Kernel booted · PID 1 systemd online', t: Date.now() },
    { id: 2, lvl: 'INFO', msg: 'Process management & fork tree subsystem ready', t: Date.now() },
  ]);
  const [backendOnline, setBackendOnline] = useState<boolean>(false);
  const [algorithm, setAlgorithmState] = useState<string>('ROUND_ROBIN');
  const [quantum, setQuantumState] = useState<number>(4);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  const addLog = useCallback((lvl: KernelLog['lvl'], msg: string) => {
    setLogs((l) => [{ id: Math.random(), lvl, msg, t: Date.now() }, ...l].slice(0, 80));
  }, []);

  // Fetch initial state from backend
  const syncWithBackend = useCallback(async () => {
    try {
      const [backendProcs, simStatus, backendLogs] = await Promise.all([
        api.getProcesses(),
        api.getSimulationStatus(),
        api.getLogs(),
      ]);
      setProcs(backendProcs);
      setTick(simStatus.tick);
      setAlgorithmState(simStatus.algorithm || 'ROUND_ROBIN');
      setQuantumState(simStatus.quantum || 4);
      if (backendLogs && backendLogs.length > 0) {
        setLogs(backendLogs);
      }
      setBackendOnline(true);
    } catch {
      // Backend not yet reached, keep optimistic local state
      setBackendOnline(false);
    }
  }, []);

  useEffect(() => {
    syncWithBackend();
    const interval = setInterval(syncWithBackend, 4000);
    return () => clearInterval(interval);
  }, [syncWithBackend]);

  // Clock tick timer
  useEffect(() => {
    const id = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto simulation loop
  useEffect(() => {
    if (!isSimulating) return;
    const simInterval = setInterval(() => {
      step();
    }, 1200);
    return () => clearInterval(simInterval);
  }, [isSimulating]);

  const fork = async (ppid: number, opts: Partial<Process> = {}) => {
    const pid = nextPid.current++;
    const name = opts.name || (procs.find((p) => p.pid === ppid)?.name.split('-')[0] + '-' + pid) || `proc-${pid}`;
    const priority = opts.priority ?? (procs.find((p) => p.pid === ppid)?.priority ?? 5);
    const cpuBurst = opts.cpuBurst ?? (2 + Math.ceil(Math.random() * 14));
    const memoryMb = opts.memoryMb ?? (8 + Math.ceil(Math.random() * 60));

    // Optimistic local state update
    const newChild: Process = {
      pid,
      ppid,
      name,
      state: 'READY',
      priority,
      cpuBurst,
      totalBurst: cpuBurst,
      memoryMb,
      childrenPids: [],
      registers: {
        PC: `0x${(0x00400000 + pid * 0x100).toString(16).padStart(8, '0')}`,
        SP: `0x${(0x7ffd0000 + pid * 0x20).toString(16).padStart(8, '0')}`,
        RAX: `0x${((pid * 2654435761) >>> 0).toString(16).padStart(8, '0')}`,
        RBX: `0x${((pid * 40503) >>> 0).toString(16).padStart(8, '0')}`,
        RCX: `0x0000000${priority}`,
        RDX: `0x000000${memoryMb.toString(16).padStart(2, '0')}`,
        RIP: `0x${(0x00401000 + pid * 0x10).toString(16).padStart(8, '0')}`,
      },
    };

    setProcs((ps) => {
      return [...ps.map((p) => (p.pid === ppid ? { ...p, childrenPids: [...p.childrenPids, pid] } : p)), newChild];
    });
    addLog('INFO', `PID ${pid} (${name}) forked from parent PID ${ppid}`);

    // Sync with backend if online
    if (backendOnline) {
      try {
        const updated = await api.forkProcess(ppid, { name, priority, cpuBurst, memoryMb });
        setProcs(updated);
      } catch (err) {
        console.warn('Backend fork sync error:', err);
      }
    }
    return pid;
  };

  const setState = async (pid: number, state: ProcessState) => {
    setProcs((ps) =>
      ps.map((p) => (p.pid === pid ? { ...p, state, memoryMb: state === 'TERMINATED' ? 0 : p.memoryMb } : p))
    );
    addLog(state === 'TERMINATED' ? 'ERROR' : state === 'WAITING' ? 'WARN' : 'INFO', `PID ${pid} → ${state}`);

    if (backendOnline) {
      try {
        const updated = await api.updateState(pid, state);
        setProcs(updated);
      } catch (err) {
        console.warn('Backend updateState error:', err);
      }
    }
  };

  const kill = async (pid: number) => {
    if (pid === 1) {
      addLog('WARN', 'Refused SIGTERM to PID 1 (init / systemd)');
      return;
    }
    await setState(pid, 'TERMINATED');
    addLog('ERROR', `SIGTERM delivered to PID ${pid}`);

    if (backendOnline) {
      try {
        const updated = await api.terminateProcess(pid);
        setProcs(updated);
      } catch (err) {
        console.warn('Backend terminate error:', err);
      }
    }
  };

  const reap = async () => {
    setProcs((ps) => {
      const dead = new Set(ps.filter((p) => p.state === 'TERMINATED').map((p) => p.pid));
      return ps
        .filter((p) => !dead.has(p.pid))
        .map((p) => ({
          ...p,
          ppid: dead.has(p.ppid) ? 1 : p.ppid,
          childrenPids: p.childrenPids.filter((c) => !dead.has(c)),
        }));
    });
    addLog('INFO', 'Reaped zombie / terminated processes · orphans re-parented to PID 1');

    if (backendOnline) {
      try {
        const res = await api.reapTerminated();
        setProcs(res.processes);
      } catch (err) {
        console.warn('Backend reap error:', err);
      }
    }
  };

  const reset = async () => {
    setProcs(seed());
    nextPid.current = 109;
    setTick(0);
    addLog('INFO', 'Process table reset to default kernel init');

    if (backendOnline) {
      try {
        const updated = await api.resetInit();
        setProcs(updated);
      } catch (err) {
        console.warn('Backend reset error:', err);
      }
    }
  };

  const step = async () => {
    if (backendOnline) {
      try {
        const res = await api.stepSimulation();
        setProcs(res.processes);
        setTick(res.tick);
        if (res.logs && res.logs.length > 0) {
          setLogs(res.logs);
        }
        return;
      } catch (err) {
        console.warn('Backend step error, falling back locally:', err);
      }
    }

    // Local simulation fallback
    setTick((t) => t + 1);
    setProcs((ps) => {
      const alive = ps.filter((p) => p.state !== 'TERMINATED');
      let running = alive.find((p) => p.state === 'RUNNING' && p.pid !== 1) || alive.find((p) => p.state === 'RUNNING');
      const readyQueue = alive.filter((p) => p.state === 'READY');

      if (running) {
        const newBurst = Math.max(0, running.cpuBurst - 1);
        if (newBurst === 0) {
          addLog('ERROR', `PID ${running.pid} finished execution → TERMINATED`);
          return ps.map((p) =>
            p.pid === running!.pid ? { ...p, cpuBurst: 0, state: 'TERMINATED', memoryMb: 0 } : p
          );
        } else {
          return ps.map((p) => (p.pid === running!.pid ? { ...p, cpuBurst: newBurst } : p));
        }
      } else if (readyQueue.length > 0) {
        const next = readyQueue[0];
        addLog('INFO', `CPU Dispatcher scheduled PID ${next.pid} to Core 0`);
        return ps.map((p) => (p.pid === next.pid ? { ...p, state: 'RUNNING' } : p));
      }
      return ps;
    });
  };

  const toggleSimulate = () => {
    setIsSimulating((s) => !s);
  };

  const setAlgorithm = async (algo: string) => {
    setAlgorithmState(algo);
    addLog('INFO', `Scheduler algorithm changed to ${algo}`);
    if (backendOnline) {
      try {
        await api.configSimulation({ algorithm: algo });
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const setQuantum = async (q: number) => {
    setQuantumState(q);
    addLog('INFO', `Round Robin time quantum set to ${q}`);
    if (backendOnline) {
      try {
        await api.configSimulation({ quantum: q });
      } catch (err) {
        console.warn(err);
      }
    }
  };

  const clearLogs = async () => {
    setLogs([]);
    if (backendOnline) {
      try {
        await api.clearLogs();
      } catch (err) {
        console.warn(err);
      }
    }
  };

  return (
    <Ctx.Provider
      value={{
        procs,
        tick,
        logs,
        backendOnline,
        algorithm,
        quantum,
        isSimulating,
        fork,
        setState,
        kill,
        reap,
        reset,
        step,
        toggleSimulate,
        setAlgorithm,
        setQuantum,
        clearLogs,
      }}
    >
      {children}
    </Ctx.Provider>
  );
};
