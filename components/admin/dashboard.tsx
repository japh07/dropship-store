'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  ShoppingCart,
  Package,
  Store,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Activity,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Eye,
  ArrowRight,
  Plus,
  Download,
  RefreshCw
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface AdminDashboardProps {
  storeMetrics?: {
    revenue: {
      total: number;
      today: number;
      thisWeek: number;
      thisMonth: number;
      growth: number;
    };
    orders: {
      total: number;
      today: number;
      thisWeek: number;
      thisMonth: number;
      averageValue: number;
    };
    customers: {
      total: number;
      new: number;
      active: number;
      returning: number;
    };
    products: {
      total: number;
      topSelling: any[];
      lowStock: any[];
    };
    plugins: {
      installed: number;
      active: number;
      updates: number;
      errors: number;
    };
  };
  recentActivity?: Array<{
    id: string;
    type: 'order' | 'customer' | 'vendor' | 'plugin' | 'system';
    title: string;
    description: string;
    timestamp: Date;
    status: 'success' | 'warning' | 'error' | 'info';
  }>;
  onRefresh?: () => void;
  className?: string;
}

export function AdminDashboard({
  storeMetrics,
  recentActivity,
  onRefresh,
  className = ''
}: AdminDashboardProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Mock data if not provided
  const metrics = storeMetrics || {
    revenue: {
      total: 245680,
      today: 2340,
      thisWeek: 12450,
      thisMonth: 45680,
      growth: 12.5
    },
    orders: {
      total: 1245,
      today: 23,
      thisWeek: 145,
      thisMonth: 623,
      averageValue: 156.80
    },
    customers: {
      total: 3456,
      new: 123,
      active: 2341,
      returning: 1115
    },
    products: {
      total: 234,
      topSelling: [],
      lowStock: []
    },
    plugins: {
      installed: 8,
      active: 7,
      updates: 2,
      errors: 1
    }
  };

  const activities = recentActivity || [
    {
      id: '1',
      type: 'order',
      title: 'New order #1234',
      description: 'Customer John Doe placed an order for $234.50',
      timestamp: new Date(Date.now() - 5 * 60 * 1000),
      status: 'success' as const
    },
    {
      id: '2',
      type: 'plugin',
      title: 'Plugin update available',
      description: 'Analytics Plugin v2.1.0 is ready to install',
      timestamp: new Date(Date.now() - 15 * 60 * 1000),
      status: 'info' as const
    },
    {
      id: '3',
      type: 'customer',
      title: 'New customer registered',
      description: 'Jane Smith joined the store',
      timestamp: new Date(Date.now() - 30 * 60 * 1000),
      status: 'success' as const
    },
    {
      id: '4',
      type: 'vendor',
      title: 'Vendor performance alert',
      description: 'Vendor ABC Electronics shows declining performance',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      status: 'warning' as const
    }
  ];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh?.();
      // Simulate refresh delay
      await new Promise(resolve => setTimeout(resolve, 1000));
    } finally {
      setIsRefreshing(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <ShoppingCart className="w-4 h-4" />;
      case 'customer':
        return <Users className="w-4 h-4" />;
      case 'vendor':
        return <Package className="w-4 h-4" />;
      case 'plugin':
        return <Store className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warning':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'info':
        return 'text-blue-600 bg-blue-50 border-blue-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const formatTimeAgo = (date: Date) => {
    const minutes = Math.floor((Date.now() - date.getTime()) / (1000 * 60));
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Activity className="w-4 h-4 text-gray-500" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Overview of your store performance and key metrics
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Revenue */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${metrics.revenue.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                {getTrendIcon(metrics.revenue.growth)}
                <span className={getTrendColor(metrics.revenue.growth)}>
                  {metrics.revenue.growth > 0 ? '+' : ''}{metrics.revenue.growth}% from last month
                </span>
              </div>
            </p>
          </CardContent>
        </Card>

        {/* Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.orders.total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.orders.today} today • {metrics.orders.thisMonth} this month
            </p>
          </CardContent>
        </Card>

        {/* Customers */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.customers.active.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.customers.new} new this month • {metrics.customers.returning} returning
            </p>
          </CardContent>
        </Card>

        {/* Plugins */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Plugins</CardTitle>
            <Store className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.plugins.active}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.plugins.updates} updates available • {metrics.plugins.errors} errors
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and shortcuts for store management
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Plus className="w-6 h-6" />
              <span>Add Product</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Users className="w-6 h-6" />
              <span>View Customers</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Package className="w-6 h-6" />
              <span>Manage Vendors</span>
            </Button>
            <Button variant="outline" className="h-auto p-4 flex flex-col items-center space-y-2">
              <Store className="w-6 h-6" />
              <span>Browse Plugins</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Charts and Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Performance Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Revenue Overview
              <Button variant="outline" size="sm">
                <BarChart3 className="w-4 h-4 mr-2" />
                Details
              </Button>
            </CardTitle>
            <CardDescription>
              Monthly revenue trends and performance indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600">Revenue chart placeholder</p>
                <p className="text-sm text-gray-500 mt-1">
                  Chart component would be integrated here
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Recent Activity
              <Button variant="ghost" size="sm">
                <Eye className="w-4 h-4" />
              </Button>
            </CardTitle>
            <CardDescription>
              Latest events and notifications
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3">
                  <div className={`p-2 rounded-full border ${getActivityColor(activity.status)}`}>
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(activity.timestamp)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {activity.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t">
              <Button variant="outline" size="sm" className="w-full">
                View All Activity
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Plugin System</span>
                <Badge variant="default" className="text-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">CRM</span>
                <Badge variant="default" className="text-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Healthy
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">VRM</span>
                <Badge variant="secondary" className="text-yellow-600">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Warning
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Marketplace</span>
                <Badge variant="default" className="text-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Healthy
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Storage Usage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Database</span>
                  <span className="text-sm text-gray-600">45%</span>
                </div>
                <Progress value={45} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Media Files</span>
                  <span className="text-sm text-gray-600">72%</span>
                </div>
                <Progress value={72} className="h-2" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Logs</span>
                  <span className="text-sm text-gray-600">23%</span>
                </div>
                <Progress value={23} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Performance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Page Load Time</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-green-600">1.2s</span>
                  <TrendingDown className="w-4 h-4 text-green-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">API Response</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-green-600">145ms</span>
                  <TrendingDown className="w-4 h-4 text-green-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Error Rate</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-yellow-600">0.3%</span>
                  <Activity className="w-4 h-4 text-gray-500" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uptime</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-green-600">99.9%</span>
                  <TrendingUp className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default AdminDashboard;