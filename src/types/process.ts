export type ProcessState = 'ready' | 'running' | 'waiting' | 'terminated' | 'zombie';

export interface PCB {
  pid: number;
  ppid: number;
  name: string;
  state: ProcessState;
  priority: number; // 1 to 10 (1 is highest)
  arrivalTime: number;
  burstTime: number;
  remainingTime: number;
  memoryMB: number;
  programCounter: string;
  registers: {
    rax: string;
    rbx: string;
    rcx: string;
    rsp: string;
  };
  openFiles: string[];
  createdAt: number;
  children: number[];
  exitCode?: number;
  isOrphan?: boolean;
}

export type SchedulingAlgorithm = 'FCFS' | 'SJF' | 'SRTF' | 'RR' | 'PRIORITY' | 'PRIORITY_PREEMPTIVE';

export interface GanttBlock {
  pid: number | 'IDLE';
  processName?: string;
  startTime: number;
  endTime: number;
  duration: number;
}

export interface SchedulingProcessInput {
  pid: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  color?: string;
}

export interface ProcessMetrics {
  pid: number;
  name: string;
  arrivalTime: number;
  burstTime: number;
  priority: number;
  completionTime: number;
  turnaroundTime: number;
  waitingTime: number;
  responseTime: number;
}

export interface SimulationSummary {
  algorithm: SchedulingAlgorithm;
  ganttChart: GanttBlock[];
  processMetrics: ProcessMetrics[];
  avgWaitingTime: number;
  avgTurnaroundTime: number;
  avgResponseTime: number;
  cpuUtilization: number;
  throughput: number;
  totalTime: number;
}

export interface TreeNode {
  pcb: PCB;
  children: TreeNode[];
  x?: number;
  y?: number;
  level?: number;
}
