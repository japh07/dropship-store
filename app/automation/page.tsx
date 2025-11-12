'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Activity,
  Settings,
  AlertTriangle,
  CheckCircle,
  XCircle,
  TrendingUp,
  Package,
  DollarSign,
  Truck,
  Bell,
  BarChart3
} from 'lucide-react';

interface AutomationStatus {
  name: string;
  status: 'running' | 'stopped' | 'error';
  uptime: number;
  lastUpdate: Date;
  pid?: number;
}

interface AutomationMetrics {
  requests: number;
  errors: number;
  averageResponseTime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastUpdated: Date;
}

interface DashboardData {
  overview: {
    totalServices: number;
    runningServices: number;
    lastSync: Date;
    totalAutomations: number;
    activeAlerts: number;
  };
  services: AutomationStatus[];
  metrics: Record<string, AutomationMetrics>;
  alerts: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high';
    message: string;
    timestamp: Date;
  }>;
  recentActivity: Array<{
    id: string;
    action: string;
    timestamp: Date;
    status: string;
  }>;
  systemHealth: {
    overall: 'healthy' | 'warning' | 'critical';
    cpu: number;
    memory: number;
    disk: number;
    network: string;
  };
  lastUpdated: Date;
}

export default function AutomationDashboard() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
    const interval = setInterval(loadDashboardData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/automation/dashboard');
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAutomation = async (service: string, enabled: boolean) => {
    try {
      const response = await fetch('/api/automation/config/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ service, enabled })
      });

      if (response.ok) {
        await loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to toggle automation:', error);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'running': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'stopped': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default: return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running': return 'bg-green-100 text-green-800';
      case 'stopped': return 'bg-red-100 text-red-800';
      case 'error': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getServiceIcon = (service: string) => {
    switch (service) {
      case 'order': return <Package className="h-5 w-5" />;
      case 'pricing': return <DollarSign className="h-5 w-5" />;
      case 'inventory': return <Package className="h-5 w-5" />;
      case 'shipping': return <Truck className="h-5 w-5" />;
      case 'notifications': return <Bell className="h-5 w-5" />;
      case 'analytics': return <BarChart3 className="h-5 w-5" />;
      default: return <Settings className="h-5 w-5" />;
    }
  };

  if (loading || !dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Automation Dashboard</h1>
        <div className="flex items-center space-x-2 text-sm text-gray-500">
          <Activity className="h-4 w-4" />
          Last updated: {dashboardData.lastUpdated.toLocaleTimeString()}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.totalServices}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.overview.runningServices} running
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Automations</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.totalAutomations}</div>
            <p className="text-xs text-muted-foreground">
              Across all services
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Health</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">{dashboardData.systemHealth.overall}</div>
            <p className="text-xs text-muted-foreground">
              CPU: {dashboardData.systemHealth.cpu}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.overview.activeAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Require attention
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Sync</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.floor((Date.now() - dashboardData.overview.lastSync.getTime()) / 60000)}m
            </div>
            <p className="text-xs text-muted-foreground">
              Minutes ago
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {dashboardData.services.map((service) => (
              <Card key={service.name}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <div className="flex items-center space-x-2">
                    {getServiceIcon(service.name)}
                    <CardTitle className="text-lg font-medium capitalize">
                      {service.name} Automation
                    </CardTitle>
                  </div>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(service.status)}
                    <Switch
                      checked={service.status === 'running'}
                      onCheckedChange={(enabled) => toggleAutomation(service.name, enabled)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <Badge className={getStatusColor(service.status)}>
                        {service.status}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Uptime:</span>
                      <span className="text-sm font-medium">
                        {Math.floor(service.uptime / 3600)}h {Math.floor((service.uptime % 3600) / 60)}m
                      </span>
                    </div>
                    {service.pid && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">PID:</span>
                        <span className="text-sm font-medium">{service.pid}</span>
                      </div>
                    )}
                    {dashboardData.metrics[service.name] && (
                      <div className="pt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Requests:</span>
                          <span className="text-sm font-medium">
                            {dashboardData.metrics[service.name].requests}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-600">Response Time:</span>
                          <span className="text-sm font-medium">
                            {dashboardData.metrics[service.name].averageResponseTime.toFixed(0)}ms
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-600">CPU:</span>
                            <span className="text-sm font-medium">
                              {dashboardData.metrics[service.name].cpuUsage.toFixed(1)}%
                            </span>
                          </div>
                          <Progress value={dashboardData.metrics[service.name].cpuUsage} className="h-2" />
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Object.entries(dashboardData.metrics).map(([service, metrics]) => (
              <Card key={service}>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    {getServiceIcon(service)}
                    <span className="capitalize">{service} Metrics</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Requests</span>
                      <span className="text-sm font-medium">{metrics.requests}</span>
                    </div>
                    <Progress value={(metrics.requests / 1000) * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Errors</span>
                      <span className="text-sm font-medium text-red-600">{metrics.errors}</span>
                    </div>
                    <Progress value={(metrics.errors / 50) * 100} className="h-2" />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm">Memory</span>
                      <span className="text-sm font-medium">{metrics.memoryUsage.toFixed(1)}%</span>
                    </div>
                    <Progress value={metrics.memoryUsage} className="h-2" />
                  </div>

                  <div className="pt-2 border-t">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Avg Response:</span>
                      <span className="text-sm font-medium">
                        {metrics.averageResponseTime.toFixed(0)}ms
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          {dashboardData.alerts.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <div className="text-center">
                  <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                  <p className="text-gray-600">No active alerts</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            dashboardData.alerts.map((alert) => (
              <Alert key={alert.id}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <div>
                    <span className="font-medium">{alert.message}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {alert.timestamp.toLocaleTimeString()}
                    </span>
                  </div>
                  <Badge variant={alert.severity === 'high' ? 'destructive' : 'secondary'}>
                    {alert.severity}
                  </Badge>
                </AlertDescription>
              </Alert>
            ))
          )}
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {dashboardData.recentActivity.map((activity) => (
                  <div key={activity.id} className="flex items-center justify-between py-2 border-b">
                    <div>
                      <p className="font-medium">{activity.action}</p>
                      <p className="text-sm text-gray-500">{activity.timestamp.toLocaleString()}</p>
                    </div>
                    <Badge variant="outline">{activity.status}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>System Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span>CPU Usage</span>
                    <span className="text-sm font-medium">{dashboardData.systemHealth.cpu}%</span>
                  </div>
                  <Progress value={dashboardData.systemHealth.cpu} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span>Memory Usage</span>
                    <span className="text-sm font-medium">{dashboardData.systemHealth.memory}%</span>
                  </div>
                  <Progress value={dashboardData.systemHealth.memory} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span>Disk Usage</span>
                    <span className="text-sm font-medium">{dashboardData.systemHealth.disk}%</span>
                  </div>
                  <Progress value={dashboardData.systemHealth.disk} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => loadDashboardData()}
                >
                  Refresh Dashboard
                </Button>
                <Button variant="outline" className="w-full">
                  View Logs
                </Button>
                <Button variant="outline" className="w-full">
                  Export Configuration
                </Button>
                <Button variant="outline" className="w-full">
                  System Diagnostics
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}