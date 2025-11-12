import { Suspense } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import AutomationDashboard from '@/components/automation/automation-dashboard';
import AutomationControls from '@/components/automation/automation-controls';
import PaymentDashboard from '@/components/payments/payment-dashboard';
import AIInsightsDashboard from '@/components/ai/ai-insights-dashboard';
import CompetitorMonitoringDashboard from '@/components/competitors/competitor-monitoring-dashboard';
import SystemHealthDashboard from '@/components/system/system-health-dashboard';
import {
  Bot,
  Brain,
  CreditCard,
  Eye,
  Heart,
  Settings,
  Zap,
  Activity,
  TrendingUp
} from 'lucide-react';

export default function AutomationPage() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 lg:flex-row lg:items-center lg:justify-between lg:space-y-0">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">Self-Running Business Mode</h1>
          <p className="text-lg text-muted-foreground">
            Complete automation control center for your dropshipping business
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant="outline" className="hidden sm:flex">
            <Activity className="w-3 h-3 mr-1" />
            Real-time Monitoring
          </Badge>
          <Badge variant="outline" className="hidden sm:flex">
            <Zap className="w-3 h-3 mr-1" />
            AI-Powered
          </Badge>
          <Badge variant="outline" className="hidden sm:flex">
            <TrendingUp className="w-3 h-3 mr-1" />
            Auto-Optimizing
          </Badge>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Bot className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Automation Status</p>
                <p className="text-lg font-bold text-green-600">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Brain className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium">AI Learning</p>
                <p className="text-lg font-bold text-blue-600">87%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm font-medium">Competitors</p>
                <p className="text-lg font-bold text-purple-600">12</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-100 rounded-lg">
                <Heart className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm font-medium">System Health</p>
                <p className="text-lg font-bold text-orange-600">Good</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
          <TabsTrigger value="overview" className="text-xs sm:text-sm">
            Overview
          </TabsTrigger>
          <TabsTrigger value="controls" className="text-xs sm:text-sm">
            Controls
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs sm:text-sm">
            Payments
          </TabsTrigger>
          <TabsTrigger value="ai" className="text-xs sm:text-sm">
            AI Insights
          </TabsTrigger>
          <TabsTrigger value="competitors" className="text-xs sm:text-sm">
            Competitors
          </TabsTrigger>
          <TabsTrigger value="health" className="text-xs sm:text-sm">
            Health
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Suspense fallback={<div>Loading dashboard...</div>}>
            <AutomationDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="controls">
          <Suspense fallback={<div>Loading controls...</div>}>
            <AutomationControls />
          </Suspense>
        </TabsContent>

        <TabsContent value="payments">
          <Suspense fallback={<div>Loading payment systems...</div>}>
            <PaymentDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="ai">
          <Suspense fallback={<div>Loading AI insights...</div>}>
            <AIInsightsDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="competitors">
          <Suspense fallback={<div>Loading competitor data...</div>}>
            <CompetitorMonitoringDashboard />
          </Suspense>
        </TabsContent>

        <TabsContent value="health">
          <Suspense fallback={<div>Loading system health...</div>}>
            <SystemHealthDashboard />
          </Suspense>
        </TabsContent>
      </Tabs>

      {/* Mobile Quick Actions */}
      <div className="lg:hidden fixed bottom-4 right-4 z-50 flex flex-col space-y-2">
        <button className="bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors">
          <Bot className="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}