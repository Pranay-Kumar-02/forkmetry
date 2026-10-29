import { SchedulingAlgorithm, SchedulingProcessInput, GanttBlock, ProcessMetrics, SimulationSummary } from '../types/process';

export interface DecisionLogEntry {
  time: number;
  selectedPid: number | 'IDLE';
  selectedName: string;
  reason: string;
  readyQueueSnapshot: { pid: number; name: string; metricValue: string | number }[];
  contextSwitch: boolean;
}

export interface DetailedSimulationSummary extends SimulationSummary {
  decisions: DecisionLogEntry[];
  idleTime: number;
  busyTime: number;
}

export function runSchedulingSimulation(
  algorithm: SchedulingAlgorithm,
  processes: SchedulingProcessInput[],
  timeQuantum: number = 2
): DetailedSimulationSummary {
  if (processes.length === 0) {
    return {
      algorithm,
      ganttChart: [],
      processMetrics: [],
      avgWaitingTime: 0,
      avgTurnaroundTime: 0,
      avgResponseTime: 0,
      cpuUtilization: 0,
      throughput: 0,
      totalTime: 0,
      decisions: [],
      idleTime: 0,
      busyTime: 0,
    };
  }

  // Deep clone to avoid mutating inputs
  const procList = processes.map(p => ({
    ...p,
    burstTime: Math.max(1, p.burstTime),
    remainingTime: Math.max(1, p.burstTime),
    completionTime: 0,
    firstResponseTime: -1,
  }));

  const rawGantt: { pid: number | 'IDLE'; time: number }[] = [];
  const decisions: DecisionLogEntry[] = [];
  let currentTime = 0;
  const n = procList.length;
  let completed = 0;
  let previousPid: number | 'IDLE' = 'IDLE';

  if (algorithm === 'FCFS') {
    // Sort strictly by arrival time, then PID
    const sorted = [...procList].sort((a, b) => a.arrivalTime - b.arrivalTime || a.pid - b.pid);

    for (const p of sorted) {
      if (currentTime < p.arrivalTime) {
        decisions.push({
          time: currentTime,
          selectedPid: 'IDLE',
          selectedName: 'CPU Idle',
          reason: `No process has arrived yet at time ${currentTime}. Next arrival is PID ${p.pid} (${p.name}) at time ${p.arrivalTime}.`,
          readyQueueSnapshot: [],
          contextSwitch: previousPid !== 'IDLE',
        });
        for (let t = currentTime; t < p.arrivalTime; t++) {
          rawGantt.push({ pid: 'IDLE', time: t });
        }
        currentTime = p.arrivalTime;
        previousPid = 'IDLE';
      }

      p.firstResponseTime = currentTime;
      const isSwitch = previousPid !== p.pid;
      decisions.push({
        time: currentTime,
        selectedPid: p.pid,
        selectedName: p.name,
        reason: `FCFS policy: PID ${p.pid} was first in arrival queue (arrived at t=${p.arrivalTime}). Assigned CPU for full burst of ${p.burstTime} ticks.`,
        readyQueueSnapshot: sorted.filter(x => x.arrivalTime <= currentTime && x.remainingTime > 0).map(x => ({ pid: x.pid, name: x.name, metricValue: `AT: ${x.arrivalTime}` })),
        contextSwitch: isSwitch,
      });

      for (let t = 0; t < p.burstTime; t++) {
        rawGantt.push({ pid: p.pid, time: currentTime + t });
      }
      currentTime += p.burstTime;
      p.completionTime = currentTime;
      p.remainingTime = 0;
      previousPid = p.pid;
    }
  } else if (algorithm === 'SJF') {
    // Non-preemptive Shortest Job First
    while (completed < n) {
      const available = procList.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);

      if (available.length === 0) {
        const nextArr = Math.min(...procList.filter(p => p.remainingTime > 0).map(p => p.arrivalTime));
        decisions.push({
          time: currentTime,
          selectedPid: 'IDLE',
          selectedName: 'CPU Idle',
          reason: `Ready queue empty. CPU idling until next process arrives at t=${nextArr}.`,
          readyQueueSnapshot: [],
          contextSwitch: previousPid !== 'IDLE',
        });
        while (currentTime < nextArr) {
          rawGantt.push({ pid: 'IDLE', time: currentTime });
          currentTime++;
        }
        previousPid = 'IDLE';
        continue;
      }

      // Pick shortest burst time (tie-breaker: arrival time, then PID)
      available.sort((a, b) => a.burstTime - b.burstTime || a.arrivalTime - b.arrivalTime || a.pid - b.pid);
      const chosen = available[0];

      chosen.firstResponseTime = currentTime;
      decisions.push({
        time: currentTime,
        selectedPid: chosen.pid,
        selectedName: chosen.name,
        reason: `SJF (Non-preemptive): PID ${chosen.pid} selected with shortest burst time (${chosen.burstTime} ticks).`,
        readyQueueSnapshot: available.map(x => ({ pid: x.pid, name: x.name, metricValue: `BT: ${x.burstTime}` })),
        contextSwitch: previousPid !== chosen.pid,
      });

      for (let t = 0; t < chosen.burstTime; t++) {
        rawGantt.push({ pid: chosen.pid, time: currentTime + t });
      }
      currentTime += chosen.burstTime;
      chosen.completionTime = currentTime;
      chosen.remainingTime = 0;
      completed++;
      previousPid = chosen.pid;
    }
  } else if (algorithm === 'SRTF') {
    // Preemptive Shortest Remaining Time First
    const maxTime = 10000;
    while (completed < n && currentTime < maxTime) {
      const available = procList.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);

      if (available.length === 0) {
        rawGantt.push({ pid: 'IDLE', time: currentTime });
        if (previousPid !== 'IDLE') {
          decisions.push({
            time: currentTime,
            selectedPid: 'IDLE',
            selectedName: 'CPU Idle',
            reason: `No active tasks ready in memory. CPU idling at tick ${currentTime}.`,
            readyQueueSnapshot: [],
            contextSwitch: true,
          });
        }
        previousPid = 'IDLE';
        currentTime++;
        continue;
      }

      available.sort((a, b) => a.remainingTime - b.remainingTime || a.arrivalTime - b.arrivalTime || a.pid - b.pid);
      const chosen = available[0];

      if (chosen.firstResponseTime === -1) {
        chosen.firstResponseTime = currentTime;
      }

      if (previousPid !== chosen.pid) {
        decisions.push({
          time: currentTime,
          selectedPid: chosen.pid,
          selectedName: chosen.name,
          reason: `SRTF Dispatch: PID ${chosen.pid} has shortest remaining burst (${chosen.remainingTime} ticks) among ${available.length} ready tasks.${previousPid !== 'IDLE' && previousPid !== chosen.pid ? ` Preempted PID ${previousPid}.` : ''}`,
          readyQueueSnapshot: available.map(x => ({ pid: x.pid, name: x.name, metricValue: `Rem: ${x.remainingTime}` })),
          contextSwitch: previousPid !== chosen.pid,
        });
      }

      rawGantt.push({ pid: chosen.pid, time: currentTime });
      chosen.remainingTime--;
      currentTime++;
      previousPid = chosen.pid;

      if (chosen.remainingTime === 0) {
        chosen.completionTime = currentTime;
        completed++;
      }
    }
  } else if (algorithm === 'RR') {
    // Round Robin with Quantum
    const queue: typeof procList = [];
    const inQueue = new Set<number>();
    let time = 0;
    const q = Math.max(1, timeQuantum);

    const checkArrivals = (t: number, excludePid?: number) => {
      procList.forEach(p => {
        if (p.arrivalTime <= t && p.remainingTime > 0 && !inQueue.has(p.pid) && p.pid !== excludePid) {
          queue.push(p);
          inQueue.add(p.pid);
        }
      });
    };

    checkArrivals(time);

    while (completed < n && time < 10000) {
      if (queue.length === 0) {
        const unstarted = procList.filter(p => p.remainingTime > 0);
        if (unstarted.length === 0) break;
        const nextArrival = Math.min(...unstarted.map(p => p.arrivalTime));

        decisions.push({
          time,
          selectedPid: 'IDLE',
          selectedName: 'CPU Idle',
          reason: `Round Robin run queue exhausted. Idling until tick ${nextArrival}.`,
          readyQueueSnapshot: [],
          contextSwitch: previousPid !== 'IDLE',
        });

        while (time < nextArrival) {
          rawGantt.push({ pid: 'IDLE', time });
          time++;
        }
        previousPid = 'IDLE';
        checkArrivals(time);
        continue;
      }

      const current = queue.shift()!;
      inQueue.delete(current.pid);

      if (current.firstResponseTime === -1) {
        current.firstResponseTime = time;
      }

      const execDuration = Math.min(q, current.remainingTime);
      decisions.push({
        time,
        selectedPid: current.pid,
        selectedName: current.name,
        reason: `Round Robin slice: PID ${current.pid} dispatched for quantum slice of ${execDuration} tick(s) (remaining before slice: ${current.remainingTime}).`,
        readyQueueSnapshot: queue.map(x => ({ pid: x.pid, name: x.name, metricValue: `Rem: ${x.remainingTime}` })),
        contextSwitch: previousPid !== current.pid,
      });

      for (let i = 0; i < execDuration; i++) {
        rawGantt.push({ pid: current.pid, time: time + i });
        checkArrivals(time + i + 1, current.pid);
      }

      time += execDuration;
      current.remainingTime -= execDuration;
      previousPid = current.pid;

      if (current.remainingTime === 0) {
        current.completionTime = time;
        completed++;
      } else {
        checkArrivals(time, current.pid);
        queue.push(current);
        inQueue.add(current.pid);
      }
    }
    currentTime = time;
  } else if (algorithm === 'PRIORITY') {
    // Non-preemptive Priority (Lower number = Higher Priority)
    while (completed < n) {
      const available = procList.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);

      if (available.length === 0) {
        const nextArr = Math.min(...procList.filter(p => p.remainingTime > 0).map(p => p.arrivalTime));
        decisions.push({
          time: currentTime,
          selectedPid: 'IDLE',
          selectedName: 'CPU Idle',
          reason: `No ready tasks. CPU idling until arrival at tick ${nextArr}.`,
          readyQueueSnapshot: [],
          contextSwitch: previousPid !== 'IDLE',
        });
        while (currentTime < nextArr) {
          rawGantt.push({ pid: 'IDLE', time: currentTime });
          currentTime++;
        }
        previousPid = 'IDLE';
        continue;
      }

      available.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime || a.pid - b.pid);
      const chosen = available[0];

      chosen.firstResponseTime = currentTime;
      decisions.push({
        time: currentTime,
        selectedPid: chosen.pid,
        selectedName: chosen.name,
        reason: `Priority (Non-preemptive): PID ${chosen.pid} selected with highest priority level ${chosen.priority} (burst: ${chosen.burstTime} ticks).`,
        readyQueueSnapshot: available.map(x => ({ pid: x.pid, name: x.name, metricValue: `Prio: ${x.priority}` })),
        contextSwitch: previousPid !== chosen.pid,
      });

      for (let t = 0; t < chosen.burstTime; t++) {
        rawGantt.push({ pid: chosen.pid, time: currentTime + t });
      }
      currentTime += chosen.burstTime;
      chosen.completionTime = currentTime;
      chosen.remainingTime = 0;
      completed++;
      previousPid = chosen.pid;
    }
  } else if (algorithm === 'PRIORITY_PREEMPTIVE') {
    // Preemptive Priority
    const maxTime = 10000;
    while (completed < n && currentTime < maxTime) {
      const available = procList.filter(p => p.arrivalTime <= currentTime && p.remainingTime > 0);

      if (available.length === 0) {
        rawGantt.push({ pid: 'IDLE', time: currentTime });
        if (previousPid !== 'IDLE') {
          decisions.push({
            time: currentTime,
            selectedPid: 'IDLE',
            selectedName: 'CPU Idle',
            reason: `No processes ready. Core idling at tick ${currentTime}.`,
            readyQueueSnapshot: [],
            contextSwitch: true,
          });
        }
        previousPid = 'IDLE';
        currentTime++;
        continue;
      }

      available.sort((a, b) => a.priority - b.priority || a.arrivalTime - b.arrivalTime || a.pid - b.pid);
      const chosen = available[0];

      if (chosen.firstResponseTime === -1) {
        chosen.firstResponseTime = currentTime;
      }

      if (previousPid !== chosen.pid) {
        decisions.push({
          time: currentTime,
          selectedPid: chosen.pid,
          selectedName: chosen.name,
          reason: `Preemptive Priority Dispatch: PID ${chosen.pid} has highest priority (${chosen.priority}) in ready queue.${previousPid !== 'IDLE' && previousPid !== chosen.pid ? ` Preempted PID ${previousPid}.` : ''}`,
          readyQueueSnapshot: available.map(x => ({ pid: x.pid, name: x.name, metricValue: `Prio: ${x.priority}` })),
          contextSwitch: previousPid !== chosen.pid,
        });
      }

      rawGantt.push({ pid: chosen.pid, time: currentTime });
      chosen.remainingTime--;
      currentTime++;
      previousPid = chosen.pid;

      if (chosen.remainingTime === 0) {
        chosen.completionTime = currentTime;
        completed++;
      }
    }
  }

  // Compress raw timeline into contiguous Gantt blocks
  const ganttChart: GanttBlock[] = [];
  if (rawGantt.length > 0) {
    let currentBlock = {
      pid: rawGantt[0].pid,
      startTime: 0,
      endTime: 1,
      duration: 1,
      processName: rawGantt[0].pid === 'IDLE' ? 'IDLE' : procList.find(p => p.pid === rawGantt[0].pid)?.name,
    };

    for (let i = 1; i < rawGantt.length; i++) {
      const item = rawGantt[i];
      if (item.pid === currentBlock.pid) {
        currentBlock.endTime++;
        currentBlock.duration++;
      } else {
        ganttChart.push(currentBlock);
        currentBlock = {
          pid: item.pid,
          startTime: i,
          endTime: i + 1,
          duration: 1,
          processName: item.pid === 'IDLE' ? 'IDLE' : procList.find(p => p.pid === item.pid)?.name,
        };
      }
    }
    ganttChart.push(currentBlock);
  }

  // Metrics
  const processMetrics: ProcessMetrics[] = procList.map(p => {
    const tat = p.completionTime - p.arrivalTime;
    const wt = tat - p.burstTime;
    const rt = (p.firstResponseTime !== -1 ? p.firstResponseTime : p.arrivalTime) - p.arrivalTime;
    return {
      pid: p.pid,
      name: p.name,
      arrivalTime: p.arrivalTime,
      burstTime: p.burstTime,
      priority: p.priority,
      completionTime: p.completionTime,
      turnaroundTime: Math.max(0, tat),
      waitingTime: Math.max(0, wt),
      responseTime: Math.max(0, rt),
    };
  });

  const totalTime = currentTime || 1;
  const busyTicks = rawGantt.filter(g => g.pid !== 'IDLE').length;
  const idleTicks = totalTime - busyTicks;
  const cpuUtilization = Number(((busyTicks / totalTime) * 100).toFixed(1));
  const throughput = Number((n / totalTime).toFixed(3));

  const avgWaitingTime = Number(
    (processMetrics.reduce((sum, p) => sum + p.waitingTime, 0) / n).toFixed(2)
  );
  const avgTurnaroundTime = Number(
    (processMetrics.reduce((sum, p) => sum + p.turnaroundTime, 0) / n).toFixed(2)
  );
  const avgResponseTime = Number(
    (processMetrics.reduce((sum, p) => sum + p.responseTime, 0) / n).toFixed(2)
  );

  return {
    algorithm,
    ganttChart,
    processMetrics,
    avgWaitingTime,
    avgTurnaroundTime,
    avgResponseTime,
    cpuUtilization,
    throughput,
    totalTime,
    decisions,
    idleTime: idleTicks,
    busyTime: busyTicks,
  };
}

/* =======================================================================
   Workload Presets & Export/Import Utilities
   ======================================================================= */

export interface WorkloadPreset {
  id: string;
  title: string;
  description: string;
  quantum: number;
  processes: SchedulingProcessInput[];
}

export const WORKLOAD_PRESETS: WorkloadPreset[] = [
  {
    id: 'standard-os-batch',
    title: 'Standard OS Mixed Workload',
    description: 'Realistic mix of short interactive tasks and longer batch computation jobs.',
    quantum: 3,
    processes: [
      { pid: 1, name: 'P1 (Compiler)', arrivalTime: 0, burstTime: 8, priority: 3, color: '#38bdf8' },
      { pid: 2, name: 'P2 (Web Server)', arrivalTime: 1, burstTime: 4, priority: 1, color: '#10b981' },
      { pid: 3, name: 'P3 (DB Engine)', arrivalTime: 2, burstTime: 9, priority: 4, color: '#f59e0b' },
      { pid: 4, name: 'P4 (Audio Sync)', arrivalTime: 3, burstTime: 3, priority: 2, color: '#ec4899' },
      { pid: 5, name: 'P5 (Telemetry)', arrivalTime: 4, burstTime: 5, priority: 5, color: '#8b5cf6' },
    ],
  },
  {
    id: 'convoy-effect',
    title: 'Convoy Effect Demonstration',
    description: 'A massive CPU-bound task arrives first, blocking short tasks in FCFS.',
    quantum: 4,
    processes: [
      { pid: 1, name: 'P1 (Heavy Render)', arrivalTime: 0, burstTime: 24, priority: 5, color: '#f43f5e' },
      { pid: 2, name: 'P2 (Keystroke)', arrivalTime: 1, burstTime: 2, priority: 2, color: '#10b981' },
      { pid: 3, name: 'P3 (Mouse Event)', arrivalTime: 2, burstTime: 1, priority: 1, color: '#38bdf8' },
      { pid: 4, name: 'P4 (Network Ping)', arrivalTime: 3, burstTime: 2, priority: 3, color: '#a78bfa' },
    ],
  },
  {
    id: 'short-job-starvation',
    title: 'SJF / Priority Starvation Test',
    description: 'Continuous streams of short/high-priority tasks starving longer tasks.',
    quantum: 2,
    processes: [
      { pid: 1, name: 'P1 (Backup Daemon)', arrivalTime: 0, burstTime: 18, priority: 9, color: '#64748b' },
      { pid: 2, name: 'P2 (API Req 1)', arrivalTime: 1, burstTime: 3, priority: 2, color: '#38bdf8' },
      { pid: 3, name: 'P3 (API Req 2)', arrivalTime: 3, burstTime: 2, priority: 1, color: '#10b981' },
      { pid: 4, name: 'P4 (API Req 3)', arrivalTime: 5, burstTime: 3, priority: 2, color: '#06b6d4' },
      { pid: 5, name: 'P5 (API Req 4)', arrivalTime: 7, burstTime: 2, priority: 1, color: '#f59e0b' },
    ],
  },
  {
    id: 'idle-gap-scenario',
    title: 'Sparse Workload with CPU Idle Windows',
    description: 'Processes arrive with gaps in time to test idle state detection.',
    quantum: 3,
    processes: [
      { pid: 1, name: 'P1 (Init Job)', arrivalTime: 0, burstTime: 3, priority: 2, color: '#38bdf8' },
      { pid: 2, name: 'P2 (Delayed Cron)', arrivalTime: 8, burstTime: 4, priority: 1, color: '#10b981' },
      { pid: 3, name: 'P3 (Late Worker)', arrivalTime: 16, burstTime: 5, priority: 3, color: '#f59e0b' },
    ],
  },
];

export function exportWorkloadToJSON(processes: SchedulingProcessInput[], quantum: number): string {
  return JSON.stringify({ version: 'forkmetry-v1', quantum, processes }, null, 2);
}

export function exportMetricsToCSV(summary: SimulationSummary): string {
  const headers = ['PID', 'Process Name', 'Arrival Time', 'Burst Time', 'Priority', 'Completion Time (CT)', 'Turnaround Time (TAT)', 'Waiting Time (WT)', 'Response Time (RT)'];
  const rows = summary.processMetrics.map(p => [
    p.pid,
    `"${p.name}"`,
    p.arrivalTime,
    p.burstTime,
    p.priority,
    p.completionTime,
    p.turnaroundTime,
    p.waitingTime,
    p.responseTime,
  ]);
  const summaryRows = [
    [],
    ['--- SUMMARY METRICS ---'],
    ['Algorithm', summary.algorithm],
    ['Average Turnaround Time', summary.avgTurnaroundTime],
    ['Average Waiting Time', summary.avgWaitingTime],
    ['Average Response Time', summary.avgResponseTime],
    ['CPU Utilization (%)', `${summary.cpuUtilization}%`],
    ['Throughput (proc/tick)', summary.throughput],
    ['Total Simulation Time', summary.totalTime],
  ];

  return [headers.join(','), ...rows.map(r => r.join(',')), ...summaryRows.map(r => r.join(','))].join('\n');
}
