'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Brain,
  Settings,
  Activity,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Pause,
  Play,
  BarChart3,
  Zap,
  Shield,
  Eye,
  Bot,
  Users,
  DollarSign,
  ShoppingCart,
  Target,
  Clock,
  Cpu,
  Database,
  Wifi
} from 'lucide-react';

interface AutomationStatus {
  isActive: boolean;
  currentMode: 'full' | 'hybrid' | 'manual';
  emergencyStop: boolean;
  systemHealth: 'excellent' | 'good' | 'warning' | 'critical';
  uptime: number;
  lastActivity: Date;
  performanceMetrics: {
    successRate: number;
    averageExecutionTime: number;
    errorRate: number;
    userInterventionRate: number;
  };
  ai: {
    learningEnabled: boolean;
    models: number;
    averageAccuracy: number;
  };
  competitors: {
    totalCompetitors: number;
    activeCompetitors: number;
    marketVolatility: number;
  };
  automation: {
    pendingActions: number;
    alerts: number;
    modeDistribution: Record<string, number>;
  };
}

export default function AutomationDashboard() {
  const [status, setStatus] = useState<AutomationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState<'full' | 'hybrid' | 'manual'>('manual');
  const [realTimeEnabled, setRealTimeEnabled] = useState(true);

  useEffect(() => {
    fetchAutomationStatus();
    if (realTimeEnabled) {
      const interval = setInterval(fetchAutomationStatus, 30000); // Update every 30 seconds
      return () => clearInterval(interval);
    }
  }, [realTimeEnabled]);

  const fetchAutomationStatus = async () => {
    try {
      const response = await fetch('/api/automation/status');
      const data = await response.json();
      if (data.success) {
        setStatus(data);
        setSelectedMode(data.system.currentMode);
      }
    } catch (error) {
      console.error('Failed to fetch automation status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleModeChange = async (mode: 'full' | 'hybrid' | 'manual') => {
    try {
      const response = await fetch('/api/automation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'set_mode',
          data: { mode, reason: 'User initiated mode change' }
        })
      });

      if (response.ok) {
        setSelectedMode(mode);
        fetchAutomationStatus();
      }
    } catch (error) {
      console.error('Failed to change automation mode:', error);
    }
  };

  const handleEmergencyStop = async () => {
    try {
      const response = await fetch('/api/automation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'emergency_stop',
          data: { reason: 'User initiated emergency stop' }
        })
      });

      if (response.ok) {
        fetchAutomationStatus();
      }
    } catch (error) {
      console.error('Failed to emergency stop:', error);
    }
  };

  const handleResume = async () => {
    try {
      const response = await fetch('/api/automation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'resume'
        })
      });

      if (response.ok) {
        fetchAutomationStatus();
      }
    } catch (error) {
      console.error('Failed to resume automation:', error);
    }
  };

  const runSystemTest = async () => {
    try {
      const response = await fetch('/api/automation/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          testType: 'full_suite'
        })
      });

      const result = await response.json();
      console.log('System test results:', result);
    } catch (error) {
      console.error('Failed to run system test:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-pulse mx-auto mb-4" />
          <p className="text-lg font-medium">Loading Automation Dashboard...</p>
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center h-96 flex items-center justify-center">
        <div>
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-medium">Failed to load automation status</p>
        </div>
      </div>
    );
  }

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'excellent': return 'text-green-500';
      case 'good': return 'text-blue-500';
      case 'warning': return 'text-yellow-500';
      case 'critical': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getModeIcon = (mode: string) => {
    switch (mode) {
      case 'full': return <Bot className="h-4 w-4" />;
      case 'hybrid': return <Users className="h-4 w-4" />;
      case 'manual': return <Settings className="h-4 w-4" />;
      default: return <Settings className="h-4 w-4" />;
    }
  };

  const formatUptime = (ms: number) => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remainingHours = hours % 24;
    return `${days}d ${remainingHours}h`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Automation Dashboard</h1>
          <p className="text-muted-foreground">Self-Running Business Mode Control Center</p>
        </div>
        <div className="flex items-center space-x-4">
          <Switch
            checked={realTimeEnabled}
            onCheckedChange={setRealTimeEnabled}
          />
          <span className="text-sm">Real-time Updates</span>
          <Button onClick={runSystemTest} variant="outline">
            <Activity className="h-4 w-4 mr-2" />
            Run System Test
          </Button>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">System Status</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center">
              {status.system.isActive ? (
                <><CheckCircle className="h-5 w-5 text-green-500 mr-2" /> Active</>
              ) : (
                <><Pause className="h-5 w-5 text-red-500 mr-2" /> Inactive</>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Uptime: {formatUptime(status.system.uptime)}
            </p>
            <div className={`text-xs font-medium ${getHealthColor(status.systemHealth)}`}>
              Health: {status.systemHealth.toUpperCase()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Mode</CardTitle>
            {getModeIcon(status.system.currentMode)}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold capitalize">
              {status.system.currentMode}
            </div>
            <p className="text-xs text-muted-foreground">
              {status.system.currentMode === 'full' && 'AI manages all decisions'}
              {status.system.currentMode === 'hybrid' && 'AI suggests, user confirms'}
              {status.system.currentMode === 'manual' && 'Full manual control'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(status.performanceMetrics.successRate * 100)}%
            </div>
            <Progress value={status.performanceMetrics.successRate * 100} className="mt-2" />
            <p className="text-xs text-muted-foreground">
              Avg execution: {Math.round(status.performanceMetrics.averageExecutionTime)}ms
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Performance</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(status.ai.averageAccuracy * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {status.ai.models} active models
            </p>
            <Badge variant={status.ai.learningEnabled ? "default" : "secondary"}>
              {status.ai.learningEnabled ? 'Learning' : 'Paused'}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Control Panel */}
      <Card>
        <CardHeader>
          <CardTitle>Automation Control Panel</CardTitle>
          <CardDescription>
            Control automation modes and system operations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Mode Selection */}
            <div>
              <h3 className="text-lg font-medium mb-4">Automation Mode</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className={`cursor-pointer transition-colors ${
                  selectedMode === 'full' ? 'border-primary bg-primary/5' : ''
                }`} onClick={() => handleModeChange('full')}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Bot className="h-8 w-8 text-primary" />
                      <div>
                        <h4 className="font-medium">Full Automation</h4>
                        <p className="text-sm text-muted-foreground">
                          AI manages all decisions automatically
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer transition-colors ${
                  selectedMode === 'hybrid' ? 'border-primary bg-primary/5' : ''
                }`} onClick={() => handleModeChange('hybrid')}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Users className="h-8 w-8 text-primary" />
                      <div>
                        <h4 className="font-medium">Hybrid Mode</h4>
                        <p className="text-sm text-muted-foreground">
                          AI suggests, user confirms critical actions
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className={`cursor-pointer transition-colors ${
                  selectedMode === 'manual' ? 'border-primary bg-primary/5' : ''
                }`} onClick={() => handleModeChange('manual')}>
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <Settings className="h-8 w-8 text-primary" />
                      <div>
                        <h4 className="font-medium">Manual Mode</h4>
                        <p className="text-sm text-muted-foreground">
                          Full manual control with AI suggestions
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Emergency Controls */}
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <h3 className="font-medium">Emergency Controls</h3>
                <p className="text-sm text-muted-foreground">
                  {status.system.emergencyStop
                    ? 'Emergency stop is currently active'
                    : 'Immediately pause all automation if needed'
                  }
                </p>
              </div>
              <div className="flex space-x-2">
                {status.system.emergencyStop ? (
                  <Button onClick={handleResume} className="bg-green-600 hover:bg-green-700">
                    <Play className="h-4 w-4 mr-2" />
                    Resume Automation
                  </Button>
                ) : (
                  <Button onClick={handleEmergencyStop} variant="destructive">
                    <Pause className="h-4 w-4 mr-2" />
                    Emergency Stop
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="ai">AI Insights</TabsTrigger>
          <TabsTrigger value="competitors">Competitors</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pending Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{status.automation.pendingActions}</div>
                <p className="text-xs text-muted-foreground">Actions awaiting approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{status.automation.alerts}</div>
                <p className="text-xs text-muted-foreground">System alerts requiring attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Market Volatility</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(status.competitors.marketVolatility * 100)}%
                </div>
                <Progress value={status.competitors.marketVolatility * 100} className="mt-2" />
                <p className="text-xs text-muted-foreground">Competitor activity level</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Success Rate</span>
                    <span>{Math.round(status.performanceMetrics.successRate * 100)}%</span>
                  </div>
                  <Progress value={status.performanceMetrics.successRate * 100} />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>Error Rate</span>
                    <span>{Math.round(status.performanceMetrics.errorRate * 100)}%</span>
                  </div>
                  <Progress value={status.performanceMetrics.errorRate * 100} className="bg-red-100" />
                </div>
                <div>
                  <div className="flex justify-between text-sm">
                    <span>User Intervention Rate</span>
                    <span>{Math.round(status.performanceMetrics.userInterventionRate * 100)}%</span>
                  </div>
                  <Progress value={status.performanceMetrics.userInterventionRate * 100} className="bg-yellow-100" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Mode Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(status.automation.modeDistribution).map(([mode, count]) => (
                    <div key={mode} className="flex justify-between items-center">
                      <span className="capitalize">{mode}</span>
                      <Badge variant="secondary">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Learning System</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Learning Status</span>
                  <Badge variant={status.ai.learningEnabled ? "default" : "secondary"}>
                    {status.ai.learningEnabled ? "Active" : "Paused"}
                  </Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Models</span>
                  <span className="font-medium">{status.ai.models}</span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Average Accuracy</span>
                    <span>{Math.round(status.ai.averageAccuracy * 100)}%</span>
                  </div>
                  <Progress value={status.ai.averageAccuracy * 100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Capabilities</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Brain className="h-4 w-4 text-blue-500" />
                  <span className="text-sm">Pricing Optimization</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Demand Forecasting</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-purple-500" />
                  <span className="text-sm">Market Analysis</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Zap className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm">Pattern Recognition</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="competitors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Competitor Monitoring</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span>Total Competitors</span>
                  <span className="font-medium">{status.competitors.totalCompetitors}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Active Competitors</span>
                  <span className="font-medium">{status.competitors.activeCompetitors}</span>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span>Market Volatility</span>
                    <span>{Math.round(status.competitors.marketVolatility * 100)}%</span>
                  </div>
                  <Progress value={status.competitors.marketVolatility * 100} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Auto-Throttling Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Auto-Throttling</span>
                    <Badge variant={status.automation.autoThrottlingEnabled ? "default" : "secondary"}>
                      {status.automation.autoThrottlingEnabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Response Strategy</span>
                    <span className="text-sm font-medium">Adaptive</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Market Response</span>
                    <span className="text-sm font-medium">Real-time</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">MPesa Status</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">Kenyan mobile payments</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Pesapal Status</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">African payment gateway</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Kopokopo Status</CardTitle>
                <CreditCard className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">Active</div>
                <p className="text-xs text-muted-foreground">Recurring billing platform</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function CreditCard(props: any) {
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
      <rect width="20" height="14" x="2" y="5" rx="2" />
      <path d="M2 10h20" />
    </svg>
  );
}