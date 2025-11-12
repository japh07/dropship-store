'use client';

import React from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Star,
  Package,
  Truck,
  MessageSquare,
  DollarSign,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';

import { VendorScorecard, Vendor } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface ScorecardProps {
  vendor: Vendor;
  scorecard: VendorScorecard;
  onRefresh?: () => void;
  showDetails?: boolean;
  className?: string;
}

export function VendorScorecard({
  vendor,
  scorecard,
  onRefresh,
  showDetails = true,
  className = ''
}: ScorecardProps) {
  const getMetricIcon = (metricType: string) => {
    switch (metricType) {
      case 'pricing':
        return <DollarSign className="w-5 h-5" />;
      case 'delivery':
        return <Truck className="w-5 h-5" />;
      case 'quality':
        return <Package className="w-5 h-5" />;
      case 'communication':
        return <MessageSquare className="w-5 h-5" />;
      case 'reliability':
        return <Shield className="w-5 h-5" />;
      default:
        return <Star className="w-5 h-5" />;
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      case 'stable':
        return <Minus className="w-4 h-4 text-gray-500" />;
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return 'bg-green-100';
    if (score >= 60) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  const getOverallRating = (score: number) => {
    if (score >= 90) return { label: 'Excellent', color: 'bg-green-500' };
    if (score >= 80) return { label: 'Very Good', color: 'bg-blue-500' };
    if (score >= 70) return { label: 'Good', color: 'bg-cyan-500' };
    if (score >= 60) return { label: 'Fair', color: 'bg-yellow-500' };
    return { label: 'Poor', color: 'bg-red-500' };
  };

  const overallRating = getOverallRating(scorecard.overallScore);

  const renderRadarChart = () => {
    const metrics = [
      { name: 'Pricing', value: scorecard.metrics.pricing.score, weight: scorecard.metrics.pricing.weight },
      { name: 'Delivery', value: scorecard.metrics.delivery.score, weight: scorecard.metrics.delivery.weight },
      { name: 'Quality', value: scorecard.metrics.quality.score, weight: scorecard.metrics.quality.weight },
      { name: 'Communication', value: scorecard.metrics.communication.score, weight: scorecard.metrics.communication.weight },
      { name: 'Reliability', value: scorecard.metrics.reliability.score, weight: scorecard.metrics.reliability.weight }
    ];

    // Simple SVG radar chart implementation
    const size = 200;
    const center = size / 2;
    const radius = size / 2 - 20;
    const angleStep = (2 * Math.PI) / metrics.length;

    const points = metrics.map((metric, index) => {
      const angle = angleStep * index - Math.PI / 2;
      const value = metric.value / 100;
      const x = center + radius * value * Math.cos(angle);
      const y = center + radius * value * Math.sin(angle);
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="flex justify-center">
        <svg width={size} height={size} className="border rounded-lg bg-gray-50">
          {/* Grid circles */}
          {[20, 40, 60, 80].map((percent) => (
            <circle
              key={percent}
              cx={center}
              cy={center}
              r={(radius * percent) / 100}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}

          {/* Grid lines */}
          {metrics.map((_, index) => {
            const angle = angleStep * index - Math.PI / 2;
            const x = center + radius * Math.cos(angle);
            const y = center + radius * Math.sin(angle);
            return (
              <line
                key={index}
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
              />
            );
          })}

          {/* Data polygon */}
          <polygon
            points={points}
            fill="rgba(59, 130, 246, 0.3)"
            stroke="rgb(59, 130, 246)"
            strokeWidth="2"
          />

          {/* Data points */}
          {metrics.map((_, index) => {
            const angle = angleStep * index - Math.PI / 2;
            const value = metrics[index].value / 100;
            const x = center + radius * value * Math.cos(angle);
            const y = center + radius * value * Math.sin(angle);
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="4"
                fill="rgb(59, 130, 246)"
              />
            );
          })}
        </svg>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-3">
                <span>Vendor Scorecard</span>
                <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>
                  {vendor.status}
                </Badge>
              </CardTitle>
              <CardDescription>
                Performance evaluation for {vendor.name}
              </CardDescription>
            </div>
            {onRefresh && (
              <Button variant="outline" onClick={onRefresh} size="sm">
                Refresh
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {/* Overall Score */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${getScoreBgColor(scorecard.overallScore)} mb-3`}>
                <div className="text-center">
                  <div className={`text-3xl font-bold ${getScoreColor(scorecard.overallScore)}`}>
                    {scorecard.overallScore}
                  </div>
                  <div className="text-xs text-gray-600">Score</div>
                </div>
              </div>
              <div className="flex items-center justify-center space-x-2">
                <div className={`w-3 h-3 rounded-full ${overallRating.color}`}></div>
                <span className="font-medium">{overallRating.label}</span>
              </div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {vendor.metrics.totalOrders}
              </div>
              <div className="text-sm text-gray-600">Total Orders</div>
            </div>

            <div className="text-center">
              <div className="text-2xl font-bold text-gray-900 mb-1">
                {vendor.metrics.onTimeDeliveryRate.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-600">On-Time Delivery</div>
            </div>
          </div>

          {/* Radar Chart */}
          {showDetails && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-4">Performance Overview</h4>
                {renderRadarChart()}
              </div>

              <div>
                <h4 className="font-semibold mb-4">Key Metrics</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Average Lead Time</span>
                    <span className="font-medium">{vendor.metrics.averageLeadTime} days</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Quality Score</span>
                    <span className="font-medium">{vendor.metrics.qualityScore.toFixed(1)}/5</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Reliability Rating</span>
                    <span className="font-medium">{vendor.reliability.averageRating.toFixed(1)}/100</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Months Tracked</span>
                    <span className="font-medium">{vendor.reliability.monthsTracked}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed Metrics */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Detailed Performance Metrics</CardTitle>
            <CardDescription>
              Breakdown of performance across key areas with trend indicators
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Object.entries(scorecard.metrics).map(([key, metric]) => (
                <div key={key} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getMetricIcon(key)}
                      <span className="font-medium capitalize">{key}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${getScoreColor(metric.score)}`}>
                        {metric.score}
                      </span>
                      {getTrendIcon(metric.trend)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>Performance</span>
                      <span>{metric.weight}% weight</span>
                    </div>
                    <Progress value={metric.score} className="h-2" />
                  </div>

                  <div className="text-xs text-gray-500">
                    {metric.trend === 'up' && 'Performance improving'}
                    {metric.trend === 'down' && 'Performance declining'}
                    {metric.trend === 'stable' && 'Performance stable'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Historical Performance */}
      {showDetails && (
        <Card>
          <CardHeader>
            <CardTitle>Performance History</CardTitle>
            <CardDescription>
              Track vendor performance over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Simple performance trend visualization */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Delivery Performance</span>
                    <Badge variant="outline" className="text-green-600">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      +5.2%
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-green-600">
                    {vendor.metrics.onTimeDeliveryRate.toFixed(1)}%
                  </div>
                  <div className="text-sm text-gray-600">On-time delivery rate</div>
                </div>

                <div className="p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">Quality Consistency</span>
                    <Badge variant="outline" className="text-blue-600">
                      <Minus className="w-3 h-3 mr-1" />
                      Stable
                    </Badge>
                  </div>
                  <div className="text-2xl font-bold text-blue-600">
                    {vendor.metrics.qualityScore.toFixed(1)}/5
                  </div>
                  <div className="text-sm text-gray-600">Average quality rating</div>
                </div>
              </div>

              {/* Performance alerts */}
              {scorecard.overallScore < 70 && (
                <div className="flex items-center space-x-3 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <AlertTriangle className="w-5 h-5 text-yellow-600" />
                  <div>
                    <div className="font-medium text-yellow-800">Performance Alert</div>
                    <div className="text-sm text-yellow-700">
                      Vendor performance is below threshold. Consider reviewing recent issues or contacting the vendor.
                    </div>
                  </div>
                </div>
              )}

              {scorecard.overallScore >= 90 && (
                <div className="flex items-center space-x-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  <div>
                    <div className="font-medium text-green-800">Excellent Performance</div>
                    <div className="text-sm text-green-700">
                      This vendor is performing exceptionally well across all metrics.
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scorecard Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Scorecard Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Last Updated</span>
              <span className="font-medium">
                {new Date(scorecard.lastUpdated).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Review Period</span>
              <span className="font-medium">{scorecard.reviewPeriod}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Tracking Duration</span>
              <span className="font-medium">{vendor.reliability.monthsTracked} months</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Vendor Status</span>
              <Badge variant={vendor.status === 'active' ? 'default' : 'secondary'}>
                {vendor.status}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default VendorScorecard;