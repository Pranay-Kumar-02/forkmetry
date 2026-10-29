import React, { useState } from 'react';
import {
  ArrowRight,
  Sparkles,
  HelpCircle,
  Play,
  RotateCcw,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
} from 'lucide-react';
import { useOS, COLOR, ProcessState, tint } from '../context/OSContext';
import { Glass, Eyebrow } from './Common';

interface TransitionInfo {
  name: string;
  from: ProcessState | 'NEW';
  to: ProcessState;
  actionName: string;
  syscall: string;
  description: string;
  kernelAction: string;
}

const TRANSITIONS: TransitionInfo[] = [
  {
    name: 'Admit',
    from: 'NEW',
    to: 'READY',
    actionName: 'Admit Process',
    syscall: 'fork() / execve()',
    description: 'Process is created, allocated a PCB, memory address space, and admitted into the Ready Queue.',
    kernelAction: 'Kernel assigns new PID, initializes registers (PC, SP), allocates page tables, and inserts PCB into scheduler ready queue.',
  },
  {
    name: 'Dispatch',
    from: 'READY',
    to: 'RUNNING',
    actionName: 'Dispatch to CPU',
    syscall: 'schedule() / context_switch()',
    description: 'CPU Scheduler selects the next highest priority or head process from the Ready Queue to execute on the CPU core.',
    kernelAction: 'Kernel restores CPU register state (PC, RAX, SP) from the process PCB, updates state to RUNNING, and starts execution.',
  },
  {
    name: 'Timer Interrupt',
    from: 'RUNNING',
    to: 'READY',
    actionName: 'Preempt (Time Slice Expired)',
    syscall: 'TIMER_IRQ (SIGALRM)',
    description: 'Hardware timer fires, time quantum expired in Round-Robin or higher priority task arrived.',
    kernelAction: 'Timer interrupt saves CPU registers to process PCB, changes state to READY, and re-inserts process at tail of Ready Queue.',
  },
  {
    name: 'I/O or Event Wait',
    from: 'RUNNING',
    to: 'WAITING',
    actionName: 'Wait for I/O / Event',
    syscall: 'read(), write(), waitpid(), sleep()',
    description: 'Process initiates an I/O operation or waits for an event/signal, relinquishing the CPU core voluntarily.',
    kernelAction: 'Kernel places process PCB on device wait queue, marks state as WAITING / BLOCKED, and calls scheduler to run another process.',
  },
  {
    name: 'I/O Completion',
    from: 'WAITING',
    to: 'READY',
    actionName: 'I/O Interrupt Finished',
    syscall: 'I/O Controller Hardware Interrupt',
    description: 'Hardware device finishes disk/network transfer, signaling CPU that data is available.',
    kernelAction: 'Interrupt service routine (ISR) removes PCB from device wait queue, moves it to Ready Queue, and marks state as READY.',
  },
  {
    name: 'Exit',
    from: 'RUNNING',
    to: 'TERMINATED',
    actionName: 'Exit / SIGTERM',
    syscall: 'exit(status) / kill(pid, SIGTERM)',
    description: 'Process finishes burst execution or receives a termination signal, entering Zombie/Terminated state.',
    kernelAction: 'Kernel deallocates process memory, closes file descriptors, keeps PCB entry for parent wait() exit code reaping.',
  },
];

export function ProcessStateFlowDiagram() {
  const { procs, setState, fork } = useOS();
  const [selectedTransition, setSelectedTransition] = useState<TransitionInfo | null>(TRANSITIONS[1]);
  const [activeHighlight, setActiveHighlight] = useState<string | null>(null);

  const alive = procs.filter((p) => p.state !== 'TERMINATED');
  const running = procs.find((p) => p.state === 'RUNNING' && p.pid !== 1) || procs.find((p) => p.state === 'RUNNING');
  const readyList = procs.filter((p) => p.state === 'READY');
  const waitingList = procs.filter((p) => p.state === 'WAITING');
  const terminatedList = procs.filter((p) => p.state === 'TERMINATED');

  const counts: Record<string, number> = {
    NEW: 0,
    READY: readyList.length,
    RUNNING: running ? 1 : 0,
    WAITING: waitingList.length,
    TERMINATED: terminatedList.length,
  };

  const handleTriggerTransition = (t: TransitionInfo) => {
    setActiveHighlight(t.name);
    setTimeout(() => setActiveHighlight(null), 1200);

    if (t.name === 'Admit') {
      fork(1, { name: 'worker-admit', priority: 6, cpuBurst: 8 });
    } else if (t.name === 'Dispatch') {
      if (readyList.length > 0) {
        // If someone is currently running, put them in ready
        if (running && running.pid !== 1) {
          setState(running.pid, 'READY');
        }
        setState(readyList[0].pid, 'RUNNING');
      }
    } else if (t.name === 'Timer Interrupt') {
      if (running && running.pid !== 1) {
        setState(running.pid, 'READY');
      }
    } else if (t.name === 'I/O or Event Wait') {
      if (running && running.pid !== 1) {
        setState(running.pid, 'WAITING');
      }
    } else if (t.name === 'I/O Completion') {
      if (waitingList.length > 0) {
        setState(waitingList[0].pid, 'READY');
      }
    } else if (t.name === 'Exit') {
      if (running && running.pid !== 1) {
        setState(running.pid, 'TERMINATED');
      } else if (readyList.length > 0) {
        setState(readyList[0].pid, 'TERMINATED');
      }
    }
  };

  return (
    <Glass className="rise" style={{ padding: 22, display: 'grid', gap: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <Eyebrow>OS Kernel Theoretical Model · 5-State Architecture</Eyebrow>
          <h3 className="serif" style={{ fontSize: 22, margin: '4px 0 0', fontWeight: 600 }}>
            Interactive Process Lifecycle & State Flow Diagram
          </h3>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className="mono" style={{ fontSize: 11, color: 'var(--ink-2)' }}>
            <Layers size={13} style={{ display: 'inline', verticalAlign: -2, marginRight: 4 }} />
            Active Tasks: <b>{alive.length}</b>
          </span>
          <span className="chip mono" style={{ background: 'rgba(27,35,64,.06)', fontSize: 11 }}>
            Single CPU Core Model
          </span>
        </div>
      </div>

      {/* Visual Interactive Diagram Canvas */}
      <div
        className="glass glass-strong"
        style={{
          position: 'relative',
          padding: '30px 20px',
          borderRadius: 20,
          background: 'rgba(255, 255, 255, 0.6)',
          overflowX: 'auto',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            minWidth: 780,
            gap: 16,
            position: 'relative',
          }}
        >
          {/* Node 1: NEW */}
          <div
            style={{
              flex: '0 0 110px',
              padding: '16px 12px',
              borderRadius: 16,
              textAlign: 'center',
              background: '#fff',
              border: '1.5px dashed rgba(27,35,64,0.2)',
              boxShadow: '0 8px 20px -10px rgba(40,50,90,0.15)',
            }}
          >
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 600 }}>
              STATE
            </div>
            <div className="serif" style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 6px' }}>
              NEW
            </div>
            <span className="chip mono" style={{ background: 'rgba(27,35,64,0.06)' }}>
              fork()
            </span>
          </div>

          {/* Transition: Admit */}
          <div style={{ display: 'grid', placeItems: 'center', gap: 4 }}>
            <button
              onClick={() => {
                setSelectedTransition(TRANSITIONS[0]);
                handleTriggerTransition(TRANSITIONS[0]);
              }}
              className="btn mono"
              style={{
                fontSize: 10,
                padding: '4px 10px',
                background: activeHighlight === 'Admit' ? '#ff7a59' : '#fff',
                color: activeHighlight === 'Admit' ? '#fff' : 'var(--ink)',
                borderColor: 'var(--edge)',
              }}
            >
              Admit →
            </button>
            <ArrowRight size={16} color="var(--ink-3)" />
          </div>

          {/* Node 2: READY */}
          <div
            style={{
              flex: '0 0 140px',
              padding: '18px 14px',
              borderRadius: 18,
              textAlign: 'center',
              background: '#fff',
              border: `2px solid ${tint(COLOR.READY, 0.4)}`,
              boxShadow: `0 12px 28px -14px ${COLOR.READY}`,
            }}
          >
            <div className="mono" style={{ fontSize: 11, color: COLOR.READY, fontWeight: 700 }}>
              READY QUEUE
            </div>
            <div className="serif" style={{ fontSize: 22, fontWeight: 700, margin: '2px 0 6px' }}>
              READY
            </div>
            <span
              className="chip mono"
              style={{
                background: tint(COLOR.READY, 0.12),
                color: COLOR.READY,
                fontWeight: 700,
                fontSize: 11,
              }}
            >
              <span className="dot" style={{ background: COLOR.READY }} />
              {counts.READY} queued
            </span>
          </div>

          {/* Dual Transitions: READY <-> RUNNING */}
          <div style={{ display: 'grid', placeItems: 'center', gap: 8 }}>
            {/* Dispatch */}
            <button
              onClick={() => {
                setSelectedTransition(TRANSITIONS[1]);
                handleTriggerTransition(TRANSITIONS[1]);
              }}
              className="btn mono"
              style={{
                fontSize: 10,
                padding: '4px 10px',
                background: activeHighlight === 'Dispatch' ? COLOR.RUNNING : '#fff',
                color: activeHighlight === 'Dispatch' ? '#fff' : COLOR.RUNNING,
                borderColor: tint(COLOR.RUNNING, 0.35),
                boxShadow: '0 4px 12px -6px rgba(14,165,233,0.3)',
              }}
            >
              Dispatch →
            </button>

            {/* Preempt */}
            <button
              onClick={() => {
                setSelectedTransition(TRANSITIONS[2]);
                handleTriggerTransition(TRANSITIONS[2]);
              }}
              className="btn mono"
              style={{
                fontSize: 10,
                padding: '3px 8px',
                background: activeHighlight === 'Timer Interrupt' ? COLOR.WAITING : '#fff',
                color: activeHighlight === 'Timer Interrupt' ? '#fff' : 'var(--ink-2)',
                borderColor: 'var(--hair)',
              }}
            >
              ← Timer Interrupt
            </button>
          </div>

          {/* Node 3: RUNNING (Core) */}
          <div
            style={{
              flex: '0 0 150px',
              padding: '20px 14px',
              borderRadius: 18,
              textAlign: 'center',
              background: '#fff',
              border: `2px solid ${tint(COLOR.RUNNING, 0.45)}`,
              boxShadow: `0 14px 34px -14px ${COLOR.RUNNING}`,
              position: 'relative',
            }}
          >
            <div className="mono" style={{ fontSize: 11, color: COLOR.RUNNING, fontWeight: 700 }}>
              CPU CORE 0
            </div>
            <div className="serif" style={{ fontSize: 22, fontWeight: 700, margin: '2px 0 6px' }}>
              RUNNING
            </div>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              {running ? (
                <span
                  className="chip mono"
                  style={{
                    background: tint(COLOR.RUNNING, 0.12),
                    color: COLOR.RUNNING,
                    fontWeight: 700,
                  }}
                >
                  <span className="dot pulse" style={{ background: COLOR.RUNNING }} />
                  PID {running.pid}
                </span>
              ) : (
                <span className="chip mono" style={{ background: 'rgba(27,35,64,0.06)' }}>
                  Idle
                </span>
              )}
            </div>
          </div>

          {/* Exit transition */}
          <div style={{ display: 'grid', placeItems: 'center', gap: 4 }}>
            <button
              onClick={() => {
                setSelectedTransition(TRANSITIONS[5]);
                handleTriggerTransition(TRANSITIONS[5]);
              }}
              className="btn mono"
              style={{
                fontSize: 10,
                padding: '4px 10px',
                background: activeHighlight === 'Exit' ? COLOR.TERMINATED : '#fff',
                color: activeHighlight === 'Exit' ? '#fff' : COLOR.TERMINATED,
                borderColor: tint(COLOR.TERMINATED, 0.35),
              }}
            >
              Exit / kill →
            </button>
            <ArrowRight size={16} color={COLOR.TERMINATED} />
          </div>

          {/* Node 5: TERMINATED */}
          <div
            style={{
              flex: '0 0 120px',
              padding: '16px 12px',
              borderRadius: 16,
              textAlign: 'center',
              background: '#fff',
              border: `1.5px solid ${tint(COLOR.TERMINATED, 0.3)}`,
              boxShadow: '0 8px 20px -10px rgba(244,63,94,0.15)',
            }}
          >
            <div className="mono" style={{ fontSize: 11, color: COLOR.TERMINATED, fontWeight: 700 }}>
              ZOMBIE / DEAD
            </div>
            <div className="serif" style={{ fontSize: 18, fontWeight: 700, margin: '2px 0 6px' }}>
              TERMINATED
            </div>
            <span
              className="chip mono"
              style={{
                background: tint(COLOR.TERMINATED, 0.12),
                color: COLOR.TERMINATED,
                fontWeight: 600,
              }}
            >
              {counts.TERMINATED} dead
            </span>
          </div>
        </div>

        {/* Lower Row: WAITING Node and connecting loops */}
        <div
          style={{
            marginTop: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          {/* Running -> Waiting arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => {
                setSelectedTransition(TRANSITIONS[3]);
                handleTriggerTransition(TRANSITIONS[3]);
              }}
              className="btn mono"
              style={{
                fontSize: 10,
                padding: '4px 10px',
                borderColor: tint(COLOR.WAITING, 0.4),
                color: COLOR.WAITING,
                background: activeHighlight === 'I/O or Event Wait' ? COLOR.WAITING : '#fff',
              }}
            >
              I/O / Syscall Wait ↴
            </button>
          </div>

          {/* Node 4: WAITING */}
          <div
            style={{
              width: 170,
              padding: '14px 16px',
              borderRadius: 18,
              textAlign: 'center',
              background: '#fff',
              border: `2px solid ${tint(COLOR.WAITING, 0.4)}`,
              boxShadow: `0 10px 26px -12px ${COLOR.WAITING}`,
            }}
          >
            <div className="mono" style={{ fontSize: 11, color: COLOR.WAITING, fontWeight: 700 }}>
              BLOCKED QUEUE
            </div>
            <div className="serif" style={{ fontSize: 20, fontWeight: 700, margin: '2px 0 4px' }}>
              WAITING
            </div>
            <span
              className="chip mono"
              style={{
                background: tint(COLOR.WAITING, 0.12),
                color: COLOR.WAITING,
                fontWeight: 700,
              }}
            >
              <span className="dot" style={{ background: COLOR.WAITING }} />
              {counts.WAITING} blocked
            </span>
          </div>

          {/* Waiting -> Ready arrow */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <button
              onClick={() => {
                setSelectedTransition(TRANSITIONS[4]);
                handleTriggerTransition(TRANSITIONS[4]);
              }}
              className="btn mono"
              style={{
                fontSize: 10,
                padding: '4px 10px',
                borderColor: tint(COLOR.READY, 0.4),
                color: COLOR.READY,
                background: activeHighlight === 'I/O Completion' ? COLOR.READY : '#fff',
              }}
            >
              ↳ I/O Complete (Wake up)
            </button>
          </div>
        </div>
      </div>

      {/* OS Transition Detail Inspector Card */}
      {selectedTransition && (
        <div
          className="glass pop"
          style={{
            padding: 18,
            borderRadius: 16,
            background: 'rgba(255,255,255,0.7)',
            display: 'grid',
            gridTemplateColumns: '1.2fr 1.8fr auto',
            gap: 16,
            alignItems: 'center',
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span className="dot" style={{ background: COLOR[selectedTransition.to] || '#3b82f6' }} />
              <Eyebrow>Selected OS Transition</Eyebrow>
            </div>
            <div className="serif" style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>
              {selectedTransition.name}: {selectedTransition.from} → {selectedTransition.to}
            </div>
            <div className="mono" style={{ fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }}>
              Syscall / Trigger: <b style={{ color: 'var(--ink)' }}>{selectedTransition.syscall}</b>
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, color: 'var(--ink-2)', lineHeight: 1.5 }}>
              {selectedTransition.description}
            </div>
            <div
              className="mono"
              style={{
                fontSize: 11,
                color: 'var(--ink)',
                background: 'rgba(27,35,64,0.04)',
                padding: '6px 10px',
                borderRadius: 8,
                marginTop: 6,
              }}
            >
              <b>Kernel Operation:</b> {selectedTransition.kernelAction}
            </div>
          </div>

          <div>
            <button
              className="btn btn-primary"
              onClick={() => handleTriggerTransition(selectedTransition)}
              style={{ whiteSpace: 'nowrap' }}
            >
              <Zap size={13} />
              Simulate: {selectedTransition.name}
            </button>
          </div>
        </div>
      )}
    </Glass>
  );
}
