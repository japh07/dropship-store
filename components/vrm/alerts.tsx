'use client';

import React, { useState } from 'react';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle,
  Clock,
  Bell,
  Filter,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MessageSquare,
  X
} from 'lucide-react';

import { SupplierAlert, Vendor } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AlertsProps {
  vendorId?: string;
  alerts: SupplierAlert[];
  vendors: Vendor[];
  onAcknowledgeAlert?: (vendorId: string, alertId: string) => void;
  onResolveAlert?: (vendorId: string, alertId: string) => void;
  className?: string;
}

export function VendorAlerts({
  vendorId,
  alerts,
  vendors,
  onAcknowledgeAlert,
  onResolveAlert,
  className = ''
}: AlertsProps) {
  const [filter, setFilter] = useState<'all' | 'unacknowledged' | 'critical' | 'error' | 'warning'>('all');
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  // Filter alerts based on selected filter
  const filteredAlerts = alerts.filter(alert => {
    if (vendorId && alert.vendorId !== vendorId) return false;

    switch (filter) {
      case 'unacknowledged':
        return !alert.acknowledged;
      case 'critical':
        return alert.severity === 'critical';
      case 'error':
        return alert.severity === 'error';
      case 'warning':
        return alert.severity === 'warning';
      default:
        return true;
    }
  });

  // Group alerts by vendor
  const alertsByVendor = filteredAlerts.reduce((acc, alert) => {
    if (!acc[alert.vendorId]) {
      acc[alert.vendorId] = [];
    }
    acc[alert.vendorId].push(alert);
    return acc;
  }, {} as Record<string, SupplierAlert[]>);

  const getSeverityIcon = (severity: SupplierAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: SupplierAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'border-red-200 bg-red-50';
      case 'error':
        return 'border-red-100 bg-red-50';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'info':
        return 'border-blue-200 bg-blue-50';
    }
  };

  const getTypeIcon = (type: SupplierAlert['type']) => {
    switch (type) {
      case 'performance_drop':
        return <TrendingDown className="w-4 h-4" />;
      case 'delivery_issue':
        return <Truck className="w-4 h-4" />;
      case 'price_change':
        return <DollarSign className="w-4 h-4" />;
      case 'quality_problem':
        return <Package className="w-4 h-4" />;
      case 'opportunity':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getVendorName = (vendorId: string) => {
    const vendor = vendors.find(v => v.id === vendorId);
    return vendor?.name || 'Unknown Vendor';
  };

  const toggleAlertExpansion = (alertId: string) => {
    const newExpanded = new Set(expandedAlerts);
    if (newExpanded.has(alertId)) {
      newExpanded.delete(alertId);
    } else {
      newExpanded.add(alertId);
    }
    setExpandedAlerts(newExpanded);
  };

  const handleAcknowledge = (vendorId: string, alertId: string) => {
    if (onAcknowledgeAlert) {
      onAcknowledgeAlert(vendorId, alertId);
    }
  };

  const handleResolve = (vendorId: string, alertId: string) => {
    if (onResolveAlert) {
      onResolveAlert(vendorId, alertId);
    }
  };

  const getAlertStats = () => {
    const critical = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;
    const error = alerts.filter(a => a.severity === 'error' && !a.acknowledged).length;
    const warning = alerts.filter(a => a.severity === 'warning' && !a.acknowledged).length;
    const total = alerts.filter(a => !a.acknowledged).length;

    return { critical, error, warning, total };
  };

  const stats = getAlertStats();

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Alert Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Bell className="w-5 h-5" />
              <span>Vendor Alerts</span>
              {stats.total > 0 && (
                <Badge variant="destructive">{stats.total}</Badge>
              )}
            </div>
          </CardTitle>
          <CardDescription>
            Monitor vendor performance and receive alerts about potential issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Quick Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
              <div className="text-2xl font-bold text-red-600">{stats.critical}</div>
              <div className="text-sm text-red-700">Critical</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
              <div className="text-2xl font-bold text-orange-600">{stats.error}</div>
              <div className="text-sm text-orange-700">Error</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">{stats.warning}</div>
              <div className="text-sm text-yellow-700">Warning</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="text-2xl font-bold text-gray-600">{stats.total}</div>
              <div className="text-sm text-gray-700">Total</div>
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <Button
              variant={filter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('all')}
            >
              All ({alerts.length})
            </Button>
            <Button
              variant={filter === 'unacknowledged' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('unacknowledged')}
            >
              Unacknowledged ({stats.total})
            </Button>
            <Button
              variant={filter === 'critical' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('critical')}
            >
              Critical ({stats.critical})
            </Button>
            <Button
              variant={filter === 'error' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('error')}
            >
              Error ({stats.error})
            </Button>
            <Button
              variant={filter === 'warning' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter('warning')}
            >
              Warning ({stats.warning})
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Alerts List */}
      {Object.keys(alertsByVendor).length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No alerts found
            </h3>
            <p className="text-gray-600">
              {filter === 'all'
                ? 'All vendors are performing within acceptable parameters.'
                : `No ${filter} alerts found.`
              }
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(alertsByVendor).map(([vendorId, vendorAlerts]) => (
            <Card key={vendorId}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{getVendorName(vendorId)}</CardTitle>
                  <Badge variant="outline">
                    {vendorAlerts.length} alert{vendorAlerts.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {vendorAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 rounded-lg border ${getSeverityColor(alert.severity)} ${
                        alert.acknowledged ? 'opacity-60' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-start space-x-3 flex-1">
                          {getSeverityIcon(alert.severity)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-2 mb-1">
                              {getTypeIcon(alert.type)}
                              <h4 className="font-semibold text-gray-900">
                                {alert.title}
                              </h4>
                              {alert.acknowledged && (
                                <Badge variant="secondary" className="text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Acknowledged
                                </Badge>
                              )}
                            </div>
                            <p className="text-gray-700 mb-2">{alert.message}</p>
                            <div className="flex items-center space-x-4 text-sm text-gray-500">
                              <span className="flex items-center">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(alert.createdAt).toLocaleString()}
                              </span>
                              {alert.acknowledgedAt && (
                                <span className="flex items-center">
                                  <CheckCircle className="w-4 h-4 mr-1" />
                                  Acknowledged {new Date(alert.acknowledgedAt).toLocaleString()}
                                </span>
                              )}
                            </div>

                            {/* Recommendations (collapsible) */}
                            {alert.recommendations && alert.recommendations.length > 0 && (
                              <Collapsible
                                open={expandedAlerts.has(alert.id)}
                                onOpenChange={() => toggleAlertExpansion(alert.id)}
                              >
                                <CollapsibleTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="mt-2 p-0 h-auto text-blue-600 hover:text-blue-800"
                                  >
                                    <span className="flex items-center">
                                      {expandedAlerts.has(alert.id) ? (
                                        <ChevronDown className="w-4 h-4 mr-1" />
                                      ) : (
                                        <ChevronRight className="w-4 h-4 mr-1" />
                                      )}
                                      {alert.recommendations.length} recommendation{alert.recommendations.length !== 1 ? 's' : ''}
                                    </span>
                                  </Button>
                                </CollapsibleTrigger>
                                <CollapsibleContent>
                                  <div className="mt-3 space-y-2">
                                    {alert.recommendations.map((rec, index) => (
                                      <div key={index} className="flex items-start space-x-2">
                                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-sm text-gray-700">{rec}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CollapsibleContent>
                              </Collapsible>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2 ml-4">
                          {!alert.acknowledged && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAcknowledge(vendorId, alert.id)}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleResolve(vendorId, alert.id)}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Resolve
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default VendorAlerts;