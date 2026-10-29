import time
from django.db import models


class Process(models.Model):
    STATE_CHOICES = [
        ('RUNNING', 'Running'),
        ('READY', 'Ready'),
        ('WAITING', 'Waiting'),
        ('TERMINATED', 'Terminated'),
    ]

    pid = models.IntegerField(primary_key=True)
    ppid = models.IntegerField(default=0)
    name = models.CharField(max_length=64)
    state = models.CharField(max_length=16, choices=STATE_CHOICES, default='READY')
    priority = models.IntegerField(default=5)  # 1 to 10
    cpu_burst = models.IntegerField(default=10)
    total_burst = models.IntegerField(default=10)
    memory_mb = models.IntegerField(default=32)
    created_at = models.DateTimeField(auto_now_add=True)

    # Register states simulated for OS PCB
    pc = models.CharField(max_length=32, blank=True, default='0x00400000')
    sp = models.CharField(max_length=32, blank=True, default='0x7ffd0000')
    rax = models.CharField(max_length=32, blank=True, default='0x00000000')
    rbx = models.CharField(max_length=32, blank=True, default='0x00000000')
    rcx = models.CharField(max_length=32, blank=True, default='0x00000000')
    rdx = models.CharField(max_length=32, blank=True, default='0x00000000')
    rip = models.CharField(max_length=32, blank=True, default='0x00401000')

    class Meta:
        ordering = ['pid']

    def __str__(self):
        return f"PID {self.pid} ({self.name}) - {self.state}"

    def to_dict(self, children_map=None):
        children = children_map.get(self.pid, []) if children_map else []
        return {
            'pid': self.pid,
            'ppid': self.ppid,
            'name': self.name,
            'state': self.state,
            'priority': self.priority,
            'cpuBurst': self.cpu_burst,
            'totalBurst': self.total_burst,
            'memoryMb': self.memory_mb,
            'childrenPids': children,
            'registers': {
                'PC': self.pc,
                'SP': self.sp,
                'RAX': self.rax,
                'RBX': self.rbx,
                'RCX': self.rcx,
                'RDX': self.rdx,
                'RIP': self.rip,
            }
        }


class SimulationState(models.Model):
    tick = models.IntegerField(default=0)
    algorithm = models.CharField(max_length=32, default='ROUND_ROBIN')  # ROUND_ROBIN, PRIORITY, FCFS
    quantum = models.IntegerField(default=4)
    quantum_remaining = models.IntegerField(default=4)
    is_running = models.BooleanField(default=False)

    def __str__(self):
        return f"Tick {self.tick} ({self.algorithm})"


class KernelLog(models.Model):
    LEVEL_CHOICES = [
        ('INFO', 'Info'),
        ('WARN', 'Warning'),
        ('ERROR', 'Error'),
        ('SUCCESS', 'Success'),
    ]

    level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default='INFO')
    message = models.CharField(max_length=255)
    timestamp = models.FloatField(default=time.time)

    class Meta:
        ordering = ['-id']

    def to_dict(self):
        return {
            'id': self.id,
            'lvl': self.level,
            'msg': self.message,
            't': self.timestamp
        }
