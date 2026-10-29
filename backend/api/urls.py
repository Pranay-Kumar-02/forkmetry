from django.urls import path
from . import views

urlpatterns = [
    path('processes/', views.process_list_create, name='process-list-create'),
    path('processes/<int:pid>/fork/', views.process_fork, name='process-fork'),
    path('processes/<int:pid>/state/', views.process_update_state, name='process-update-state'),
    path('processes/<int:pid>/terminate/', views.process_terminate, name='process-terminate'),
    path('processes/reap/', views.process_reap, name='process-reap'),
    path('processes/reset/', views.process_reset, name='process-reset'),
    
    path('simulation/', views.simulation_status, name='simulation-status'),
    path('simulation/step/', views.simulation_step, name='simulation-step'),
    path('simulation/config/', views.simulation_config, name='simulation-config'),
    path('simulation/benchmark/', views.simulation_benchmark, name='simulation-benchmark'),
    path('simulation/compare/', views.simulation_compare, name='simulation-compare'),
    
    path('logs/', views.kernel_logs, name='kernel-logs'),
    path('state-flow/', views.state_flow_diagram_data, name='state-flow-diagram'),
]
