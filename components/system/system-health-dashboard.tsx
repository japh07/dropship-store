'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Activity,
  Cpu,
  Database,
  Wifi,
  Shield,
  Zap,
  Clock,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Settings,
  Download,
  Server,
  HardDrive,
  MemoryStick,
  Thermometer,
  Battery,
  Globe
} from 'lucide-react';

interface SystemHealth {
  overall: 'excellent' | 'good' | 'warning' | 'critical';
  uptime: number;
  responseTime: number;
  errorRate: number;
  lastCheck: Date;
}

interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  responseTime: number;
  uptime: number;
  lastCheck: Date;
  errors: number;
  icon: React.ReactNode;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  temperature: number;
  power: number;
}

interface LogEntry {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  service: string;
  message: string;
  timestamp: Date;
  details?: string;
}

export default function SystemHealthDashboard() {
  const [systemHealth, setSystemHealth] = useState<SystemHealth>({
    overall: 'good',
    uptime: 0,
    responseTime: 0,
    errorRate: 0,
    lastCheck: new Date()
  });

  const [services, setServices] = useState<ServiceHealth[]>([
    {
      name: 'Automation Engine',
      status: 'healthy',
      responseTime: 120,
      uptime: 99.9,
      lastCheck: new Date(),
      errors: 0,
      icon: <Zap className="h-5 w-5" />
    },
    {
      name: 'AI Learning System',
      status: 'healthy',
      responseTime: 250,
      uptime: 99.7,
      lastCheck: new Date(),
      errors: 0,
      icon: <Brain className="h-5 w-5" />
    },
    {
      name: 'Payment Gateway',
      status: 'healthy',
      responseTime: 180,
      uptime: 99.8,
      lastCheck: new Date(),
      errors: 0,
      icon: <Shield className="h-5 w-5" />
    },
    {
      name: 'Database',
      status: 'healthy',
      responseTime: 45,
      uptime: 99.9,
      lastCheck: new Date(),
      errors: 0,
      icon: <Database className="h-5 w-5" />
    },
    {
      name: 'Competitor Monitor',
      status: 'degraded',
      responseTime: 500,
      uptime: 98.5,
      lastCheck: new Date(),
      errors: 2,
      icon: <Globe className="h-5 w-5" />
    }
  ]);

  const [metrics, setMetrics] = useState<SystemMetrics>({
    cpu: 45,
    memory: 62,
    disk: 38,
    network: 25,
    temperature: 42,
    power: 85
  });

  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSystemHealth();
    if (autoRefresh) {
      const interval = setInterval(fetchSystemHealth, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchSystemHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/health');
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data.systemHealth);
        setServices(data.services);
        setMetrics(data.metrics);
        setLogs(data.recentLogs);
      }
    } catch (error) {
      console.error('Failed to fetch system health:', error);
    } finally {
      setLoading(false);
    }
  };

  const restartService = async (serviceName: string) => {
    try {
      const response = await fetch('/api/system/restart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service: serviceName })
      });

      if (response.ok) {
        fetchSystemHealth();
      }
    } catch (error) {
      console.error('Failed to restart service:', error);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy':
      case 'excellent':
        return 'text-green-600 bg-green-50';
      case 'degraded':
      case 'good':
        return 'text-yellow-600 bg-yellow-50';
      case 'down':
      case 'warning':
      case 'critical':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      case 'critical': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  const getMetricIcon = (metric: string) => {
    switch (metric) {
      case 'cpu': return <Cpu className="h-4 w-4" />;
      case 'memory': return <MemoryStick className="h-4 w-4" />;
      case 'disk': return <HardDrive className="h-4 w-4" />;
      case 'network': return <Wifi className="h-4 w-4" />;
      case 'temperature': return <Thermometer className="h-4 w-4" />;
      case 'power': return <Battery className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getMetricStatus = (value: number, metric: string) => {
    const thresholds = {
      cpu: { good: 50, warning: 80 },
      memory: { good: 70, warning: 90 },
      disk: { good: 60, warning: 85 },
      network: { good: 60, warning: 85 },
      temperature: { good: 50, warning: 70 },
      power: { good: 20, warning: 10 }
    };

    const threshold = thresholds[metric as keyof typeof thresholds];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.warning) return 'warning';
    return 'critical';
  };

  const formatUptime = (ms: number) => {
    const days = Math.floor(ms / (1000 * 60 * 60 * 24));
    const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return `${days}d ${hours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Health Monitor</h1>
          <p className="text-muted-foreground">Real-time system status and performance metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
              disabled={loading}
            />
            <span className="text-sm">Auto-refresh</span>
          </div>
          <Button onClick={fetchSystemHealth} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${
                systemHealth.overall === 'excellent' || systemHealth.overall === 'good' ? 'bg-green-500' :
                systemHealth.overall === 'warning' ? 'bg-yellow-500' : 'bg-red-500'
              }`} />
              <span className="text-2xl font-bold capitalize">{systemHealth.overall}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {formatUptime(systemHealth.uptime)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Response Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{systemHealth.responseTime}ms</div>
            <Progress value={Math.min((systemHealth.responseTime / 1000) * 100, 100)} className="mt-2" />
            <p className="text-xs text-muted-foreground">
              {systemHealth.responseTime < 200 ? 'Excellent' :
               systemHealth.responseTime < 500 ? 'Good' : 'Needs attention'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Error Rate</CardTitle>
            <XCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(systemHealth.errorRate * 100).toFixed(2)}%</div>
            <Progress value={systemHealth.errorRate * 100} className="mt-2 bg-red-100" />
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Services</CardTitle>
            <Server className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {services.filter(s => s.status === 'healthy').length}/{services.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {services.filter(s => s.status !== 'healthy').length} issues detected
            </p>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>System Metrics</CardTitle>
          <CardDescription>
            Real-time system performance indicators
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(metrics).map(([metric, value]) => {
              const status = getMetricStatus(value, metric);
              return (
                <div key={metric} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getMetricIcon(metric)}
                      <span className="font-medium capitalize">{metric}</span>
                    </div>
                    <Badge className={getHealthColor(status)}>
                      {value}%
                    </Badge>
                  </div>
                  <Progress value={value} className={
                    status === 'good' ? '' :
                    status === 'warning' : 'bg-red-100'
                  } />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Service Status */}
      <Card>
        <CardHeader>
          <CardTitle>Service Status</CardTitle>
          <CardDescription>
            Health status of all system services
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {services.map((service) => (
              <Card key={service.name} className="border-l-4 border-l-gray-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        service.status === 'healthy' ? 'bg-green-100' :
                        service.status === 'degraded' ? 'bg-yellow-100' : 'bg-red-100'
                      }`}>
                        {service.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{service.name}</h3>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span>Response: {service.responseTime}ms</span>
                          <span>Uptime: {service.uptime}%</span>
                          {service.errors > 0 && (
                            <span className="text-red-600">Errors: {service.errors}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getHealthColor(service.status)}>
                        {service.status}
                      </Badge>
                      {service.status !== 'healthy' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => restartService(service.name)}
                        >
                          <RefreshCw className="h-3 w-3 mr-1" />
                          Restart
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* System Logs & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Recent Logs</CardTitle>
            <CardDescription>
              Latest system events and activities
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No recent logs</p>
                </div>
              ) : (
                logs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                    <div className={`mt-0.5 ${
                      log.level === 'critical' ? 'text-red-600' :
                      log.level === 'error' ? 'text-red-500' :
                      log.level === 'warning' ? 'text-yellow-500' :
                      'text-blue-500'
                    }`}>
                      {log.level === 'critical' ? <XCircle className="h-4 w-4" /> :
                       log.level === 'error' ? <XCircle className="h-4 w-4" /> :
                       log.level === 'warning' ? <AlertTriangle className="h-4 w-4" /> :
                       <CheckCircle className="h-4 w-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-sm font-medium ${getLogLevelColor(log.level)}`}>
                          {log.service}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-sm">{log.message}</p>
                      {log.details && (
                        <p className="text-xs text-muted-foreground mt-1">{log.details}</p>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
            <CardDescription>
              Active alerts and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {services.filter(s => s.status !== 'healthy').length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                  <p className="text-lg font-medium">All Systems Operational</p>
                  <p className="text-sm text-muted-foreground">No active alerts</p>
                </div>
              ) : (
                <>
                  {services.filter(s => s.status !== 'healthy').map((service) => (
                    <Alert key={service.name} className={
                      service.status === 'down' ? 'border-red-200 bg-red-50' :
                      'border-yellow-200 bg-yellow-50'
                    }>
                      <AlertTriangle className="h-4 w-4" />
                      <AlertTitle className="text-sm">{service.name}</AlertTitle>
                      <AlertDescription className="text-sm">
                        {service.status === 'down'
                          ? 'Service is currently offline and not responding'
                          : 'Service is experiencing degraded performance'}
                      </AlertDescription>
                    </Alert>
                  ))}

                  {metrics.cpu > 80 && (
                    <Alert className="border-red-200 bg-red-50">
                      <Thermometer className="h-4 w-4" />
                      <AlertTitle className="text-sm">High CPU Usage</AlertTitle>
                      <AlertDescription className="text-sm">
                        CPU usage is at {metrics.cpu}%. Consider scaling resources.
                      </AlertDescription>
                    </Alert>
                  )}

                  {metrics.memory > 90 && (
                    <Alert className="border-red-200 bg-red-50">
                      <MemoryStick className="h-4 w-4" />
                      <AlertTitle className="text-sm">High Memory Usage</AlertTitle>
                      <AlertDescription className="text-sm">
                        Memory usage is at {metrics.memory}%. System may become unstable.
                      </AlertDescription>
                    </Alert>
                  )}

                  {systemHealth.errorRate > 0.05 && (
                    <Alert className="border-red-200 bg-red-50">
                      <XCircle className="h-4 w-4" />
                      <AlertTitle className="text-sm">High Error Rate</AlertTitle>
                      <AlertDescription className="text-sm">
                        Error rate is {(systemHealth.errorRate * 100).toFixed(2)}%, above normal thresholds.
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Trends */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="history">System History</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center bg-muted/50 rounded-lg">
                <div className="text-center">
                  <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Performance metrics visualization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="font-medium">System Started</p>
                      <p className="text-sm text-muted-foreground">All services initialized successfully</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">2 days ago</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <RefreshCw className="h-5 w-5 text-blue-600" />
                    <div>
                      <p className="font-medium">AI Model Retrained</p>
                      <p className="text-sm text-muted-foreground">Pricing model updated with new data</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">1 day ago</span>
                </div>

                <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                    <div>
                      <p className="font-medium">Service Recovery</p>
                      <p className="text-sm text-muted-foreground">Competitor Monitor service recovered</p>
                    </div>
                  </div>
                  <span className="text-sm text-muted-foreground">6 hours ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Maintenance Operations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button variant="outline" className="justify-start">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restart All Services
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Database className="h-4 w-4 mr-2" />
                    Clear System Cache
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Download className="h-4 w-4 mr-2" />
                    Download System Logs
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Settings className="h-4 w-4 mr-2" />
                    Run Health Check
                  </Button>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertTitle>Maintenance Mode</AlertTitle>
                  <AlertDescription>
                    Enable maintenance mode to temporarily pause automation while performing system updates.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Brain(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-9.29 2.5 2.5 0 0 1 4.4-.01Z" />
      <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-9.29 2.5 2.5 0 0 0-4.4-.01Z" />
    </svg>
  );
}