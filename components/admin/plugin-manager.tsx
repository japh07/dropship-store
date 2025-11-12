'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Download,
  Upload,
  Settings,
  Power,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  Eye,
  Edit,
  Trash2,
  Play,
  Pause,
  MoreHorizontal,
  Search,
  Filter,
  Plus
} from 'lucide-react';

import { Plugin, PluginInstance } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";

interface PluginManagerProps {
  plugins: PluginInstance[];
  onInstallPlugin?: () => void;
  onConfigurePlugin?: (plugin: Plugin) => void;
  onEnablePlugin?: (pluginId: string) => void;
  onDisablePlugin?: (pluginId: string) => void;
  onUninstallPlugin?: (pluginId: string) => void;
  onViewDetails?: (plugin: Plugin) => void;
  className?: string;
}

export function PluginManager({
  plugins,
  onInstallPlugin,
  onConfigurePlugin,
  onEnablePlugin,
  onDisablePlugin,
  onUninstallPlugin,
  onViewDetails,
  className = ''
}: PluginManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'installed' | 'enabled' | 'disabled' | 'error'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedPlugin, setSelectedPlugin] = useState<Plugin | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Get unique categories
  const categories = Array.from(new Set(plugins.map(p => p.plugin.category)));

  // Filter plugins
  const filteredPlugins = plugins.filter(plugin => {
    const matchesSearch = plugin.plugin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plugin.plugin.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || plugin.plugin.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || plugin.plugin.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Get plugin statistics
  const stats = {
    total: plugins.length,
    installed: plugins.filter(p => p.plugin.status === 'installed' || p.plugin.status === 'enabled').length,
    enabled: plugins.filter(p => p.plugin.status === 'enabled').length,
    disabled: plugins.filter(p => p.plugin.status === 'disabled').length,
    error: plugins.filter(p => p.plugin.status === 'error').length,
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    // Simulate refresh
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsRefreshing(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'enabled':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'disabled':
        return <Pause className="w-5 h-5 text-gray-500" />;
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500" />;
      default:
        return <Package className="w-5 h-5 text-blue-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'enabled':
        return 'bg-green-100 text-green-800';
      case 'disabled':
        return 'bg-gray-100 text-gray-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-blue-100 text-blue-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    // Return appropriate icon based on category
    return <Package className="w-5 h-5" />;
  };

  const formatPerformanceMetrics = (plugin: PluginInstance) => {
    const { memoryUsage, cpuTime, errorCount } = plugin.performance;
    return {
      memory: `${(memoryUsage / (1024 * 1024)).toFixed(1)}MB`,
      cpu: `${cpuTime.toFixed(0)}ms`,
      errors: errorCount
    };
  };

  const renderPluginCard = (plugin: PluginInstance) => {
    const metrics = formatPerformanceMetrics(plugin);
    const hasErrors = plugin.performance.errorCount > 0;

    return (
      <Card key={plugin.plugin.id} className="hover:shadow-md transition-shadow">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                {getStatusIcon(plugin.plugin.status)}
                <CardTitle className="text-lg">{plugin.plugin.name}</CardTitle>
              </div>
              <CardDescription className="line-clamp-2">
                {plugin.plugin.description}
              </CardDescription>
              <div className="flex items-center space-x-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  {getCategoryIcon(plugin.plugin.category)}
                  {plugin.plugin.category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  v{plugin.plugin.version}
                </Badge>
                {hasErrors && (
                  <Badge variant="destructive" className="text-xs">
                    {plugin.performance.errorCount} errors
                  </Badge>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={plugin.plugin.status === 'enabled'}
                onCheckedChange={(checked) => {
                  if (checked) {
                    onEnablePlugin?.(plugin.plugin.id);
                  } else {
                    onDisablePlugin?.(plugin.plugin.id);
                  }
                }}
                disabled={plugin.plugin.status === 'error'}
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails?.(plugin.plugin)}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onConfigurePlugin?.(plugin.plugin)}>
                    <Settings className="w-4 h-4 mr-2" />
                    Configure
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDisablePlugin?.(plugin.plugin.id)}
                    disabled={plugin.plugin.status === 'disabled'}
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Disable
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onUninstallPlugin?.(plugin.plugin.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Uninstall
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Performance Metrics */}
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center">
                <div className="font-semibold">{metrics.memory}</div>
                <div className="text-xs text-gray-500">Memory</div>
              </div>
              <div className="text-center">
                <div className="font-semibold">{metrics.cpu}</div>
                <div className="text-xs text-gray-500">CPU Time</div>
              </div>
              <div className="text-center">
                <div className={`font-semibold ${metrics.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                  {metrics.errors}
                </div>
                <div className="text-xs text-gray-500">Errors</div>
              </div>
            </div>

            {/* Memory Usage Bar */}
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span>Memory Usage</span>
                <span>{((plugin.performance.memoryUsage / (50 * 1024 * 1024) * 100).toFixed(1)}%</span>
              </div>
              <Progress
                value={(plugin.performance.memoryUsage / (50 * 1024 * 1024)) * 100}
                className="h-2"
              />
            </div>

            {/* Plugin Permissions */}
            <div>
              <div className="text-xs font-medium text-gray-700 mb-2">Permissions</div>
              <div className="flex flex-wrap gap-1">
                {plugin.plugin.permissions.slice(0, 3).map((permission, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {permission.replace('.', ' • ')}
                  </Badge>
                ))}
                {plugin.plugin.permissions.length > 3 && (
                  <Badge variant="secondary" className="text-xs">
                    +{plugin.plugin.permissions.length - 3}
                  </Badge>
                )}
              </div>
            </div>

            {/* Status and Actions */}
            <div className="flex items-center justify-between pt-3 border-t">
              <Badge className={getStatusColor(plugin.plugin.status)}>
                {plugin.plugin.status}
              </Badge>
              <div className="flex space-x-2">
                {plugin.plugin.status === 'disabled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEnablePlugin?.(plugin.plugin.id)}
                  >
                    <Play className="w-4 h-4 mr-1" />
                    Enable
                  </Button>
                )}
                {plugin.plugin.status === 'enabled' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onDisablePlugin?.(plugin.plugin.id)}
                  >
                    <Pause className="w-4 h-4 mr-1" />
                    Disable
                  </Button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Plugin Manager</h1>
          <p className="text-gray-600">
            Manage and monitor your installed plugins
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button onClick={onInstallPlugin}>
            <Plus className="w-4 h-4 mr-2" />
            Install Plugin
          </Button>
        </div>
      </div>

      {/* Plugin Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Plugins</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.enabled}</div>
            <div className="text-sm text-gray-600">Enabled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.installed}</div>
            <div className="text-sm text-gray-600">Installed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{stats.disabled}</div>
            <div className="text-sm text-gray-600">Disabled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-red-600">{stats.error}</div>
            <div className="text-sm text-gray-600">Errors</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Controls */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search plugins..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={statusFilter} onValueChange={(value: any) => setStatusFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="installed">Installed</SelectItem>
                  <SelectItem value="enabled">Enabled</SelectItem>
                  <SelectItem value="disabled">Disabled</SelectItem>
                  <SelectItem value="error">Error</SelectItem>
                </SelectContent>
              </Select>

              <Select value={categoryFilter} onValueChange={(value: any) => setCategoryFilter(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="installed" className="space-y-6">
        <TabsList>
          <TabsTrigger value="installed">Installed Plugins</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="logs">Logs</TabsTrigger>
        </TabsList>

        {/* Installed Plugins */}
        <TabsContent value="installed" className="space-y-4">
          {filteredPlugins.length === 0 ? (
            <Card>
              <CardContent className="pt-12 text-center">
                <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  No plugins found
                </h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' || categoryFilter !== 'all'
                    ? 'Try adjusting your search terms or filters.'
                    : 'Get started by installing your first plugin.'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && categoryFilter === 'all' && (
                  <Button onClick={onInstallPlugin}>
                    <Plus className="w-4 h-4 mr-2" />
                    Install Plugin
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredPlugins.map(renderPluginCard)}
            </div>
          )}
        </TabsContent>

        {/* Performance */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plugin Performance Overview</CardTitle>
              <CardDescription>
                Monitor resource usage and performance metrics for all plugins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {filteredPlugins
                  .sort((a, b) => b.performance.memoryUsage - a.performance.memoryUsage)
                  .slice(0, 10)
                  .map((plugin) => {
                    const metrics = formatPerformanceMetrics(plugin);
                    return (
                      <div key={plugin.plugin.id} className="flex items-center justify-between p-4 border-b last:border-b-0">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center">
                            {getStatusIcon(plugin.plugin.status)}
                          </div>
                          <div>
                            <div className="font-medium">{plugin.plugin.name}</div>
                            <div className="text-sm text-gray-500">{plugin.plugin.category}</div>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-8 text-sm">
                          <div className="text-right">
                            <div className="font-semibold">{metrics.memory}</div>
                            <div className="text-gray-500">Memory</div>
                          </div>
                          <div className="text-right">
                            <div className="font-semibold">{metrics.cpu}</div>
                            <div className="text-gray-500">CPU</div>
                          </div>
                          <div className="text-right">
                            <div className={`font-semibold ${metrics.errors > 0 ? 'text-red-600' : 'text-green-600'}`}>
                              {metrics.errors}
                            </div>
                            <div className="text-gray-500">Errors</div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Logs */}
        <TabsContent value="logs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Plugin Logs</CardTitle>
              <CardDescription>
                Recent log entries and error messages from plugins
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredPlugins.filter(p => p.performance.errorCount > 0).map((plugin) => (
                  <div key={plugin.plugin.id} className="p-4 border border-red-200 bg-red-50 rounded-lg">
                    <div className="flex items-start space-x-3">
                      <AlertTriangle className="w-5 h-5 text-red-500 mt-1" />
                      <div className="flex-1">
                        <div className="font-medium text-red-900">
                          {plugin.plugin.name}
                        </div>
                        <div className="text-sm text-red-700 mt-1">
                          {plugin.performance.errorCount} errors detected
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          Last error: {plugin.performance.lastError?.message || 'Unknown error'}
                        </div>
                      </div>
                      <Button variant="outline" size="sm">
                        View Logs
                      </Button>
                    </div>
                  </div>
                ))}
                {filteredPlugins.filter(p => p.performance.errorCount === 0).length === filteredPlugins.length && (
                  <div className="text-center py-12">
                    <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      All Plugins Running Smoothly
                    </h3>
                    <p className="text-gray-600">
                      No errors detected in any installed plugins.
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PluginManager;