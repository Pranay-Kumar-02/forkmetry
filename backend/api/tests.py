from django.test import TestCase, Client
from django.urls import reverse
from rest_framework import status
from .models import Process, SimulationState, KernelLog
from .services import (
    seed_default_processes,
    get_all_processes_data,
    fork_process,
    update_process_state,
    terminate_process,
    reap_terminated_processes,
    step_simulation,
    get_simulation_state,
    calculate_cpu_scheduling,
    calculate_all_comparisons,
)


class SchedulingAlgorithmTests(TestCase):
    """
    Independent mathematical verification of CPU Scheduling algorithms:
    FCFS, SJF, SRTF, Round Robin, and Priority.
    """

    def test_fcfs_scheduling_with_idle_gap(self):
        # Workload with arrival gap:
        # P1: AT=0, BT=3 -> runs [0, 3], CT=3, TAT=3, WT=0, RT=0
        # Idle: [3, 5]
        # P2: AT=5, BT=2 -> runs [5, 7], CT=7, TAT=2, WT=0, RT=0
        processes = [
            {'pid': 1, 'name': 'P1', 'arrivalTime': 0, 'burstTime': 3, 'priority': 1},
            {'pid': 2, 'name': 'P2', 'arrivalTime': 5, 'burstTime': 2, 'priority': 1},
        ]
        res = calculate_cpu_scheduling('FCFS', processes)
        self.assertEqual(res['totalTime'], 7)
        self.assertEqual(res['cpuUtilization'], round((5 / 7) * 100, 1))

        p1_res = next(p for p in res['results'] if p['pid'] == 1)
        self.assertEqual(p1_res['completionTime'], 3)
        self.assertEqual(p1_res['turnaroundTime'], 3)
        self.assertEqual(p1_res['waitingTime'], 0)
        self.assertEqual(p1_res['responseTime'], 0)

        p2_res = next(p for p in res['results'] if p['pid'] == 2)
        self.assertEqual(p2_res['completionTime'], 7)
        self.assertEqual(p2_res['turnaroundTime'], 2)
        self.assertEqual(p2_res['waitingTime'], 0)
        self.assertEqual(p2_res['responseTime'], 0)

    def test_sjf_non_preemptive(self):
        # P1: AT=0, BT=7 -> runs [0, 7], CT=7, TAT=7, WT=0
        # At t=7, both P2 (AT=2, BT=4) and P3 (AT=4, BT=1) are available.
        # P3 has shorter burst (1 < 4), so P3 runs [7, 8], CT=8, TAT=4, WT=3
        # Then P2 runs [8, 12], CT=12, TAT=10, WT=6
        processes = [
            {'pid': 1, 'name': 'P1', 'arrivalTime': 0, 'burstTime': 7, 'priority': 2},
            {'pid': 2, 'name': 'P2', 'arrivalTime': 2, 'burstTime': 4, 'priority': 1},
            {'pid': 3, 'name': 'P3', 'arrivalTime': 4, 'burstTime': 1, 'priority': 3},
        ]
        res = calculate_cpu_scheduling('SJF', processes)
        self.assertEqual(res['totalTime'], 12)

        p1 = next(p for p in res['results'] if p['pid'] == 1)
        p2 = next(p for p in res['results'] if p['pid'] == 2)
        p3 = next(p for p in res['results'] if p['pid'] == 3)

        self.assertEqual(p1['completionTime'], 7)
        self.assertEqual(p3['completionTime'], 8)
        self.assertEqual(p2['completionTime'], 12)

        self.assertEqual(p1['waitingTime'], 0)
        self.assertEqual(p3['waitingTime'], 3)
        self.assertEqual(p2['waitingTime'], 6)

    def test_srtf_preemptive(self):
        # P1: AT=0, BT=8
        # At t=1, P2 arrives with BT=4.
        # P1 remaining is 7. P2 remaining is 4. P2 < P1 -> P1 preempted!
        # P2 runs from t=1 to t=5 (CT=5, TAT=4, WT=0)
        # P1 resumes at t=5 and finishes at t=12 (CT=12, TAT=12, WT=4)
        processes = [
            {'pid': 1, 'name': 'P1', 'arrivalTime': 0, 'burstTime': 8, 'priority': 2},
            {'pid': 2, 'name': 'P2', 'arrivalTime': 1, 'burstTime': 4, 'priority': 1},
        ]
        res = calculate_cpu_scheduling('SRTF', processes)
        p1 = next(p for p in res['results'] if p['pid'] == 1)
        p2 = next(p for p in res['results'] if p['pid'] == 2)

        self.assertEqual(p2['completionTime'], 5)
        self.assertEqual(p1['completionTime'], 12)
        self.assertEqual(p2['waitingTime'], 0)
        self.assertEqual(p1['waitingTime'], 4)

    def test_round_robin_scheduling(self):
        # Round Robin with quantum = 2
        # P1: AT=0, BT=5
        # P2: AT=1, BT=3
        # t=0..2: P1 runs (rem: 3). At t=1, P2 arrived.
        # t=2..4: P2 runs (rem: 1).
        # t=4..6: P1 runs (rem: 1).
        # t=6..7: P2 runs (rem: 0 -> finishes at 7).
        # t=7..8: P1 runs (rem: 0 -> finishes at 8).
        processes = [
            {'pid': 1, 'name': 'P1', 'arrivalTime': 0, 'burstTime': 5, 'priority': 1},
            {'pid': 2, 'name': 'P2', 'arrivalTime': 1, 'burstTime': 3, 'priority': 1},
        ]
        res = calculate_cpu_scheduling('RR', processes, quantum=2)
        p1 = next(p for p in res['results'] if p['pid'] == 1)
        p2 = next(p for p in res['results'] if p['pid'] == 2)

        self.assertEqual(p2['completionTime'], 7)
        self.assertEqual(p1['completionTime'], 8)
        self.assertEqual(p2['turnaroundTime'], 6)
        self.assertEqual(p2['waitingTime'], 3)
        self.assertEqual(p1['turnaroundTime'], 8)
        self.assertEqual(p1['waitingTime'], 3)

    def test_priority_scheduling(self):
        # Non-preemptive Priority (lower number = higher priority)
        # P1: AT=0, BT=4, priority=3 -> runs [0, 4]
        # At t=4, P2 (priority 1, BT=3) and P3 (priority 2, BT=2) ready.
        # P2 runs first [4, 7], then P3 runs [7, 9]
        processes = [
            {'pid': 1, 'name': 'P1', 'arrivalTime': 0, 'burstTime': 4, 'priority': 3},
            {'pid': 2, 'name': 'P2', 'arrivalTime': 1, 'burstTime': 3, 'priority': 1},
            {'pid': 3, 'name': 'P3', 'arrivalTime': 2, 'burstTime': 2, 'priority': 2},
        ]
        res = calculate_cpu_scheduling('PRIORITY', processes)
        p1 = next(p for p in res['results'] if p['pid'] == 1)
        p2 = next(p for p in res['results'] if p['pid'] == 2)
        p3 = next(p for p in res['results'] if p['pid'] == 3)

        self.assertEqual(p1['completionTime'], 4)
        self.assertEqual(p2['completionTime'], 7)
        self.assertEqual(p3['completionTime'], 9)

    def test_comparator_benchmark_all_algorithms(self):
        processes = [
            {'pid': 1, 'name': 'P1', 'arrivalTime': 0, 'burstTime': 6, 'priority': 2},
            {'pid': 2, 'name': 'P2', 'arrivalTime': 2, 'burstTime': 3, 'priority': 1},
        ]
        comp = calculate_all_comparisons(processes, quantum=2)
        self.assertIn('algorithms', comp)
        self.assertEqual(len(comp['algorithms']), 5)
        for algo in ['FCFS', 'SJF', 'SRTF', 'RR', 'PRIORITY']:
            self.assertIn(algo, comp['comparisons'])
            self.assertGreater(comp['comparisons'][algo]['totalTime'], 0)


class ProcessLifecycleAndTreeTests(TestCase):
    """
    Tests for process spawning, forking, state transitions, zombie reaping, and orphan re-parenting.
    """

    def setUp(self):
        seed_default_processes()

    def test_initial_kernel_state(self):
        procs = get_all_processes_data()
        self.assertGreaterEqual(len(procs), 9)
        systemd = next((p for p in procs if p['pid'] == 1), None)
        self.assertIsNotNone(systemd)
        self.assertEqual(systemd['name'], 'systemd')
        self.assertEqual(systemd['state'], 'RUNNING')

    def test_fork_process(self):
        child = fork_process(ppid=101, name="subshell", priority=4, cpu_burst=8, memory_mb=20)
        self.assertIsNotNone(child)
        self.assertEqual(child.ppid, 101)
        self.assertEqual(child.state, 'READY')
        self.assertEqual(child.name, 'subshell')
        self.assertEqual(child.priority, 4)
        self.assertTrue(child.pc.startswith('0x'))

    def test_state_transitions(self):
        proc, err = update_process_state(101, 'RUNNING')
        self.assertIsNone(err)
        self.assertEqual(proc.state, 'RUNNING')

        proc, err = update_process_state(101, 'WAITING')
        self.assertIsNone(err)
        self.assertEqual(proc.state, 'WAITING')

    def test_terminate_protection_pid1(self):
        success, err = terminate_process(1)
        self.assertFalse(success)
        self.assertIn("PID 1", err)

        # Non-PID 1 termination succeeds
        success, err = terminate_process(106)
        self.assertTrue(success)
        self.assertEqual(Process.objects.get(pid=106).state, 'TERMINATED')

    def test_reap_zombies_and_reparent_orphans(self):
        # Fork a child under 106
        child = fork_process(ppid=106, name="worker-child")
        # Terminate 106 (becoming zombie)
        terminate_process(106)

        # Reap
        reaped_count = reap_terminated_processes()
        self.assertGreaterEqual(reaped_count, 1)

        # Verify child is now orphaned and re-parented to PID 1
        child.refresh_from_db()
        self.assertEqual(child.ppid, 1)


class APITests(TestCase):
    """
    Tests covering Django REST API endpoints.
    """

    def setUp(self):
        self.client = Client()
        seed_default_processes()

    def test_get_processes_api(self):
        res = self.client.get('/api/processes/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIsInstance(res.json(), list)

    def test_create_and_fork_process_api(self):
        res = self.client.post('/api/processes/', {
            'name': 'test-daemon',
            'ppid': 1,
            'priority': 4,
            'cpuBurst': 6,
            'memoryMb': 32
        }, content_type='application/json')
        self.assertEqual(res.status_code, status.HTTP_201_CREATED)

    def test_simulation_status_and_step_api(self):
        res = self.client.get('/api/simulation/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('tick', data)
        self.assertIn('algorithm', data)

        # Step tick
        step_res = self.client.post('/api/simulation/step/')
        self.assertEqual(step_res.status_code, status.HTTP_200_OK)
        self.assertEqual(step_res.json()['tick'], data['tick'] + 1)

    def test_simulation_benchmark_and_compare_api(self):
        payload = {
            'quantum': 2,
            'processes': [
                {'pid': 1, 'name': 'P1', 'arrivalTime': 0, 'burstTime': 4, 'priority': 2},
                {'pid': 2, 'name': 'P2', 'arrivalTime': 1, 'burstTime': 2, 'priority': 1},
            ]
        }
        res = self.client.post('/api/simulation/benchmark/', payload, content_type='application/json')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        self.assertIn('timeline', res.json())
        self.assertIn('avgTAT', res.json())

        comp_res = self.client.post('/api/simulation/compare/', payload, content_type='application/json')
        self.assertEqual(comp_res.status_code, status.HTTP_200_OK)
        self.assertIn('comparisons', comp_res.json())

    def test_kernel_logs_and_clear_api(self):
        res = self.client.get('/api/logs/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)

        del_res = self.client.delete('/api/logs/')
        self.assertEqual(del_res.status_code, status.HTTP_200_OK)

    def test_state_flow_diagram_api(self):
        res = self.client.get('/api/state-flow/')
        self.assertEqual(res.status_code, status.HTTP_200_OK)
        data = res.json()
        self.assertIn('counts', data)
        self.assertIn('transitions', data)


class EdgeCaseAndRegressionTests(TestCase):
    """
    Regression and boundary condition tests for Forkmetry's independent algorithms.
    """

    def setUp(self):
        seed_default_processes()

    def test_empty_workload_scheduling(self):
        res = calculate_cpu_scheduling('FCFS', [])
        self.assertEqual(res['totalTime'], 0)
        self.assertEqual(len(res['results']), 0)
        self.assertEqual(len(res['timeline']), 0)

    def test_multi_preemption_srtf_chain(self):
        # P1 arrives at 0 with burst 10
        # P2 arrives at 2 with burst 4 (preempts P1)
        # P3 arrives at 3 with burst 1 (preempts P2)
        processes = [
            {'pid': 1, 'name': 'P1', 'arrivalTime': 0, 'burstTime': 10, 'priority': 3},
            {'pid': 2, 'name': 'P2', 'arrivalTime': 2, 'burstTime': 4, 'priority': 2},
            {'pid': 3, 'name': 'P3', 'arrivalTime': 3, 'burstTime': 1, 'priority': 1},
        ]
        res = calculate_cpu_scheduling('SRTF', processes)
        # P3 runs at t=3, completes at t=4
        p3 = next(p for p in res['results'] if p['pid'] == 3)
        self.assertEqual(p3['completionTime'], 4)
        self.assertEqual(p3['waitingTime'], 0)

        # P2 finishes next at t=7
        p2 = next(p for p in res['results'] if p['pid'] == 2)
        self.assertEqual(p2['completionTime'], 7)

        # P1 finishes at t=15
        p1 = next(p for p in res['results'] if p['pid'] == 1)
        self.assertEqual(p1['completionTime'], 15)

    def test_multi_level_orphan_reparenting_chain(self):
        # Create hierarchy: 101 -> childA (201) -> childB (202)
        child_a = fork_process(ppid=101, name="child-a")
        child_b = fork_process(ppid=child_a.pid, name="child-b")

        # Terminate child_a
        terminate_process(child_a.pid)
        # Reap
        reap_terminated_processes()

        # child_b should now be re-parented to PID 1 (systemd)
        child_b.refresh_from_db()
        self.assertEqual(child_b.ppid, 1)

    def test_zero_quantum_round_robin_safeguard(self):
        processes = [
            {'pid': 1, 'name': 'P1', 'arrivalTime': 0, 'burstTime': 4, 'priority': 1},
        ]
        # Should gracefully enforce minimum quantum of 1 rather than infinite loop
        res = calculate_cpu_scheduling('RR', processes, quantum=0)
        self.assertEqual(res['totalTime'], 4)

