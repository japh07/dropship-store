'use client';

import React, { useState } from 'react';
import { PluginProvider } from '@/hooks/use-plugin';
import {
  BarChart3,
  LineChart,
  PieChart,
  TrendingUp,
  Users,
  ShoppingCart,
  DollarSign,
  Package,
  Eye,
  Filter,
  Search,
  Download,
  Calendar,
  RefreshCw,
  Target,
  Activity
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

function AnalyticsContent() {
  const [dateRange, setDateRange] = useState('30d');
  const [searchTerm, setSearchTerm] = useState('');

  // Mock analytics data
  const mockMetrics = {
    totalRevenue: 234567.89,
    totalOrders: 3456,
    totalVisitors: 12543,
    conversionRate: 27.5,
    averageOrderValue: 67.89,
    customerLifetimeValue: 456.78,
    bounceRate: 34.2,
    averageSessionDuration: 245
  };

  const mockRevenueData = [
    { month: 'Jan', revenue: 125000, orders: 1890, visitors: 8234 },
    { month: 'Feb', revenue: 145000, orders: 2100, visitors: 9456 },
    { month: 'Mar', revenue: 167000, orders: 2340, visitors: 10234 },
    { month: 'Apr', revenue: 189000, orders: 2567, visitors: 11456 },
    { month: 'May', revenue: 198000, orders: 2789, visitors: 12345 },
    { month: 'Jun', revenue: 234567, orders: 3456, visitors: 12543 }
  ];

  const mockTopProducts = [
    { name: 'Premium Widget Pro', sales: 234, revenue: 23400.00, growth: 12.5 },
    { name: 'Smart Gadget X', sales: 189, revenue: 18900.00, growth: 8.3 },
    { name: 'Ultra Device Plus', sales: 156, revenue: 15600.00, growth: -2.1 },
    { name: 'Tech Essentials Kit', sales: 134, revenue: 13400.00, growth: 15.7 },
    { name: 'Digital Starter Pack', sales: 98, revenue: 9800.00, growth: 23.4 }
  ];

  const mockTrafficSources = [
    { source: 'Organic Search', visitors: 4567, percentage: 36.4, conversionRate: 3.2 },
    { source: 'Direct', visitors: 3234, percentage: 25.8, conversionRate: 4.1 },
    { source: 'Social Media', visitors: 2345, percentage: 18.7, conversionRate: 2.8 },
    { source: 'Referral', visitors: 1567, percentage: 12.5, conversionRate: 5.2 },
    { source: 'Email', visitors: 830, percentage: 6.6, conversionRate: 8.9 }
  ];

  const mockCustomerSegments = [
    { segment: 'New Customers', count: 1234, percentage: 28.4, avgOrderValue: 45.60 },
    { segment: 'Returning Customers', count: 2222, percentage: 51.1, avgOrderValue: 78.90 },
    { segment: 'VIP Customers', count: 543, percentage: 12.5, avgOrderValue: 156.70 },
    { segment: 'Inactive Customers', count: 344, percentage: 7.9, avgOrderValue: 0 }
  ];

  const mockConversionFunnel = [
    { stage: 'Visitors', count: 12543, percentage: 100, color: 'bg-blue-500' },
    { stage: 'Product Views', count: 8234, percentage: 65.6, color: 'bg-green-500' },
    { stage: 'Add to Cart', count: 4567, percentage: 36.4, color: 'bg-yellow-500' },
    { stage: 'Checkout', count: 3456, percentage: 27.5, color: 'bg-orange-500' },
    { stage: 'Purchase', count: 3456, percentage: 27.5, color: 'bg-red-500' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-600">Store performance metrics and insights</p>
        </div>
        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <Button variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mockMetrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+18.5%</span> from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.totalOrders.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+12.3%</span> from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+2.1%</span> from last period
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mockMetrics.averageOrderValue}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-red-600">-1.2%</span> from last period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="products">Products</TabsTrigger>
          <TabsTrigger value="traffic">Traffic</TabsTrigger>
          <TabsTrigger value="customers">Customers</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Revenue & Orders Chart */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>
                  Monthly revenue performance over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRevenueData.slice(-6).map((data) => (
                    <div key={data.month} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{data.month}</span>
                      <div className="flex items-center space-x-2">
                        <Progress
                          value={(data.revenue / mockRevenueData[mockRevenueData.length - 1].revenue) * 100}
                          className="w-24 h-2"
                        />
                        <span className="text-sm font-semibold">${(data.revenue / 1000).toFixed(0)}k</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Orders & Visitors</CardTitle>
                <CardDescription>
                  Order volume and website traffic correlation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockRevenueData.slice(-6).map((data) => (
                    <div key={data.month} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{data.month}</span>
                        <span className="text-sm text-gray-500">
                          {data.orders} orders • {data.visitors.toLocaleString()} visitors
                        </span>
                      </div>
                      <div className="flex space-x-2">
                        <Progress
                          value={(data.orders / mockRevenueData[mockRevenueData.length - 1].orders) * 100}
                          className="flex-1 h-2"
                        />
                        <Progress
                          value={(data.visitors / mockRevenueData[mockRevenueData.length - 1].visitors) * 100}
                          className="flex-1 h-2 bg-blue-100"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Customer Lifetime Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  ${mockMetrics.customerLifetimeValue}
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Average revenue per customer over their lifetime
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Bounce Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-yellow-600">
                  {mockMetrics.bounceRate}%
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Percentage of visitors who leave without interaction
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Avg Session Duration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-blue-600">
                  {Math.floor(mockMetrics.averageSessionDuration / 60)}m {mockMetrics.averageSessionDuration % 60}s
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  Average time visitors spend on the site
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Products</CardTitle>
              <CardDescription>
                Best-selling products by revenue and growth
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTopProducts.map((product, index) => (
                  <div key={product.name} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                        <span className="text-blue-800 font-semibold text-sm">{index + 1}</span>
                      </div>
                      <div>
                        <div className="font-medium">{product.name}</div>
                        <div className="text-sm text-gray-500">
                          {product.sales} units sold
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="font-semibold">${product.revenue.toLocaleString()}</div>
                        <div className={`text-sm ${product.growth > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {product.growth > 0 ? '+' : ''}{product.growth}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="traffic" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Traffic Sources</CardTitle>
              <CardDescription>
                Website traffic breakdown by source
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockTrafficSources.map((source) => (
                  <div key={source.source} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-4 h-4 bg-blue-500 rounded-full" />
                      <div>
                        <div className="font-medium">{source.source}</div>
                        <div className="text-sm text-gray-500">
                          {source.visitors.toLocaleString()} visitors ({source.percentage}%)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="font-semibold">{source.conversionRate}%</div>
                        <div className="text-sm text-gray-500">Conversion</div>
                      </div>
                      <Progress value={source.percentage} className="w-20 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="customers" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Segments</CardTitle>
              <CardDescription>
                Customer distribution by segment type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockCustomerSegments.map((segment) => (
                  <div key={segment.segment} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="w-4 h-4 bg-green-500 rounded-full" />
                      <div>
                        <div className="font-medium">{segment.segment}</div>
                        <div className="text-sm text-gray-500">
                          {segment.count.toLocaleString()} customers ({segment.percentage}%)
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <div className="text-right">
                        <div className="font-semibold">
                          ${segment.avgOrderValue > 0 ? segment.avgOrderValue.toFixed(2) : 'N/A'}
                        </div>
                        <div className="text-sm text-gray-500">Avg Order Value</div>
                      </div>
                      <Progress value={segment.percentage} className="w-20 h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>
                Customer journey through conversion stages
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockConversionFunnel.map((stage, index) => (
                  <div key={stage.stage} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{stage.stage}</span>
                      <span className="text-sm text-gray-500">
                        {stage.count.toLocaleString()} ({stage.percentage}%)
                      </span>
                    </div>
                    <div className="relative">
                      <Progress value={stage.percentage} className="h-6" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-medium text-white">
                          {stage.percentage}%
                        </span>
                      </div>
                    </div>
                    {index < mockConversionFunnel.length - 1 && (
                      <div className="text-center text-xs text-gray-500">
                        {(mockConversionFunnel[index].percentage - mockConversionFunnel[index + 1].percentage).toFixed(1)}% drop-off
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <PluginProvider>
      <AnalyticsContent />
    </PluginProvider>
  );
}