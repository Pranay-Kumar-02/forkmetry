import json
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status
from .models import Process, SimulationState, KernelLog
from .services import (
    get_all_processes_data,
    seed_default_processes,
    fork_process,
    update_process_state,
    terminate_process,
    reap_terminated_processes,
    step_simulation,
    get_simulation_state,
    log_event,
    calculate_cpu_scheduling,
    calculate_all_comparisons,
)


@api_view(['GET', 'POST'])
def process_list_create(request):
    if request.method == 'GET':
        data = get_all_processes_data()
        return Response(data)

    elif request.method == 'POST':
        # Create a new process (spawn / fork+exec)
        data = request.data
        name = data.get('name', '').strip()
        if not name:
            name = f"proc-{data.get('pid', 'new')}"
        ppid = int(data.get('ppid', 1))
        priority = int(data.get('priority', 5))
        cpu_burst = int(data.get('cpuBurst', 10))
        memory_mb = int(data.get('memoryMb', 32))

        child = fork_process(
            ppid=ppid,
            name=name,
            priority=priority,
            cpu_burst=cpu_burst,
            memory_mb=memory_mb
        )
        return Response(get_all_processes_data(), status=status.HTTP_201_CREATED)


@api_view(['POST'])
def process_fork(request, pid):
    data = request.data or {}
    name = data.get('name')
    priority = data.get('priority')
    cpu_burst = data.get('cpuBurst')
    memory_mb = data.get('memoryMb')

    child = fork_process(
        ppid=pid,
        name=name,
        priority=priority,
        cpu_burst=cpu_burst,
        memory_mb=memory_mb
    )
    return Response(get_all_processes_data(), status=status.HTTP_201_CREATED)


@api_view(['PATCH'])
def process_update_state(request, pid):
    new_state = request.data.get('state')
    if not new_state:
        return Response({'error': 'State is required'}, status=status.HTTP_400_BAD_REQUEST)

    proc, err = update_process_state(pid, new_state)
    if err and not proc:
        return Response({'error': err}, status=status.HTTP_404_NOT_FOUND)

    return Response(get_all_processes_data())


@api_view(['POST', 'DELETE'])
def process_terminate(request, pid):
    success, err = terminate_process(pid)
    if not success:
        return Response({'error': err}, status=status.HTTP_400_BAD_REQUEST)

    return Response(get_all_processes_data())


@api_view(['POST'])
def process_reap(request):
    reaped = reap_terminated_processes()
    return Response({'reaped': reaped, 'processes': get_all_processes_data()})


@api_view(['POST'])
def process_reset(request):
    seed_default_processes()
    return Response(get_all_processes_data())


@api_view(['GET'])
def simulation_status(request):
    state = get_simulation_state()
    procs = get_all_processes_data()
    
    alive = [p for p in procs if p['state'] != 'TERMINATED']
    running = next((p for p in alive if p['state'] == 'RUNNING' and p['pid'] != 1), None)
    if not running:
        running = next((p for p in alive if p['state'] == 'RUNNING'), None)

    counts = {
        'RUNNING': len([p for p in procs if p['state'] == 'RUNNING']),
        'READY': len([p for p in procs if p['state'] == 'READY']),
        'WAITING': len([p for p in procs if p['state'] == 'WAITING']),
        'TERMINATED': len([p for p in procs if p['state'] == 'TERMINATED']),
    }

    cpu_load = min(100, 35 + ((state.tick * 7) % 55))
    mem_used = sum(p['memoryMb'] for p in alive)
    ready_queue = sorted([p for p in alive if p['state'] == 'READY'], key=lambda x: -x['priority'] if state.algorithm == 'PRIORITY' else x['pid'])
    waiting_queue = sorted([p for p in alive if p['state'] == 'WAITING'], key=lambda x: -x['priority'])

    return Response({
        'tick': state.tick,
        'algorithm': state.algorithm,
        'quantum': state.quantum,
        'quantumRemaining': state.quantum_remaining,
        'isRunning': state.is_running,
        'cpuLoad': cpu_load,
        'memoryUsedMb': mem_used,
        'counts': counts,
        'runningProcess': running,
        'readyQueue': ready_queue,
        'waitingQueue': waiting_queue,
        'totalProcesses': len(procs),
        'activeProcesses': len(alive),
    })


@api_view(['POST'])
def simulation_step(request):
    step_simulation()
    state = get_simulation_state()
    return Response({
        'tick': state.tick,
        'processes': get_all_processes_data(),
        'logs': [l.to_dict() for l in KernelLog.objects.all()[:50]]
    })


@api_view(['POST'])
def simulation_config(request):
    state = get_simulation_state()
    data = request.data
    if 'algorithm' in data:
        algo = data['algorithm'].upper()
        if algo in ['ROUND_ROBIN', 'PRIORITY', 'FCFS']:
            state.algorithm = algo
            log_event('INFO', f"Scheduler policy changed to {algo}")
    if 'quantum' in data:
        q = max(1, min(20, int(data['quantum'])))
        state.quantum = q
        state.quantum_remaining = q
        log_event('INFO', f"Round Robin time quantum set to {q} ticks")
    state.save()
    return Response({
        'algorithm': state.algorithm,
        'quantum': state.quantum,
        'quantumRemaining': state.quantum_remaining
    })


@api_view(['GET', 'DELETE'])
def kernel_logs(request):
    if request.method == 'DELETE':
        KernelLog.objects.all().delete()
        log_event('INFO', 'Kernel dmesg log buffer cleared')
        return Response({'message': 'Logs cleared'})
    
    logs = [l.to_dict() for l in KernelLog.objects.all()[:80]]
    return Response(logs)


@api_view(['GET'])
def state_flow_diagram_data(request):
    """
    Returns state counts, valid state transitions, and definitions for OS State Flow diagram
    """
    procs = get_all_processes_data()
    counts = {
        'NEW': 0,
        'READY': len([p for p in procs if p['state'] == 'READY']),
        'RUNNING': len([p for p in procs if p['state'] == 'RUNNING']),
        'WAITING': len([p for p in procs if p['state'] == 'WAITING']),
        'TERMINATED': len([p for p in procs if p['state'] == 'TERMINATED']),
    }
    
    transitions = [
        {'from': 'NEW', 'to': 'READY', 'trigger': 'Admit', 'description': 'Process is allocated resources and admitted to ready queue'},
        {'from': 'READY', 'to': 'RUNNING', 'trigger': 'Dispatch / Schedule', 'description': 'CPU scheduler assigns core to top priority or head ready process'},
        {'from': 'RUNNING', 'to': 'READY', 'trigger': 'Timer Interrupt (Preempt)', 'description': 'Round-robin quantum expired or higher priority process ready'},
        {'from': 'RUNNING', 'to': 'WAITING', 'trigger': 'I/O or Event Wait', 'description': 'Process requests I/O, syscall, socket, or lock synchronization'},
        {'from': 'WAITING', 'to': 'READY', 'trigger': 'I/O or Event Completion', 'description': 'Interrupt handler notifies OS that requested I/O is ready'},
        {'from': 'RUNNING', 'to': 'TERMINATED', 'trigger': 'Exit / SIGTERM', 'description': 'Process burst completes (exit(0)) or killed by SIGTERM/SIGKILL'},
    ]

    return Response({
        'counts': counts,
        'transitions': transitions,
        'processes': procs
    })


@api_view(['POST'])
def simulation_benchmark(request):
    data = request.data or {}
    algorithm = data.get('algorithm', 'RR')
    processes = data.get('processes', [])
    quantum = int(data.get('quantum', 3))

    result = calculate_cpu_scheduling(algorithm, processes, quantum)
    return Response(result)


@api_view(['POST'])
def simulation_compare(request):
    data = request.data or {}
    processes = data.get('processes', [])
    quantum = int(data.get('quantum', 3))

    result = calculate_all_comparisons(processes, quantum)
    return Response(result)

