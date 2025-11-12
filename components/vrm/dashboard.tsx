'use client';

import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  AlertTriangle,
  Users,
  DollarSign,
  Star,
  Activity,
  Bell,
  Plus,
  Download,
  Eye
} from 'lucide-react';

import { Vendor, VendorScorecard, SupplierAlert } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface VRMDashboardProps {
  vendors: Vendor[];
  scorecards: Record<string, VendorScorecard>;
  alerts: SupplierAlert[];
  metrics: {
    totalVendors: number;
    activeVendors: number;
    averageRating: number;
    totalOrders: number;
    onTimeDeliveryRate: number;
    averageLeadTime: number;
    totalIssues: number;
    criticalIssues: number;
  };
  onCreateVendor?: () => void;
  onViewVendor?: (vendor: Vendor) => void;
  onViewAlerts?: () => void;
  className?: string;
}

export function VRMDashboard({
  vendors,
  scorecards,
  alerts,
  metrics,
  onCreateVendor,
  onViewVendor,
  onViewAlerts,
  className = ''
}: VRMDashboardProps) {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  // Calculate additional metrics
  const topPerformers = vendors
    .filter(v => scorecards[v.id])
    .sort((a, b) => (scorecards[b.id]?.overallScore || 0) - (scorecards[a.id]?.overallScore || 0))
    .slice(0, 5);

  const vendorsNeedingAttention = vendors
    .filter(v => {
      const score = scorecards[v.id]?.overallScore || 0;
      return score < 70;
    })
    .slice(0, 5);

  const recentAlerts = alerts
    .filter(a => !a.acknowledged)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .slice(0, 5);

  const getPerformanceTrend = () => {
    // Simplified trend calculation - in real implementation would use historical data
    const avgScore = vendors.length > 0 ?
      vendors.reduce((sum, v) => sum + (scorecards[v.id]?.overallScore || 0), 0) / vendors.length : 0;

    return {
      trend: avgScore > 75 ? 'up' : avgScore < 60 ? 'down' : 'stable',
      value: avgScore > 75 ? 5.2 : avgScore < 60 ? -3.1 : 0.8
    };
  };

  const getDeliveryTrend = () => {
    return {
      trend: metrics.onTimeDeliveryRate > 85 ? 'up' : metrics.onTimeDeliveryRate < 70 ? 'down' : 'stable',
      value: metrics.onTimeDeliveryRate > 85 ? 2.3 : metrics.onTimeDeliveryRate < 70 ? -4.5 : 0.5
    };
  };

  const performanceTrend = getPerformanceTrend();
  const deliveryTrend = getDeliveryTrend();

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      case 'stable':
        return 'text-gray-600';
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Vendor Management</h1>
          <p className="text-gray-600">
            Monitor vendor performance and manage relationships
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={onViewAlerts}>
            <Bell className="w-4 h-4 mr-2" />
            View Alerts
            {recentAlerts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {recentAlerts.length}
              </Badge>
            )}
          </Button>
          <Button onClick={onCreateVendor}>
            <Plus className="w-4 h-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total Vendors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Vendors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalVendors}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.activeVendors} active
            </p>
          </CardContent>
        </Card>

        {/* Average Rating */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{metrics.averageRating.toFixed(1)}</div>
              {getTrendIcon(performanceTrend.trend)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className={getTrendColor(performanceTrend.trend)}>
                {performanceTrend.value > 0 ? '+' : ''}{performanceTrend.value}% from last period
              </span>
            </p>
          </CardContent>
        </Card>

        {/* On-Time Delivery */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On-Time Delivery</CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="text-2xl font-bold">{metrics.onTimeDeliveryRate.toFixed(1)}%</div>
              {getTrendIcon(deliveryTrend.trend)}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className={getTrendColor(deliveryTrend.trend)}>
                {deliveryTrend.value > 0 ? '+' : ''}{deliveryTrend.value}% from last period
              </span>
            </p>
          </CardContent>
        </Card>

        {/* Critical Issues */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Critical Issues</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{metrics.criticalIssues}</div>
            <p className="text-xs text-muted-foreground">
              {metrics.totalIssues} total issues
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Star className="w-5 h-5 mr-2 text-green-500" />
              Top Performers
            </CardTitle>
            <CardDescription>
              Vendors with the highest performance scores
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.length > 0 ? (
                topPerformers.map((vendor, index) => {
                  const scorecard = scorecards[vendor.id];
                  const score = scorecard?.overallScore || 0;

                  return (
                    <div key={vendor.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-full">
                          <span className="text-green-800 font-semibold text-sm">
                            {index + 1}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-sm">{vendor.name}</div>
                          <div className="text-xs text-gray-500">
                            {vendor.metrics.totalOrders} orders
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">{score}</div>
                        <div className="text-xs text-gray-500">Score</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-center text-gray-500 py-4">No vendors available</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Vendors Needing Attention */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <AlertTriangle className="w-5 h-5 mr-2 text-yellow-500" />
              Needs Attention
            </CardTitle>
            <CardDescription>
              Vendors with performance scores below 70
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {vendorsNeedingAttention.length > 0 ? (
                vendorsNeedingAttention.map((vendor) => {
                  const scorecard = scorecards[vendor.id];
                  const score = scorecard?.overallScore || 0;

                  return (
                    <div key={vendor.id} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-full">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        </div>
                        <div>
                          <div className="font-medium text-sm">{vendor.name}</div>
                          <div className="text-xs text-gray-500">
                            Score: {score}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onViewVendor?.(vendor)}
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        Review
                      </Button>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">All vendors performing well</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Alerts */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center">
                <Bell className="w-5 h-5 mr-2 text-red-500" />
                Recent Alerts
              </div>
              {recentAlerts.length > 0 && (
                <Badge variant="destructive">{recentAlerts.length}</Badge>
              )}
            </CardTitle>
            <CardDescription>
              Unacknowledged alerts from the last 24 hours
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentAlerts.length > 0 ? (
                recentAlerts.map((alert) => {
                  const vendor = vendors.find(v => v.id === alert.vendorId);

                  return (
                    <div key={alert.id} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-red-900">
                            {alert.title}
                          </div>
                          <div className="text-xs text-red-700 mt-1">
                            {vendor?.name || 'Unknown Vendor'}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(alert.createdAt).toLocaleTimeString()}
                          </div>
                        </div>
                        <Badge
                          variant={alert.severity === 'critical' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          {alert.severity}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-4">
                  <CheckCircle className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No new alerts</p>
                </div>
              )}
            </div>

            {recentAlerts.length > 0 && (
              <div className="mt-4">
                <Button variant="outline" size="sm" className="w-full" onClick={onViewAlerts}>
                  View All Alerts
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Vendor Performance Distribution */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Distribution</CardTitle>
          <CardDescription>
            Overview of vendor performance across all suppliers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Excellent (90-100) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Excellent</span>
                <span className="text-sm text-gray-600">
                  {vendors.filter(v => {
                    const score = scorecards[v.id]?.overallScore || 0;
                    return score >= 90;
                  }).length} vendors
                </span>
              </div>
              <Progress
                value={(vendors.filter(v => {
                  const score = scorecards[v.id]?.overallScore || 0;
                  return score >= 90;
                }).length / vendors.length) * 100}
                className="h-2"
              />
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-xs text-gray-600">90-100 score</span>
              </div>
            </div>

            {/* Good (80-89) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Good</span>
                <span className="text-sm text-gray-600">
                  {vendors.filter(v => {
                    const score = scorecards[v.id]?.overallScore || 0;
                    return score >= 80 && score < 90;
                  }).length} vendors
                </span>
              </div>
              <Progress
                value={(vendors.filter(v => {
                  const score = scorecards[v.id]?.overallScore || 0;
                  return score >= 80 && score < 90;
                }).length / vendors.length) * 100}
                className="h-2"
              />
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span className="text-xs text-gray-600">80-89 score</span>
              </div>
            </div>

            {/* Fair (70-79) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Fair</span>
                <span className="text-sm text-gray-600">
                  {vendors.filter(v => {
                    const score = scorecards[v.id]?.overallScore || 0;
                    return score >= 70 && score < 80;
                  }).length} vendors
                </span>
              </div>
              <Progress
                value={(vendors.filter(v => {
                  const score = scorecards[v.id]?.overallScore || 0;
                  return score >= 70 && score < 80;
                }).length / vendors.length) * 100}
                className="h-2"
              />
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-xs text-gray-600">70-79 score</span>
              </div>
            </div>

            {/* Poor (Below 70) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Poor</span>
                <span className="text-sm text-gray-600">
                  {vendors.filter(v => {
                    const score = scorecards[v.id]?.overallScore || 0;
                    return score < 70;
                  }).length} vendors
                </span>
              </div>
              <Progress
                value={(vendors.filter(v => {
                  const score = scorecards[v.id]?.overallScore || 0;
                  return score < 70;
                }).length / vendors.length) * 100}
                className="h-2"
              />
              <div className="flex items-center space-x-1 mt-1">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-xs text-gray-600">Below 70 score</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VRMDashboard;