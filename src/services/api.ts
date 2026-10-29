export interface Process {
  pid: number;
  ppid: number;
  name: string;
  state: 'RUNNING' | 'READY' | 'WAITING' | 'TERMINATED';
  priority: number;
  cpuBurst: number;
  totalBurst?: number;
  memoryMb: number;
  childrenPids: number[];
  registers?: {
    PC: string;
    SP: string;
    RAX: string;
    RBX: string;
    RCX: string;
    RDX: string;
    RIP: string;
  };
}

export interface KernelLog {
  id: number;
  lvl: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
  msg: string;
  t: number;
}

export interface SimulationStatus {
  tick: number;
  algorithm: string;
  quantum: number;
  quantumRemaining: number;
  isRunning: boolean;
  cpuLoad: number;
  memoryUsedMb: number;
  counts: Record<string, number>;
  runningProcess: Process | null;
  readyQueue: Process[];
  waitingQueue: Process[];
  totalProcesses: number;
  activeProcesses: number;
}

let currentApiBase = 'http://127.0.0.1:8000/api';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const tryFetch = async (base: string) => {
    const res = await fetch(`${base}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      let errorMsg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        errorMsg = errJson.error || errJson.message || errorMsg;
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }
    currentApiBase = base;
    return res.json() as Promise<T>;
  };

  try {
    return await tryFetch(currentApiBase);
  } catch (err) {
    const alt = currentApiBase.includes('8000') ? 'http://127.0.0.1:8008/api' : 'http://127.0.0.1:8000/api';
    return await tryFetch(alt);
  }
}

export const api = {
  getProcesses: () => request<Process[]>('/processes/'),
  
  createProcess: (data: { name: string; ppid: number; priority: number; cpuBurst: number; memoryMb?: number }) =>
    request<Process[]>('/processes/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  forkProcess: (pid: number, data: Partial<Process> = {}) =>
    request<Process[]>(`/processes/${pid}/fork/`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  updateState: (pid: number, state: string) =>
    request<Process[]>(`/processes/${pid}/state/`, {
      method: 'PATCH',
      body: JSON.stringify({ state }),
    }),

  terminateProcess: (pid: number) =>
    request<Process[]>(`/processes/${pid}/terminate/`, {
      method: 'POST',
    }),

  reapTerminated: () =>
    request<{ reaped: number; processes: Process[] }>('/processes/reap/', {
      method: 'POST',
    }),

  resetInit: () =>
    request<Process[]>('/processes/reset/', {
      method: 'POST',
    }),

  getSimulationStatus: () => request<SimulationStatus>('/simulation/'),

  stepSimulation: () =>
    request<{ tick: number; processes: Process[]; logs: KernelLog[] }>('/simulation/step/', {
      method: 'POST',
    }),

  configSimulation: (data: { algorithm?: string; quantum?: number }) =>
    request<{ algorithm: string; quantum: number; quantumRemaining: number }>('/simulation/config/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  getLogs: () => request<KernelLog[]>('/logs/'),

  clearLogs: () => request<{ message: string }>('/logs/', { method: 'DELETE' }),

  getStateFlowData: () =>
    request<{
      counts: Record<string, number>;
      transitions: Array<{ from: string; to: string; trigger: string; description: string }>;
      processes: Process[];
    }>('/state-flow/'),

  runBenchmark: (data: { algorithm: string; processes: any[]; quantum?: number }) =>
    request<{
      timeline: Array<{ pid: number; name: string; start: number; end: number; color: string }>;
      results: Array<any>;
      avgTAT: number;
      avgWT: number;
      avgRT?: number;
      cpuUtilization: number;
      totalTime: number;
      throughput?: number;
    }>('/simulation/benchmark/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  compareAlgorithms: (data: { processes: any[]; quantum?: number }) =>
    request<{
      algorithms: string[];
      comparisons: Record<string, {
        algorithm: string;
        timeline: Array<any>;
        results: Array<any>;
        avgTAT: number;
        avgWT: number;
        avgRT: number;
        cpuUtilization: number;
        totalTime: number;
        throughput: number;
      }>;
    }>('/simulation/compare/', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
