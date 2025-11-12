'use client';

import React, { useState } from 'react';
import { VRMProvider, useVRM } from '@/hooks/use-vrm';
import { PluginProvider } from '@/hooks/use-plugin';
import { VRMDashboard } from '@/components/vrm';
import {
  Package,
  TrendingUp,
  AlertTriangle,
  Plus,
  Search,
  Filter,
  Download,
  Star,
  Truck,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function VRMContent() {
  const { vendors, scorecards, alerts, metrics, loading, createVendor } = useVRM();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Mock data for demonstration
  const mockVendors = [
    {
      id: '1',
      name: 'TechSupply Co.',
      category: 'Electronics',
      status: 'active',
      reliability: {
        averageRating: 4.5,
        totalOrders: 234,
        onTimeDeliveryRate: 92.5,
        issueHistory: []
      },
      metrics: {
        totalOrders: 234,
        averageLeadTime: 3,
        onTimeDeliveryRate: 92.5
      },
      performance: {
        overallScore: 85,
        quality: 90,
        delivery: 85,
        communication: 80,
        pricing: 85
      },
      contact: {
        email: 'contact@techsupply.com',
        phone: '+1-555-0123'
      }
    },
    {
      id: '2',
      name: 'Global Distributors',
      category: 'General',
      status: 'active',
      reliability: {
        averageRating: 3.8,
        totalOrders: 156,
        onTimeDeliveryRate: 78.2,
        issueHistory: [
          { type: 'delivery', severity: 'medium', description: 'Late shipment', date: new Date() }
        ]
      },
      metrics: {
        totalOrders: 156,
        averageLeadTime: 5,
        onTimeDeliveryRate: 78.2
      },
      performance: {
        overallScore: 72,
        quality: 75,
        delivery: 70,
        communication: 70,
        pricing: 75
      },
      contact: {
        email: 'info@globaldist.com',
        phone: '+1-555-0456'
      }
    },
    {
      id: '3',
      name: 'QuickShip Supplies',
      category: 'Fast Moving',
      status: 'warning',
      reliability: {
        averageRating: 2.9,
        totalOrders: 89,
        onTimeDeliveryRate: 65.1,
        issueHistory: [
          { type: 'quality', severity: 'high', description: 'Product defects', date: new Date() },
          { type: 'delivery', severity: 'medium', description: 'Multiple delays', date: new Date() }
        ]
      },
      metrics: {
        totalOrders: 89,
        averageLeadTime: 7,
        onTimeDeliveryRate: 65.1
      },
      performance: {
        overallScore: 58,
        quality: 60,
        delivery: 55,
        communication: 60,
        pricing: 60
      },
      contact: {
        email: 'support@quickship.com',
        phone: '+1-555-0789'
      }
    }
  ];

  const mockAlerts = [
    {
      id: '1',
      vendorId: '3',
      type: 'performance',
      severity: 'warning',
      title: 'Performance Decline',
      message: 'QuickShip Supplies performance score dropped below 60',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      acknowledged: false
    },
    {
      id: '2',
      vendorId: '2',
      type: 'delivery',
      severity: 'medium',
      title: 'Delivery Delay',
      message: 'Global Distributors missed delivery deadline',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000),
      acknowledged: false
    }
  ];

  const mockMetrics = {
    totalVendors: mockVendors.length,
    activeVendors: mockVendors.filter(v => v.status === 'active').length,
    averageRating: mockVendors.reduce((sum, v) => sum + v.reliability.averageRating, 0) / mockVendors.length,
    totalOrders: mockVendors.reduce((sum, v) => sum + v.metrics.totalOrders, 0),
    onTimeDeliveryRate: mockVendors.reduce((sum, v) => sum + v.metrics.onTimeDeliveryRate, 0) / mockVendors.length,
    averageLeadTime: mockVendors.reduce((sum, v) => sum + v.metrics.averageLeadTime, 0) / mockVendors.length,
    totalIssues: mockVendors.reduce((sum, v) => sum + v.reliability.issueHistory.length, 0),
    criticalIssues: mockVendors.reduce((sum, v) =>
      sum + v.reliability.issueHistory.filter(i => i.severity === 'high').length, 0
    )
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'inactive':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceLevel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 80) return 'Good';
    if (score >= 70) return 'Fair';
    return 'Poor';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Relationship Management</h1>
          <p className="text-gray-600">Manage vendor relationships and monitor performance</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export Reports
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Use VRMDashboard Component */}
      <VRMDashboard
        vendors={mockVendors}
        scorecards={mockVendors.reduce((acc, vendor) => ({
          ...acc,
          [vendor.id]: vendor.performance
        }), {})}
        alerts={mockAlerts}
        metrics={mockMetrics}
        onCreateVendor={() => console.log('Create vendor')}
        onViewVendor={(vendor) => console.log('View vendor:', vendor)}
        onViewAlerts={() => console.log('View alerts')}
      />

      {/* Vendor List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Vendors</CardTitle>
              <CardDescription>
                Complete vendor inventory and performance data
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="warning">Warning</option>
                <option value="inactive">Inactive</option>
              </select>
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                More Filters
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockVendors.map((vendor) => (
              <div key={vendor.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>
                      {vendor.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(vendor.status)}
                    <div>
                      <h3 className="font-medium">{vendor.name}</h3>
                      <p className="text-sm text-gray-500">{vendor.category} • {vendor.contact.email}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <Badge variant="outline">{vendor.contact.phone}</Badge>
                        <div className="flex items-center space-x-1">
                          <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          <span className="text-sm">{vendor.reliability.averageRating.toFixed(1)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  {/* Performance Score */}
                  <div className="text-center">
                    <div className={`text-2xl font-bold ${getScoreColor(vendor.performance.overallScore)}`}>
                      {vendor.performance.overallScore}
                    </div>
                    <div className="text-sm text-gray-500">{getPerformanceLevel(vendor.performance.overallScore)}</div>
                  </div>

                  {/* Order Metrics */}
                  <div className="text-center">
                    <div className="text-lg font-semibold">{vendor.metrics.totalOrders}</div>
                    <div className="text-sm text-gray-500">Orders</div>
                  </div>

                  {/* Delivery Performance */}
                  <div className="text-center">
                    <div className="text-lg font-semibold">{vendor.metrics.onTimeDeliveryRate.toFixed(1)}%</div>
                    <div className="text-sm text-gray-500">On-Time</div>
                  </div>

                  {/* Lead Time */}
                  <div className="text-center">
                    <div className="text-lg font-semibold">{vendor.metrics.averageLeadTime}d</div>
                    <div className="text-sm text-gray-500">Lead Time</div>
                  </div>

                  {/* Issues */}
                  <div className="text-center">
                    <div className="text-lg font-semibold text-red-600">{vendor.reliability.issueHistory.length}</div>
                    <div className="text-sm text-gray-500">Issues</div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      View Details
                    </Button>
                    <Button variant="outline" size="sm">
                      Contact
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Metrics Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Performance Breakdown</CardTitle>
            <CardDescription>
              Average performance scores across all vendors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Quality', value: 85, color: 'bg-blue-500' },
                { name: 'Delivery', value: 78, color: 'bg-green-500' },
                { name: 'Communication', value: 72, color: 'bg-yellow-500' },
                { name: 'Pricing', value: 80, color: 'bg-purple-500' }
              ].map((metric) => (
                <div key={metric.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{metric.name}</span>
                    <span className="text-sm text-gray-500">{metric.value}%</span>
                  </div>
                  <Progress value={metric.value} className="h-2" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendor Categories</CardTitle>
            <CardDescription>
              Distribution of vendors by category
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Electronics', count: 1, percentage: 33.3 },
                { name: 'General', count: 1, percentage: 33.3 },
                { name: 'Fast Moving', count: 1, percentage: 33.3 }
              ].map((category) => (
                <div key={category.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">{category.name}</div>
                    <div className="text-sm text-gray-500">{category.count} vendors</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{category.percentage}%</div>
                    <Progress value={category.percentage} className="h-2 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function VRMPage() {
  return (
    <PluginProvider>
      <VRMProvider>
        <VRMContent />
      </VRMProvider>
    </PluginProvider>
  );
}