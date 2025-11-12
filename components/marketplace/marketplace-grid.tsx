'use client';

import React, { useState, useEffect } from 'react';
import { Star, Download, DollarSign, Filter, Search, Grid, List, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';

import { MarketplacePlugin } from '@/types';
import { marketplaceActions, handleMarketplaceError } from '@/actions/marketplace-actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

interface MarketplaceGridProps {
  onPluginSelect?: (plugin: MarketplacePlugin) => void;
  onPluginInstall?: (plugin: MarketplacePlugin) => void;
  className?: string;
}

interface FilterState {
  category: string;
  pricing: 'all' | 'free' | 'paid';
  sortBy: 'popularity' | 'rating' | 'price' | 'newest';
  sortOrder: 'asc' | 'desc';
  search: string;
}

export function MarketplaceGrid({
  onPluginSelect,
  onPluginInstall,
  className = ''
}: MarketplaceGridProps) {
  const [plugins, setPlugins] = useState<MarketplacePlugin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<Array<{ id: string; name: string; pluginCount: number }>>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
    limit: 12
  });

  const [filters, setFilters] = useState<FilterState>({
    category: '',
    pricing: 'all',
    sortBy: 'popularity',
    sortOrder: 'desc',
    search: ''
  });

  const [installingPlugin, setInstallingPlugin] = useState<string | null>(null);

  // Load plugins
  const loadPlugins = async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page,
        limit: pagination.limit,
        category: filters.category || undefined,
        search: filters.search || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        pricing: filters.pricing === 'all' ? undefined : filters.pricing
      };

      const response = await marketplaceActions.getAvailablePlugins(params);
      setPlugins(response.plugins);
      setPagination(prev => ({
        ...prev,
        page: response.page,
        totalPages: response.totalPages,
        total: response.total
      }));
    } catch (err) {
      const error = handleMarketplaceError(err);
      setError(error.message);
      toast.error(`Failed to load plugins: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load categories
  const loadCategories = async () => {
    try {
      const categories = await marketplaceActions.getCategories();
      setCategories(categories);
    } catch (err) {
      console.error('Failed to load categories:', err);
    }
  };

  // Handle plugin installation
  const handleInstall = async (plugin: MarketplacePlugin) => {
    if (installingPlugin) return;

    try {
      setInstallingPlugin(plugin.id);

      // Check if plugin is free
      if (plugin.pricing.type === 'free') {
        // Direct installation for free plugins
        const installation = await marketplaceActions.installPlugin(plugin.id);
        toast.success(`Installing ${plugin.metadata.name}...`);

        // Monitor installation progress
        const checkProgress = async () => {
          try {
            const status = await marketplaceActions.getInstallationStatus(installation.installationId);

            if (status.status === 'completed') {
              toast.success(`${plugin.metadata.name} installed successfully!`);
              if (onPluginInstall) {
                onPluginInstall(plugin);
              }
            } else if (status.status === 'failed') {
              toast.error(`Failed to install ${plugin.metadata.name}: ${status.error}`);
            } else {
              // Still installing, check again in 1 second
              setTimeout(checkProgress, 1000);
            }
          } catch (err) {
            toast.error('Failed to check installation status');
          }
        };

        checkProgress();
      } else {
        // Redirect to purchase for paid plugins
        const purchase = await marketplaceActions.purchasePlugin(plugin.id);

        if (purchase.paymentUrl) {
          // Open payment URL in new window
          window.open(purchase.paymentUrl, '_blank');
          toast.info('Complete the purchase to install the plugin');
        } else {
          toast.success('Purchase completed! Installing plugin...');
          // Continue with installation
          const installation = await marketplaceActions.installPlugin(plugin.id, purchase.purchaseId);
          toast.success(`${plugin.metadata.name} is being installed...`);
        }
      }
    } catch (err) {
      const error = handleMarketplaceError(err);
      toast.error(`Failed to install ${plugin.metadata.name}: ${error.message}`);
    } finally {
      setInstallingPlugin(null);
    }
  };

  // Effects
  useEffect(() => {
    loadPlugins();
    loadCategories();
  }, []);

  useEffect(() => {
    loadPlugins(1); // Reset to first page when filters change
  }, [filters, pagination.limit]);

  // Render helpers
  const renderPluginCard = (plugin: MarketplacePlugin) => {
    const isInstalling = installingPlugin === plugin.id;
    const isFree = plugin.pricing.type === 'free';
    const rating = plugin.stats.rating;
    const reviewCount = plugin.stats.reviewCount;

    return (
      <div
        key={plugin.id}
        className="bg-white rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onPluginSelect?.(plugin)}
      >
        {/* Plugin Header */}
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 text-sm mb-1">
                {plugin.metadata.name}
              </h3>
              <p className="text-xs text-gray-500">
                by {plugin.developer.name}
                {plugin.developer.verified && (
                  <Badge variant="secondary" className="ml-1 text-xs">
                    Verified
                  </Badge>
                )}
              </p>
            </div>
            <Badge variant="outline" className="text-xs">
              {plugin.metadata.category}
            </Badge>
          </div>

          <p className="text-xs text-gray-600 line-clamp-2 mb-3">
            {plugin.metadata.description}
          </p>

          {/* Rating and Downloads */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <div className="flex items-center space-x-3">
              <div className="flex items-center">
                <Star className="w-3 h-3 text-yellow-400 fill-current mr-1" />
                <span>{rating.toFixed(1)}</span>
                {reviewCount > 0 && (
                  <span className="ml-1">({reviewCount})</span>
                )}
              </div>
              <div className="flex items-center">
                <Download className="w-3 h-3 mr-1" />
                <span>{plugin.stats.downloads.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Plugin Footer */}
        <div className="p-4 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {isFree ? (
                <Badge variant="secondary" className="text-green-600">
                  Free
                </Badge>
              ) : (
                <div className="flex items-center text-sm font-semibold text-gray-900">
                  <DollarSign className="w-4 h-4" />
                  {plugin.pricing.amount}
                  {plugin.pricing.currency}
                </div>
              )}
            </div>

            <Button
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleInstall(plugin);
              }}
              disabled={isInstalling}
              className="text-xs"
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Installing...
                </>
              ) : isFree ? (
                'Install'
              ) : (
                'Purchase'
              )}
            </Button>
          </div>

          {/* Plugin Version */}
          <div className="mt-2 text-xs text-gray-500">
            Version {plugin.versions[0]?.version || 'N/A'}
          </div>
        </div>
      </div>
    );
  };

  const renderPluginListItem = (plugin: MarketplacePlugin) => {
    const isInstalling = installingPlugin === plugin.id;
    const isFree = plugin.pricing.type === 'free';

    return (
      <div
        key={plugin.id}
        className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer"
        onClick={() => onPluginSelect?.(plugin)}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <h3 className="font-semibold text-gray-900 mr-3">
                {plugin.metadata.name}
              </h3>
              <Badge variant="outline" className="text-xs">
                {plugin.metadata.category}
              </Badge>
              {plugin.developer.verified && (
                <Badge variant="secondary" className="ml-2 text-xs">
                  Verified
                </Badge>
              )}
            </div>

            <p className="text-sm text-gray-600 mb-3">
              {plugin.metadata.description}
            </p>

            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <div className="flex items-center">
                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                <span>{plugin.stats.rating.toFixed(1)}</span>
                <span className="ml-1">({plugin.stats.reviewCount} reviews)</span>
              </div>
              <div className="flex items-center">
                <Download className="w-4 h-4 mr-1" />
                <span>{plugin.stats.downloads.toLocaleString()} downloads</span>
              </div>
              <div className="flex items-center">
                <span>by {plugin.developer.name}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col items-end ml-4">
            <div className="mb-3">
              {isFree ? (
                <Badge variant="secondary" className="text-green-600">
                  Free
                </Badge>
              ) : (
                <div className="flex items-center text-lg font-semibold text-gray-900">
                  <DollarSign className="w-5 h-5" />
                  {plugin.pricing.amount}
                  {plugin.pricing.currency}
                </div>
              )}
            </div>

            <Button
              onClick={(e) => {
                e.stopPropagation();
                handleInstall(plugin);
              }}
              disabled={isInstalling}
            >
              {isInstalling ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Installing...
                </>
              ) : isFree ? (
                'Install'
              ) : (
                'Purchase'
              )}
            </Button>

            <div className="mt-2 text-xs text-gray-500">
              Version {plugin.versions[0]?.version || 'N/A'}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters and Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search plugins..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <select
              value={filters.category}
              onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name} ({category.pluginCount})
                </option>
              ))}
            </select>

            <select
              value={filters.pricing}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                pricing: e.target.value as 'all' | 'free' | 'paid'
              }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Pricing</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                sortBy: e.target.value as 'popularity' | 'rating' | 'price' | 'newest'
              }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="popularity">Popular</option>
              <option value="rating">Top Rated</option>
              <option value="price">Price</option>
              <option value="newest">Newest</option>
            </select>

            <select
              value={filters.sortOrder}
              onChange={(e) => setFilters(prev => ({
                ...prev,
                sortOrder: e.target.value as 'asc' | 'desc'
              }))}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="desc">Descending</option>
              <option value="asc">Ascending</option>
            </select>
          </div>

          {/* View Mode */}
          <div className="flex items-center border border-gray-300 rounded-md">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
              title="Grid view"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 ${viewMode === 'list' ? 'bg-gray-100' : ''}`}
              title="List view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-3" />
          <span className="text-lg text-gray-600">Loading plugins...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Failed to load plugins
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <Button onClick={() => loadPlugins()}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {/* Plugin Grid/List */}
      {!loading && !error && (
        <>
          {plugins.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No plugins found
              </h3>
              <p className="text-gray-600">
                Try adjusting your filters or search terms
              </p>
            </div>
          ) : (
            <>
              {/* Results Header */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-600">
                  Showing {plugins.length} of {pagination.total} plugins
                </p>
              </div>

              {/* Plugin Items */}
              {viewMode === 'grid' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {plugins.map(renderPluginCard)}
                </div>
              ) : (
                <div className="space-y-3">
                  {plugins.map(renderPluginListItem)}
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-center space-x-2 pt-6">
                  <Button
                    variant="outline"
                    onClick={() => loadPlugins(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                  >
                    Previous
                  </Button>

                  <span className="text-sm text-gray-600">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>

                  <Button
                    variant="outline"
                    onClick={() => loadPlugins(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default MarketplaceGrid;