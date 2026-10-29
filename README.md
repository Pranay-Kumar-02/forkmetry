# Forkmetry — OS Process Lifecycle, Fork Tree Lineage & CPU Scheduling Telemetry Studio

[![Version](https://img.shields.io/badge/version-2.0.0-0ea5e9.svg)](package.json)
[![Backend](https://img.shields.io/badge/backend-Django%205%20%7C%20DRF-10b981.svg)](backend/)
[![Frontend](https://img.shields.io/badge/frontend-React%2019%20%7C%20TypeScript%20%7C%20Vite-38bdf8.svg)](src/)
[![Styling](https://img.shields.io/badge/style-Cyber--Slate%20Engineering%20UI-a78bfa.svg)](src/index.css)
[![Tests](https://img.shields.io/badge/tests-21%20passed%20%28100%25%29-34d399.svg)](backend/api/tests.py)

**Forkmetry** is a full-stack, developer-grade Operating Systems simulation and telemetry studio. It provides real-time visualization of POSIX process trees, process lifecycle state machines, hardware Process Control Blocks (PCBs), CPU core registers, and comprehensive CPU scheduling algorithms (FCFS, SJF, SRTF, Round Robin, and Priority) with Gantt charts, step-by-step scheduling rationale, and head-to-head multi-algorithm benchmarking.

> **Note on Simulated Telemetry:**  
> Forkmetry operates an isolated, simulated OS kernel model designed for operating system education, systems engineering experimentation, and workload analysis. It deliberately simulates kernel behaviors (registers, interrupts, quantum slices, and page allocation) within a safe user-space model.

---

## 🌟 Key Modules & Capabilities

### 1. Overview Telemetry Dashboard
* **Live Kernel Telemetry:** Real-time clock counter (`HH:MM:SS`), active tick timer, active process count, and total allocated tasks.
* **Dual Radial Gauges:** SVG progress rings tracking **Core 0 CPU load percentage** and **Virtual memory consumption (MB / 1 GB)**.
* **Active CPU Core #0 Card:** Real-time Process Control Block (PCB) state showing live simulated x86_64 registers (`RIP`, `RSP`, `RAX`, `RBX`, `RCX`, `RDX`).
* **Scheduler Priority Queues:** Visual task stacks for **Ready Queue** and **Waiting (I/O Blocked)** tasks, sorted by priority.
* **Kernel Console (`dmesg` buffer):** Streaming kernel event log color-coded by severity (`[INFO]`, `[WARN]`, `[ERROR]`, `[SUCCESS]`) with single-click buffer clearing.
* **Simulation Quick Action Toolbar:** Play/Pause auto-scheduler clock, step single tick, switch scheduling policies (Round Robin, Preemptive Priority, FCFS, SJF), adjust Time Quantum slider, and reset kernel state.

### 2. Fork Tree Lineage Visualizer
* **Dual Rendering Modes (2D Hierarchy & 3D Crystal Lattice):**
  * **2D Canvas Hierarchy:** Smooth cubic Bézier lineage connectors, real-time node spotlighting/search, process cards with status chips, priority bars, and inline `Fork`, `State Cycle`, and `SIGTERM` triggers.
  * **3D Crystal Lattice:** Built with Three.js (`@react-three/fiber` & `@react-three/drei`), featuring floating icosahedron crystals sized proportionally to virtual memory, orbital glowing halo rings around `RUNNING` processes, full 360° OrbitControls, and auto-orbit camera rotation.
  * **Interactive Canvas Controls:** Zoom In (+10%), Zoom Out (-10%), Fit to View, and Camera Reset.

### 3. PCB Lifecycle Controller & 5-State Engine
* **OS 5-State Interactive Architecture:**
  $$\text{[NEW]} \xrightarrow{\text{Admit}} \text{[READY]} \xrightleftharpoons[\text{Timer IRQ}]{\text{Dispatch}} \text{[RUNNING]} \xrightarrow{\text{Exit}} \text{[TERMINATED]}$$
  $$\text{[RUNNING]} \xrightarrow{\text{I/O Wait}} \text{[WAITING]} \xrightarrow{\text{I/O Interrupt}} \text{[READY]}$$
* **Interactive Transition Triggers:** Step through transitions with real-time feedback and educational explainers detailing kernel register saves, page table allocation, and interrupt handler actions.
* **Process Table:** Filter by state (`ALL`, `RUNNING`, `READY`, `WAITING`, `TERMINATED`) with live count badges, search by PID/name, inline state modifications, and quick actions.
* **Zombie Reaping & Orphan Re-parenting:** Clean up terminated zombie processes via `reap()` and automatically re-parent orphaned child tasks to PID 1 (`init`/`systemd`).

### 4. Process Control Block (PCB) Inspector Drawer
* Slide-over inspection drawer for deep analysis of any selected process:
  * Process identity, Parent PID (`PPID`), lifecycle state, static priority, remaining CPU burst, and virtual address space.
  * Simulated CPU hardware registers: `RIP`, `RSP`, `RAX`, `RBX`, `RCX`, and `RDX`.
  * Open File Descriptors table (`0: stdin`, `1: stdout`, `2: stderr`, sockets, IPC pipes).
  * Active child lineage list.

### 5. CPU Scheduling Lab & Gantt Engine
* **Multi-Algorithm Support:**
  * **FCFS (First-Come, First-Served):** Non-preemptive queue based on arrival order.
  * **SJF (Shortest Job First):** Non-preemptive algorithm minimizing average waiting time.
  * **SRTF (Shortest Remaining Time First):** Preemptive SJF that preempts when shorter remaining burst jobs arrive.
  * **Round Robin (RR):** Fair preemptive time-sliced queue with configurable time quantum.
  * **Priority Scheduling:** Non-preemptive and preemptive priority queues (1 = Highest, 10 = Lowest).
* **Step-by-Step Decision Explainer:** Clear textual explanation for every scheduling tick (e.g. why a specific task was dispatched, preempted, or queued).
* **Workload Presets:** Instant loading for "Standard OS Batch", "Convoy Effect Demo", "Short Job Starvation", and "Idle Gap Scenarios".
* **Export Utilities:** Export scheduling metrics to CSV and full workload configurations to JSON.

### 6. Multi-Algorithm Scheduling Comparator (New Feature)
* **Concurrent Head-to-Head Benchmark:** Executes the exact same workload across all 5 algorithms simultaneously.
* **Podium Highlights:** Badges identifying minimum waiting time, fastest turnaround, quickest initial response, and peak CPU utilization.
* **Comparative Metric Bars:** Interactive visual charts comparing Turnaround Time, Waiting Time, Response Time, and CPU Utilization.
* **Exportable Benchmarks:** Download comprehensive comparative reports formatted in CSV for laboratory and academic review.

### 7. POSIX System Calls & Kernel Reference
* Interactive documentation and C code examples covering:
  * `fork()` process cloning semantics and return value bifurcation.
  * Process Control Block (PCB) structure in memory.
  * Zombie vs. Orphan lifecycle handling and `waitpid()`.
  * Context switching, register saving, and translation lookaside buffer (TLB) flushing.

---

## 📐 Mathematical Formulas

Forkmetry calculates all CPU scheduling metrics using standard Operating Systems formulas:

| Metric | Formula | Description |
|---|---|---|
| **Completion Time ($CT$)** | Time at which the process finishes execution | Instant when remaining burst time drops to 0 |
| **Turnaround Time ($TAT$)** | $TAT = CT - AT$ | Total elapsed time from process arrival to termination |
| **Waiting Time ($WT$)** | $WT = TAT - BT$ | Total time spent idling inside the Ready Queue |
| **Response Time ($RT$)** | $RT = \text{First Run Time} - AT$ | Time from arrival until the process first acquires the CPU core |
| **CPU Utilization** | $\frac{\text{Total Busy Time}}{\text{Total Simulation Duration}} \times 100\%$ | Proportion of clock ticks the CPU was actively executing tasks |
| **Throughput** | $\frac{N}{\text{Total Simulation Duration}}$ | Number of completed processes per simulation time unit |

---

## 🛠️ Architecture & Technology Stack

```
Forkmetry/
├── backend/                       # Django REST API Engine
│   ├── api/
│   │   ├── models.py              # Process, SimulationState, KernelLog
│   │   ├── services.py            # OS Scheduler, 5 algorithms, comparator, seed data
│   │   ├── views.py               # REST API endpoints & serialization
│   │   ├── urls.py                # API routing
│   │   └── tests.py               # Comprehensive 17-test verification suite
│   ├── backend/                   # Django settings, CORS, and root URL config
│   ├── manage.py
│   └── requirements.txt           # Python dependency specifications
│
├── src/                           # React 19 TypeScript Frontend
│   ├── components/
│   │   ├── Common.tsx             # Forkmetry logo, glass cards, gauges, sparklines
│   │   ├── OverviewDashboard.tsx  # Telemetry dashboard, core registers, dmesg
│   │   ├── ForkTree.tsx           # 2D SVG tree & 3D Three.js crystal canvas
│   │   ├── ProcessManager.tsx     # Process table, lifecycle tabs, reap actions
│   │   ├── ProcessStateFlowDiagram.tsx # OS 5-State interactive lifecycle engine
│   │   ├── CpuSchedulingLab.tsx   # Gantt chart timeline & decision explainer
│   │   ├── SchedulingComparator.tsx # Multi-algorithm head-to-head benchmark
│   │   ├── LearnSystemCalls.tsx   # POSIX system call reference manual
│   │   ├── Inspector.tsx          # PCB slide-over inspector drawer
│   │   └── CreateModal.tsx        # fork() + execve() spawn dialog
│   ├── context/
│   │   └── OSContext.tsx          # Global OS state provider with dual-mode fallback
│   ├── services/
│   │   └── api.ts                 # Typed API client with auto-discovery
│   ├── types/
│   │   └── process.ts             # TypeScript interface contracts
│   ├── utils/
│   │   └── schedulingAlgorithms.ts# Pure TypeScript scheduling engine & presets
│   ├── App.tsx                    # Main navigation shell & cyber-slate layout
│   └── index.css                  # Forkmetry Design System & CSS tokens
├── package.json
├── vite.config.js
└── README.md
```

---

## 🚀 Installation & Local Setup

### Prerequisites
* **Python**: Python 3.10+ (tested with Python 3.12)
* **Node.js**: Node 18+ (tested with Node v22.20.0 and npm 10.9.3)

---

### Step 1: Backend Setup (Django REST API)

1. Navigate to the `backend/` directory:
   ```bash
   cd backend
   ```

2. Create a virtual environment and activate it:
   * **Windows (PowerShell):**
     ```powershell
     python -m venv venv
     .\venv\Scripts\Activate.ps1
     ```
   * **Linux / macOS:**
     ```bash
     python3 -m venv venv
     source venv/bin/activate
     ```

3. Install required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

4. Apply database migrations:
   ```bash
   python manage.py migrate
   ```

5. Start the backend development server:
   ```bash
   # You can run on port 8000 (default) or 8008
   python manage.py runserver 127.0.0.1:8000
   ```
   *API will be available at: `http://127.0.0.1:8000/api/`*

---

### Step 2: Frontend Setup (React + Vite)

1. From the project root directory, install dependencies:
   ```bash
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```
   *Frontend application will open at: `http://127.0.0.1:5173/`*

3. (Optional) Build for production:
   ```bash
   npm run build
   ```

---

## 🧪 Testing

### Backend Test Suite
Run the full Django test suite covering all 5 scheduling algorithms, arrival gaps, ties, preemption, process lifecycle, zombie reaping, orphan reparenting, and REST endpoints:
```bash
python backend/manage.py test api
```
*All 17 unit and integration tests run in under 0.2 seconds.*

### Frontend Production Validation
Ensure zero type errors and successful bundle creation:
```bash
npm run build
```

---

## 🔌 Key API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/processes/` | Retrieve all processes with child PIDs and registers |
| `POST` | `/api/processes/` | Spawn a new process (`fork() + execve()`) |
| `POST` | `/api/processes/<pid>/fork/` | Fork a child process from specified parent PID |
| `PATCH` | `/api/processes/<pid>/state/` | Transition process state (`RUNNING`, `READY`, `WAITING`, `TERMINATED`) |
| `POST` | `/api/processes/<pid>/terminate/` | Deliver `SIGTERM` to process |
| `POST` | `/api/processes/reap/` | Reap terminated zombies & re-parent orphans to PID 1 |
| `POST` | `/api/processes/reset/` | Reset process table to initial kernel seed |
| `GET` | `/api/simulation/` | Get CPU load, queues, active tick counter, and Core 0 state |
| `POST` | `/api/simulation/step/` | Advance simulation by one clock tick |
| `POST` | `/api/simulation/config/` | Configure scheduling policy (`ROUND_ROBIN`, `PRIORITY`, `FCFS`, `SJF`) and quantum |
| `POST` | `/api/simulation/benchmark/` | Run scheduling calculation on custom process set |
| `POST` | `/api/simulation/compare/` | Concurrent multi-algorithm benchmark across all 5 policies |
| `GET` | `/api/state-flow/` | 5-State lifecycle diagram counts and transition definitions |
| `GET` / `DELETE` | `/api/logs/` | Stream or clear kernel `dmesg` event logs |

---

## 📜 Attribution, Provenance & License

- **Developer & Maintainer:** Pranay Kumar Vonamala
- **Reference Heritage:** Forkmetry is derived, expanded, and substantially re-architected from the open-source reference project [`fork-tree-visualizer`](https://github.com/ajiteshmohan/fork-tree-visualizer) by Ajitesh Mohan.
- **Original Enhancements in Forkmetry:** Cyber-Slate Engineering Design System, dedicated Multi-Algorithm Scheduling Comparator, step-by-step scheduler decision explainers, workload presets, export/import features, dual-port fallback client, independent tree layout engine, and an expanded 21-test verification suite.
- **License:** Licensed under the [MIT License](LICENSE). Portions Copyright (c) 2026 Ajitesh Mohan.
