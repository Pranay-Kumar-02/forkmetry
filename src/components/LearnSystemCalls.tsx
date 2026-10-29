import React, { useState } from 'react';
import { 
  BookOpen, 
  GitFork, 
  Cpu, 
  FileCode, 
  AlertTriangle, 
  Skull, 
  Layers, 
  CheckCircle2, 
  RefreshCw,
  Terminal,
  HelpCircle,
  Copy,
  Check
} from 'lucide-react';

export const LearnSystemCalls: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'fork' | 'pcb' | 'zombieOrphan' | 'contextSwitch' | 'wait'>('fork');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const handleCopy = (code: string, index: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="bg-[#0f172a]/90 backdrop-blur-sm border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center space-x-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-bold text-white tracking-tight">Operating Systems Knowledge Base & System Calls</h2>
        </div>
        <p className="text-xs text-slate-400 mt-1 max-w-3xl">
          Comprehensive developer reference explaining low-level POSIX process semantics, kernel state transitions, Process Control Blocks, and fork tree behaviors.
        </p>

        {/* Topic navigation tabs */}
        <div className="flex flex-wrap gap-2 mt-4 pt-3 border-t border-slate-800">
          {[
            { id: 'fork', label: 'fork() System Call', icon: GitFork },
            { id: 'pcb', label: 'PCB Anatomy', icon: Layers },
            { id: 'zombieOrphan', label: 'Zombies vs Orphans', icon: Skull },
            { id: 'contextSwitch', label: 'Context Switching', icon: Cpu },
            { id: 'wait', label: 'wait() & waitpid()', icon: RefreshCw },
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800 border border-transparent'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Section based on activeTab */}

      {/* TAB 1: fork() System Call */}
      {activeTab === 'fork' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Explanation */}
            <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-5 space-y-3">
              <h3 className="font-bold text-base text-white flex items-center space-x-2">
                <GitFork className="w-4 h-4 text-cyan-400" />
                <span>How <code className="text-cyan-400 font-mono">fork()</code> Works in Linux/UNIX</span>
              </h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                The <code className="font-mono text-cyan-300 bg-slate-900 px-1 py-0.5 rounded">fork()</code> system call creates a new process by duplicating the calling process. The calling process is referred to as the <strong>parent</strong>, and the newly allocated process is the <strong>child</strong>.
              </p>

              <div className="space-y-2 pt-2">
                <h4 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Crucial Properties</h4>
                <ul className="text-xs text-slate-400 space-y-2 list-disc list-inside">
                  <li>
                    <strong className="text-slate-200">Return Value Dualism:</strong> <code className="font-mono text-cyan-300">fork()</code> returns <strong>twice</strong>! It returns <code className="font-mono text-cyan-300">&gt; 0</code> (child's PID) to the parent, and <code className="font-mono text-cyan-300">0</code> to the child.
                  </li>
                  <li>
                    <strong className="text-slate-200">Copy-on-Write (COW):</strong> The child receives an exact duplicate of the parent's address space (text, data, heap, stack). Modern OS kernels use Copy-on-Write so physical memory pages are only duplicated when one process modifies them.
                  </li>
                  <li>
                    <strong className="text-slate-200">Inheritance:</strong> The child inherits open file descriptors, user credentials (UID/GID), working directory, and environment variables.
                  </li>
                </ul>
              </div>

              <div className="bg-cyan-950/30 border border-cyan-800/40 rounded-lg p-3 text-xs text-cyan-300 mt-2">
                <strong>Memory Note:</strong> Because child and parent run in independent address spaces, changing a variable in the child has <em>zero effect</em> on the parent process.
              </div>
            </div>

            {/* Code Snippet */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-col justify-between font-mono text-xs">
              <div>
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
                  <span className="text-slate-400 flex items-center space-x-1.5">
                    <FileCode className="w-3.5 h-3.5 text-cyan-400" />
                    <span>fork_example.c</span>
                  </span>
                  <button
                    onClick={() => handleCopy(`#include <stdio.h>\n#include <unistd.h>\n#include <sys/types.h>\n\nint main() {\n    pid_t pid = fork();\n\n    if (pid < 0) {\n        // Fork failed\n        perror("Fork failed");\n        return 1;\n    } else if (pid == 0) {\n        // Child process execution\n        printf("[Child] PID: %d, Parent PPID: %d\\n", getpid(), getppid());\n    } else {\n        // Parent process execution\n        printf("[Parent] PID: %d, Created Child PID: %d\\n", getpid(), pid);\n    }\n\n    return 0;\n}`, 1)}
                    className="flex items-center space-x-1 text-slate-400 hover:text-white text-[11px]"
                  >
                    {copiedIndex === 1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedIndex === 1 ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>

                <pre className="text-slate-300 leading-relaxed overflow-x-auto">
{`#include <stdio.h>
#include <unistd.h>
#include <sys/types.h>

int main() {
    pid_t pid = fork();

    if (pid < 0) {
        // Fork system call failed
        perror("Fork failed");
        return 1;
    } else if (pid == 0) {
        // CHILD PROCESS
        // Returns 0 in the child
        printf("[Child] PID: %d, PPID: %d\\n", 
               getpid(), getppid());
    } else {
        // PARENT PROCESS
        // Returns child's PID (> 0) to parent
        printf("[Parent] PID: %d, Child PID: %d\\n", 
               getpid(), pid);
    }

    return 0;
}`}
                </pre>
              </div>

              <div className="mt-4 pt-2 border-t border-slate-800 text-[11px] text-slate-500">
                Compile: <code className="text-slate-300">gcc fork_example.c -o fork_demo && ./fork_demo</code>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Process Control Block (PCB) */}
      {activeTab === 'pcb' && (
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div>
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Anatomy of a Process Control Block (PCB)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              In Linux, the PCB is implemented via the <code className="text-cyan-300 font-mono">struct task_struct</code> defined in <code className="text-slate-300 font-mono">&lt;linux/sched.h&gt;</code>. It represents the kernel's single source of truth for an executing task.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="text-xs font-mono font-bold text-cyan-400">1. Process Identifier (PID)</span>
              <p className="text-xs text-slate-300">
                Unique integer identifying the process. Also stores Parent PID (PPID), Process Group ID (PGID), and Session ID (SID).
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="text-xs font-mono font-bold text-emerald-400">2. Process State</span>
              <p className="text-xs text-slate-300">
                Current status: <code className="font-mono text-emerald-300">TASK_RUNNING</code>, <code className="font-mono text-cyan-300">TASK_INTERRUPTIBLE</code> (waiting), <code className="font-mono text-amber-300">TASK_UNINTERRUPTIBLE</code>, or <code className="font-mono text-pink-300">EXIT_ZOMBIE</code>.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="text-xs font-mono font-bold text-purple-400">3. Program Counter & Regs</span>
              <p className="text-xs text-slate-300">
                Address of the next CPU instruction to execute along with hardware registers (RAX, RBX, RSP, flags) saved during context switch.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="text-xs font-mono font-bold text-amber-400">4. Memory Management</span>
              <p className="text-xs text-slate-300">
                Points to page tables, virtual memory areas (VMAs), text, initialized data, BSS, memory-mapped files, heap, and user stack.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="text-xs font-mono font-bold text-pink-400">5. Accounting & Scheduling</span>
              <p className="text-xs text-slate-300">
                Scheduling class (CFS/Realtime), priority / nice value (-20 to +19), CPU time used, remaining quantum slice, arrival tick.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="text-xs font-mono font-bold text-blue-400">6. File Descriptor Table</span>
              <p className="text-xs text-slate-300">
                Array of pointers to open file table entries: FD 0 (stdin), FD 1 (stdout), FD 2 (stderr), network sockets, and pipes.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="text-xs font-mono font-bold text-teal-400">7. Parent / Children Pointers</span>
              <p className="text-xs text-slate-300">
                Doubly-linked list pointers to parent process, sibling processes, and list of child tasks for tree traversal.
              </p>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3 space-y-1">
              <span className="text-xs font-mono font-bold text-rose-400">8. Signal Handlers</span>
              <p className="text-xs text-slate-300">
                Mask of pending signals and dispatch table for signals like SIGINT, SIGTERM, SIGKILL, and SIGCHLD.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Zombies vs Orphans */}
      {activeTab === 'zombieOrphan' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Zombie */}
          <div className="bg-[#0f172a]/90 border border-pink-900/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <Skull className="w-5 h-5 text-pink-400" />
              <h3 className="font-bold text-base text-white">Zombie Process (Defunct)</h3>
            </div>
            <p className="text-xs text-slate-300">
              A <strong>zombie process</strong> is a process that has completed execution via <code className="font-mono text-cyan-300">exit()</code>, but its entry remains in the process table because its parent has <strong>not yet read its exit status</strong> using <code className="font-mono text-cyan-300">wait()</code> or <code className="font-mono text-cyan-300">waitpid()</code>.
            </p>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs">
              <span className="font-semibold text-pink-400">Key Characteristics:</span>
              <ul className="list-disc list-inside text-slate-400 space-y-1">
                <li>Consumes <strong>no CPU or physical memory</strong>, but holds an entry in the OS process table.</li>
                <li>If zombies accumulate, they can exhaust the maximum PID pool (<code className="font-mono text-slate-300">/proc/sys/kernel/pid_max</code>), preventing new processes from spawning!</li>
                <li><strong>How to fix:</strong> Parent must invoke <code className="font-mono text-cyan-300">wait()</code> or listen to <code className="font-mono text-slate-300">SIGCHLD</code>.</li>
              </ul>
            </div>
          </div>

          {/* Orphan */}
          <div className="bg-[#0f172a]/90 border border-amber-900/30 rounded-xl p-5 space-y-3">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <h3 className="font-bold text-base text-white">Orphan Process</h3>
            </div>
            <p className="text-xs text-slate-300">
              An <strong>orphan process</strong> is a process whose parent has terminated while the child is still actively running.
            </p>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-1.5 text-xs">
              <span className="font-semibold text-amber-400">Kernel Adoption:</span>
              <ul className="list-disc list-inside text-slate-400 space-y-1">
                <li>The Linux kernel automatically <strong>reparents</strong> orphaned processes to root: <strong className="text-cyan-300 font-mono">PID 1 (init / systemd)</strong>.</li>
                <li>PID 1 periodically executes <code className="font-mono text-cyan-300">wait()</code> to reap completed orphaned children, preventing permanent zombies.</li>
                <li>Orphan processes are intentionally used to create background system daemons!</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Context Switching */}
      {activeTab === 'contextSwitch' && (
        <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center space-x-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-base text-white">CPU Context Switching Mechanics</h3>
          </div>
          <p className="text-xs text-slate-300">
            A <strong>context switch</strong> is the computational procedure where the kernel stores the state of an active process and restores the saved state of another process so execution can resume from where it was suspended.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <span className="text-xs font-mono font-bold text-amber-400">Step 1: Save Outgoing PCB</span>
              <p className="text-xs text-slate-400 mt-1">
                Triggered by timer interrupt or I/O request. The kernel saves hardware registers (RAX, RBX, RSP), Program Counter (PC), and CPU flags into Process A's PCB.
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <span className="text-xs font-mono font-bold text-cyan-400">Step 2: Scheduler Selection</span>
              <p className="text-xs text-slate-400 mt-1">
                Scheduler algorithm (e.g., Round Robin, CFS, or Priority) evaluates the Ready Queue and picks the next candidate (Process B).
              </p>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-3">
              <span className="text-xs font-mono font-bold text-emerald-400">Step 3: Load Incoming PCB</span>
              <p className="text-xs text-slate-400 mt-1">
                Kernel swaps memory translation tables (CR3 register in x86), restores Process B's registers, and sets PC to resume Process B.
              </p>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-400">
            <strong className="text-white">Performance Note:</strong> Context switching incurs pure computational overhead (CPU cycles without productive work + CPU cache and TLB invalidation).
          </div>
        </div>
      )}

      {/* TAB 5: wait() and waitpid() */}
      {activeTab === 'wait' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-[#0f172a]/90 border border-slate-800 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-base text-white flex items-center space-x-2">
              <RefreshCw className="w-4 h-4 text-cyan-400" />
              <span>Reaping Children with <code className="text-cyan-400 font-mono">wait()</code> & <code className="text-cyan-400 font-mono">waitpid()</code></span>
            </h3>
            <p className="text-xs text-slate-300">
              When a child process terminates, the operating system releases its memory, files, and socket descriptors, but retains its PCB entry in the process table with its termination code.
            </p>
            <p className="text-xs text-slate-300">
              The parent calls <code className="text-cyan-300 font-mono">wait()</code> to block until <em>any</em> child terminates, or <code className="text-cyan-300 font-mono">waitpid(pid, &amp;status, options)</code> to wait for a <em>specific</em> child or check asynchronously with <code className="text-cyan-300 font-mono">WNOHANG</code>.
            </p>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs">
            <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800">
              <span className="text-slate-400">waitpid_demo.c</span>
              <button
                onClick={() => handleCopy(`#include <sys/wait.h>\n#include <unistd.h>\n#include <stdio.h>\n\nint main() {\n    pid_t pid = fork();\n    if (pid == 0) {\n        // Child terminates with status 42\n        _exit(42);\n    } else {\n        int status;\n        // Parent reaps zombie child\n        waitpid(pid, &status, 0);\n        if (WIFEXITED(status)) {\n            printf("Child exited with code: %d\\n", WEXITSTATUS(status));\n        }\n    }\n    return 0;\n}`, 2)}
                className="flex items-center space-x-1 text-slate-400 hover:text-white text-[11px]"
              >
                {copiedIndex === 2 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copiedIndex === 2 ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="text-slate-300 leading-relaxed overflow-x-auto">
{`#include <sys/wait.h>
#include <unistd.h>
#include <stdio.h>

int main() {
    pid_t child_pid = fork();

    if (child_pid == 0) {
        // Child exits with status 42
        _exit(42);
    } else {
        int status;
        // Parent waits specifically for child_pid
        // and reaps its PCB entry from process table
        waitpid(child_pid, &status, 0);

        if (WIFEXITED(status)) {
            printf("Child %d reaped! Exit code: %d\\n",
                   child_pid, WEXITSTATUS(status));
        }
    }
    return 0;
}`}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};
