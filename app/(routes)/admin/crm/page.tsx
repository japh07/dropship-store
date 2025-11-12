'use client';

import React, { useState } from 'react';
import { CRMProvider, useCRM } from '@/hooks/use-crm';
import { PluginProvider } from '@/hooks/use-plugin';
import {
  Users,
  UserPlus,
  TrendingUp,
  Mail,
  Target,
  Award,
  Calendar,
  Filter,
  Search,
  Download,
  BarChart3
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';

function CRMContent() {
  const { customers, segments, campaigns, loading } = useCRM();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSegment, setSelectedSegment] = useState('all');

  // Mock data for demonstration
  const mockMetrics = {
    totalCustomers: 3456,
    newCustomers: 123,
    activeCustomers: 2341,
    averageOrderValue: 156.80,
    customerLifetimeValue: 2456.50,
    retentionRate: 78.5
  };

  const mockSegments = [
    { id: '1', name: 'VIP Customers', count: 234, growth: 12.5 },
    { id: '2', name: 'New Subscribers', count: 456, growth: 45.2 },
    { id: '3', name: 'Inactive', count: 123, growth: -8.3 },
    { id: '4', name: 'High Value', count: 89, growth: 23.1 }
  ];

  const mockCampaigns = [
    {
      id: '1',
      name: 'Summer Sale 2024',
      status: 'active',
      sent: 2340,
      opened: 1872,
      clicked: 456,
      revenue: 12450.00
    },
    {
      id: '2',
      name: 'Welcome Series',
      status: 'active',
      sent: 567,
      opened: 489,
      clicked: 234,
      revenue: 3450.00
    },
    {
      id: '3',
      name: 'Product Launch',
      status: 'draft',
      sent: 0,
      opened: 0,
      clicked: 0,
      revenue: 0
    }
  ];

  const mockCustomers = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      avatar: '/avatars/customer1.jpg',
      segment: 'VIP Customers',
      totalOrders: 45,
      totalSpent: 5432.50,
      lastOrder: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      status: 'active'
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatar: '/avatars/customer2.jpg',
      segment: 'New Subscribers',
      totalOrders: 2,
      totalSpent: 234.80,
      lastOrder: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      status: 'active'
    },
    {
      id: '3',
      name: 'Bob Johnson',
      email: 'bob@example.com',
      avatar: '/avatars/customer3.jpg',
      segment: 'Inactive',
      totalOrders: 12,
      totalSpent: 1234.00,
      lastOrder: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      status: 'inactive'
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customer Relationship Management</h1>
          <p className="text-gray-600">Manage customers, segments, and marketing campaigns</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Data
          </Button>
          <Button>
            <UserPlus className="w-4 h-4 mr-2" />
            Add Customer
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.totalCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              <span className="text-green-600">+{mockMetrics.newCustomers}</span> new this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Customers</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.activeCustomers.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {mockMetrics.retentionRate}% retention rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mockMetrics.averageOrderValue}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Lifetime Value</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mockMetrics.customerLifetimeValue}</div>
            <p className="text-xs text-muted-foreground">
              Per customer
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Customer Segments */}
      <Card>
        <CardHeader>
          <CardTitle>Customer Segments</CardTitle>
          <CardDescription>
            Overview of customer segments and their performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {mockSegments.map((segment) => (
              <div key={segment.id} className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-medium">{segment.name}</h3>
                  <Badge variant={segment.growth > 0 ? "default" : "secondary"}>
                    {segment.growth > 0 ? '+' : ''}{segment.growth}%
                  </Badge>
                </div>
                <div className="text-2xl font-bold">{segment.count}</div>
                <div className="text-sm text-gray-500">customers</div>
                <Progress
                  value={(segment.count / mockMetrics.totalCustomers) * 100}
                  className="mt-2 h-2"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Campaigns */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Campaigns</CardTitle>
          <CardDescription>
            Performance of recent marketing campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockCampaigns.map((campaign) => (
              <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${
                    campaign.status === 'active' ? 'bg-green-500' : 'bg-gray-300'
                  }`} />
                  <div>
                    <h3 className="font-medium">{campaign.name}</h3>
                    <p className="text-sm text-gray-500">
                      {campaign.sent.toLocaleString()} sent • {campaign.opened.toLocaleString()} opened • {campaign.clicked.toLocaleString()} clicked
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${campaign.revenue.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">revenue</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recent Customers */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Customers</CardTitle>
              <CardDescription>
                Latest customer activity and interactions
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search customers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filter
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockCustomers.map((customer) => (
              <div key={customer.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarImage src={customer.avatar} alt={customer.name} />
                    <AvatarFallback>
                      {customer.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-medium">{customer.name}</h3>
                    <p className="text-sm text-gray-500">{customer.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline">{customer.segment}</Badge>
                      <Badge variant={customer.status === 'active' ? 'default' : 'secondary'}>
                        {customer.status}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">${customer.totalSpent.toLocaleString()}</div>
                  <div className="text-sm text-gray-500">{customer.totalOrders} orders</div>
                  <div className="text-xs text-gray-400">
                    Last order: {customer.lastOrder.toLocaleDateString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CRMPage() {
  return (
    <PluginProvider>
      <CRMProvider>
        <CRMContent />
      </CRMProvider>
    </PluginProvider>
  );
}