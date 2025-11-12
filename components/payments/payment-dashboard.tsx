'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DollarSign,
  Smartphone,
  CreditCard,
  TrendingUp,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3,
  Users,
  ShoppingCart,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings,
  Eye,
  Download
} from 'lucide-react';

interface PaymentMetrics {
  totalTransactions: number;
  successRate: number;
  totalVolume: number;
  averageTransactionValue: number;
  processingTime: number;
}

interface PaymentSystem {
  name: string;
  status: 'active' | 'inactive' | 'error';
  type: 'mobile' | 'card' | 'bank';
  transactions: number;
  volume: number;
  successRate: number;
  lastActivity: Date;
  icon: React.ReactNode;
}

interface RecentTransaction {
  id: string;
  system: string;
  type: string;
  amount: number;
  status: 'success' | 'pending' | 'failed';
  customer?: string;
  timestamp: Date;
  processingTime?: number;
}

export default function PaymentDashboard() {
  const [metrics, setMetrics] = useState<PaymentMetrics>({
    totalTransactions: 0,
    successRate: 0,
    totalVolume: 0,
    averageTransactionValue: 0,
    processingTime: 0
  });

  const [paymentSystems, setPaymentSystems] = useState<PaymentSystem[]>([
    {
      name: 'MPesa',
      status: 'active',
      type: 'mobile',
      transactions: 0,
      volume: 0,
      successRate: 0,
      lastActivity: new Date(),
      icon: <Smartphone className="h-5 w-5" />
    },
    {
      name: 'Pesapal',
      status: 'active',
      type: 'card',
      transactions: 0,
      volume: 0,
      successRate: 0,
      lastActivity: new Date(),
      icon: <CreditCard className="h-5 w-5" />
    },
    {
      name: 'Kopokopo',
      status: 'active',
      type: 'bank',
      transactions: 0,
      volume: 0,
      successRate: 0,
      lastActivity: new Date(),
      icon: <DollarSign className="h-5 w-5" />
    }
  ]);

  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState('24h');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaymentData();
    const interval = setInterval(fetchPaymentData, 60000); // Update every minute
    return () => clearInterval(interval);
  }, [selectedPeriod]);

  const fetchPaymentData = async () => {
    try {
      // Fetch metrics
      const metricsResponse = await fetch('/api/payments/metrics');
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData.metrics);
      }

      // Fetch system statuses
      const systemsResponse = await fetch('/api/payments/systems');
      if (systemsResponse.ok) {
        const systemsData = await systemsResponse.json();
        setPaymentSystems(systemsData.systems);
      }

      // Fetch recent transactions
      const transactionsResponse = await fetch(`/api/payments/transactions?period=${selectedPeriod}`);
      if (transactionsResponse.ok) {
        const transactionsData = await transactionsResponse.json();
        setRecentTransactions(transactionsData.transactions);
      }
    } catch (error) {
      console.error('Failed to fetch payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const testPaymentSystem = async (systemName: string) => {
    try {
      const response = await fetch('/api/payments/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system: systemName })
      });

      if (response.ok) {
        fetchPaymentData();
      }
    } catch (error) {
      console.error('Failed to test payment system:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTransactionStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-600';
      case 'pending': return 'text-yellow-600';
      case 'failed': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const formatCurrency = (amount: number, currency: string = 'KES') => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatProcessingTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Activity className="h-12 w-12 animate-pulse mx-auto mb-4" />
          <p className="text-lg font-medium">Loading Payment Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payment Systems Dashboard</h1>
          <p className="text-muted-foreground">African Payment Integration Control Center</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1h">1 Hour</SelectItem>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchPaymentData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Payment Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalTransactions.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              Last {selectedPeriod === '1h' ? 'hour' : selectedPeriod === '24h' ? '24 hours' : selectedPeriod}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(metrics.successRate * 100)}%</div>
            <Progress value={metrics.successRate * 100} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Volume</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalVolume)}</div>
            <p className="text-xs text-muted-foreground">
              Avg: {formatCurrency(metrics.averageTransactionValue)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Processing Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatProcessingTime(metrics.processingTime)}</div>
            <p className="text-xs text-muted-foreground">Average response time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Systems</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {paymentSystems.filter(s => s.status === 'active').length}/{paymentSystems.length}
            </div>
            <p className="text-xs text-muted-foreground">Payment systems</p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Systems Status */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Systems Status</CardTitle>
          <CardDescription>
            Real-time status of all integrated payment systems
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {paymentSystems.map((system) => (
              <Card key={system.name} className="relative">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-full ${
                        system.status === 'active' ? 'bg-green-100' :
                        system.status === 'error' ? 'bg-red-100' : 'bg-gray-100'
                      }`}>
                        {system.icon}
                      </div>
                      <div>
                        <h3 className="font-semibold">{system.name}</h3>
                        <Badge className={getStatusColor(system.status)}>
                          {system.status}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span>Transactions</span>
                      <span className="font-medium">{system.transactions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Volume</span>
                      <span className="font-medium">{formatCurrency(system.volume)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Success Rate</span>
                      <span className="font-medium">{Math.round(system.successRate * 100)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Last Activity</span>
                      <span className="font-medium">
                        {system.lastActivity.toLocaleTimeString()}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 flex space-x-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testPaymentSystem(system.name)}
                      disabled={system.status !== 'active'}
                    >
                      Test
                    </Button>
                    <Button size="sm" variant="outline">
                      <Settings className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Detailed Tabs */}
      <Tabs defaultValue="transactions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="transactions">Recent Transactions</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Recent Transactions</CardTitle>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <div className="text-center py-8">
                  <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No recent transactions</p>
                  <p className="text-sm text-muted-foreground">Transactions will appear here once they start processing</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentTransactions.map((transaction) => (
                    <div key={transaction.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2 rounded-full ${
                          transaction.status === 'success' ? 'bg-green-100' :
                          transaction.status === 'pending' ? 'bg-yellow-100' : 'bg-red-100'
                        }`}>
                          {transaction.status === 'success' ? <CheckCircle className="h-4 w-4 text-green-600" /> :
                           transaction.status === 'pending' ? <Clock className="h-4 w-4 text-yellow-600" /> :
                           <XCircle className="h-4 w-4 text-red-600" />}
                        </div>
                        <div>
                          <p className="font-medium">{transaction.system}</p>
                          <p className="text-sm text-muted-foreground">{transaction.type}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatCurrency(transaction.amount)}</p>
                        <p className="text-xs text-muted-foreground">
                          {transaction.timestamp.toLocaleString()}
                        </p>
                        {transaction.processingTime && (
                          <p className="text-xs text-muted-foreground">
                            {formatProcessingTime(transaction.processingTime)}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Transaction Volume Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Volume chart would be displayed here</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Success Rate by System</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {paymentSystems.map((system) => (
                    <div key={system.name} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>{system.name}</span>
                        <span>{Math.round(system.successRate * 100)}%</span>
                      </div>
                      <Progress value={system.successRate * 100} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Payment System Configuration</CardTitle>
              <CardDescription>
                Configure payment system settings and preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-medium">MPesa Configuration</h3>
                  <div className="space-y-2">
                    <Label htmlFor="mpesa-shortcode">Short Code</Label>
                    <Input id="mpesa-shortcode" placeholder="174379" disabled />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mpesa-environment">Environment</Label>
                    <Select defaultValue="sandbox">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sandbox">Sandbox</SelectItem>
                        <SelectItem value="production">Production</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-medium">General Settings</h3>
                  <div className="space-y-2">
                    <Label htmlFor="default-currency">Default Currency</Label>
                    <Select defaultValue="KES">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="KES">Kenyan Shilling (KES)</SelectItem>
                        <SelectItem value="UGX">Ugandan Shilling (UGX)</SelectItem>
                        <SelectItem value="TZS">Tanzanian Shilling (TZS)</SelectItem>
                        <SelectItem value="USD">US Dollar (USD)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeout">Transaction Timeout (seconds)</Label>
                    <Input id="timeout" type="number" defaultValue="60" disabled />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}