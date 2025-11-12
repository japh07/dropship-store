'use client';

import React, { useState } from 'react';
import { PluginProvider, usePlugin } from '@/hooks/use-plugin';
import {
  Store,
  Package,
  Download,
  Star,
  TrendingUp,
  DollarSign,
  Users,
  Eye,
  Filter,
  Search,
  Plus,
  Upload,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  BarChart3
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function MarketplaceContent() {
  const { plugins, loading } = usePlugin();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Mock data for demonstration
  const mockMetrics = {
    totalPlugins: 24,
    activePlugins: 18,
    totalDownloads: 45678,
    totalRevenue: 124560.50,
    averageRating: 4.2,
    pendingSubmissions: 5,
    activeDevelopers: 12
  };

  const mockSubmissions = [
    {
      id: '1',
      name: 'Advanced Analytics',
      developer: 'DataCorp Inc.',
      category: 'Analytics',
      version: '1.0.0',
      status: 'pending',
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      description: 'Advanced analytics dashboard with real-time insights',
      price: 29.99,
      downloads: 0,
      rating: 0,
      reviews: []
    },
    {
      id: '2',
      name: 'Smart Inventory',
      developer: 'LogiTech Solutions',
      category: 'Inventory',
      version: '2.1.0',
      status: 'approved',
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      description: 'AI-powered inventory management system',
      price: 49.99,
      downloads: 234,
      rating: 4.5,
      reviews: [
        { author: 'Store Manager', rating: 5, comment: 'Excellent plugin!' },
        { author: 'E-commerce Owner', rating: 4, comment: 'Very helpful' }
      ]
    },
    {
      id: '3',
      name: 'Email Marketing Pro',
      developer: 'Marketing Tools Co.',
      category: 'Marketing',
      version: '3.0.0',
      status: 'rejected',
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      description: 'Comprehensive email marketing automation',
      price: 39.99,
      downloads: 0,
      rating: 0,
      reviews: [],
      rejectionReason: 'Security vulnerabilities found in code review'
    }
  ];

  const mockRevenueData = [
    { month: 'Jan', revenue: 8450, downloads: 1250 },
    { month: 'Feb', revenue: 9230, downloads: 1420 },
    { month: 'Mar', revenue: 10150, downloads: 1680 },
    { month: 'Apr', revenue: 11200, downloads: 1890 },
    { month: 'Feb', revenue: 12560, downloads: 2100 },
    { month: 'Jun', revenue: 124560.50, downloads: 45678 }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
      default:
        return <Badge variant="secondary">Unknown</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Marketplace Management</h1>
          <p className="text-gray-600">Manage plugins, submissions, and revenue</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import Plugin
          </Button>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Plugin
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Plugins</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.totalPlugins}</div>
            <p className="text-xs text-muted-foreground">
              {mockMetrics.activePlugins} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Downloads</CardTitle>
            <Download className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.totalDownloads.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +23% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${mockMetrics.totalRevenue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              +18% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reviews</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{mockMetrics.pendingSubmissions}</div>
            <p className="text-xs text-muted-foreground">
              {mockMetrics.activeDevelopers} active developers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Revenue Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Revenue Overview</CardTitle>
          <CardDescription>
            Monthly revenue and download trends
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium mb-4">Revenue Trend</h4>
              <div className="space-y-2">
                {mockRevenueData.slice(-6).map((data) => (
                  <div key={data.month} className="flex items-center justify-between">
                    <span className="text-sm">{data.month}</span>
                    <span className="text-sm font-medium">${data.revenue.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-sm font-medium mb-4">Download Trend</h4>
              <div className="space-y-2">
                {mockRevenueData.slice(-6).map((data) => (
                  <div key={data.month} className="flex items-center justify-between">
                    <span className="text-sm">{data.month}</span>
                    <span className="text-sm font-medium">{data.downloads.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plugin Submissions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Plugin Submissions</CardTitle>
              <CardDescription>
                Review and manage plugin submissions from developers
              </CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search submissions..."
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
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border rounded-md text-sm"
              >
                <option value="all">All Categories</option>
                <option value="analytics">Analytics</option>
                <option value="inventory">Inventory</option>
                <option value="marketing">Marketing</option>
              </select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockSubmissions.map((submission) => (
              <div key={submission.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    <AvatarFallback>
                      {submission.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(submission.status)}
                    <div>
                      <h3 className="font-medium">{submission.name}</h3>
                      <p className="text-sm text-gray-500">
                        {submission.developer} • {submission.category} • v{submission.version}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">{submission.description}</p>
                      {submission.rejectionReason && (
                        <p className="text-sm text-red-600 mt-1">
                          Rejection: {submission.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-6">
                  {/* Status */}
                  <div>
                    {getStatusBadge(submission.status)}
                  </div>

                  {/* Price */}
                  <div className="text-center">
                    <div className="text-lg font-semibold">${submission.price}</div>
                    <div className="text-sm text-gray-500">Price</div>
                  </div>

                  {/* Downloads */}
                  <div className="text-center">
                    <div className="text-lg font-semibold">{submission.downloads.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Downloads</div>
                  </div>

                  {/* Rating */}
                  <div className="text-center">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="text-lg font-semibold">
                        {submission.rating > 0 ? submission.rating.toFixed(1) : 'N/A'}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">
                      {submission.reviews.length} reviews
                    </div>
                  </div>

                  {/* Submitted Date */}
                  <div className="text-center">
                    <div className="text-sm font-medium">
                      {submission.submittedAt.toLocaleDateString()}
                    </div>
                    <div className="text-sm text-gray-500">
                      {Math.floor((Date.now() - submission.submittedAt.getTime()) / (24 * 60 * 60 * 1000))} days ago
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Eye className="w-4 h-4 mr-1" />
                      Review
                    </Button>
                    {submission.status === 'pending' && (
                      <>
                        <Button variant="outline" size="sm" className="text-green-600">
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600">
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Top Performing Plugins */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Performing Plugins</CardTitle>
            <CardDescription>
              Highest rated and most downloaded plugins
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Advanced Analytics', downloads: 5432, rating: 4.8, revenue: 5432.50 },
                { name: 'Smart Inventory', downloads: 3210, rating: 4.5, revenue: 3210.00 },
                { name: 'Email Marketing Pro', downloads: 2876, rating: 4.3, revenue: 2876.00 },
                { name: 'Social Media Integration', downloads: 2341, rating: 4.2, revenue: 2341.00 }
              ].map((plugin, index) => (
                <div key={plugin.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full">
                      <span className="text-blue-800 font-semibold text-sm">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-medium">{plugin.name}</div>
                      <div className="text-sm text-gray-500">
                        {plugin.downloads.toLocaleString()} downloads
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center space-x-1">
                      <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      <span className="font-semibold">{plugin.rating}</span>
                    </div>
                    <div className="text-sm text-gray-500">${plugin.revenue.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Developer Activity</CardTitle>
            <CardDescription>
              Most active plugin developers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'DataCorp Inc.', plugins: 5, totalDownloads: 15432, revenue: 15432.50 },
                { name: 'LogiTech Solutions', plugins: 3, totalDownloads: 8765, revenue: 8765.00 },
                { name: 'Marketing Tools Co.', plugins: 4, totalDownloads: 6543, revenue: 6543.00 },
                { name: 'E-commerce Experts', plugins: 2, totalDownloads: 4321, revenue: 4321.00 }
              ].map((developer, index) => (
                <div key={developer.name} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {developer.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{developer.name}</div>
                      <div className="text-sm text-gray-500">
                        {developer.plugins} plugins • {developer.totalDownloads.toLocaleString()} downloads
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">${developer.revenue.toLocaleString()}</div>
                    <div className="text-sm text-gray-500">Total Revenue</div>
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

export default function MarketplacePage() {
  return (
    <PluginProvider>
      <MarketplaceContent />
    </PluginProvider>
  );
}