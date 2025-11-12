'use client';

import React, { useState, useMemo } from 'react';
import {
  Star,
  TrendingUp,
  TrendingDown,
  Package,
  Truck,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Archive
} from 'lucide-react';

import { Vendor, VendorScorecard } from '@/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

interface VendorListProps {
  vendors: Vendor[];
  scorecards: Record<string, VendorScorecard>;
  onSelectVendor?: (vendor: Vendor) => void;
  onEditVendor?: (vendor: Vendor) => void;
  onArchiveVendor?: (vendorId: string) => void;
  className?: string;
}

export function VendorList({
  vendors,
  scorecards,
  onSelectVendor,
  onEditVendor,
  onArchiveVendor,
  className = ''
}: VendorListProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'under-review'>('all');
  const [sortBy, setSortBy] = useState<'name' | 'rating' | 'orders' | 'delivery'>('rating');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');

  // Filter and sort vendors
  const filteredAndSortedVendors = useMemo(() => {
    let filtered = vendors.filter(vendor => {
      const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           vendor.contact.email.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'all' || vendor.status === statusFilter;
      return matchesSearch && matchesStatus;
    });

    // Sort vendors
    return filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name':
          return a.name.localeCompare(b.name);
        case 'rating':
          const aScore = scorecards[a.id]?.overallScore || 0;
          const bScore = scorecards[b.id]?.overallScore || 0;
          return bScore - aScore;
        case 'orders':
          return b.metrics.totalOrders - a.metrics.totalOrders;
        case 'delivery':
          return b.metrics.onTimeDeliveryRate - a.metrics.onTimeDeliveryRate;
        default:
          return 0;
      }
    });
  }, [vendors, scorecards, searchTerm, statusFilter, sortBy]);

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'under-review':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTrendIcon = (scorecard: VendorScorecard, metric: string) => {
    const metricData = scorecard.metrics[metric as keyof typeof scorecard.metrics];
    if (!metricData) return null;

    switch (metricData.trend) {
      case 'up':
        return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const renderVendorCard = (vendor: Vendor) => {
    const scorecard = scorecards[vendor.id];
    const overallScore = scorecard?.overallScore || 0;

    return (
      <Card
        key={vendor.id}
        className="cursor-pointer hover:shadow-md transition-shadow"
        onClick={() => onSelectVendor?.(vendor)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-1">{vendor.name}</CardTitle>
              <CardDescription className="text-sm">
                {vendor.contact.email}
              </CardDescription>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <Badge className={getStatusColor(vendor.status)}>
                {vendor.status}
              </Badge>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onSelectVendor?.(vendor);
                  }}>
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onEditVendor?.(vendor);
                  }}>
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    onArchiveVendor?.(vendor.id);
                  }} className="text-red-600">
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Overall Score */}
          <div className="flex items-center justify-between mb-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getScoreColor(overallScore)}`}>
                {overallScore}
              </div>
              <div className="text-xs text-gray-600">Score</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {vendor.metrics.totalOrders}
              </div>
              <div className="text-xs text-gray-600">Orders</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold">
                {vendor.metrics.onTimeDeliveryRate.toFixed(1)}%
              </div>
              <div className="text-xs text-gray-600">On-Time</div>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="space-y-2">
            {scorecard && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    Pricing
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className={getScoreColor(scorecard.metrics.pricing.score)}>
                      {scorecard.metrics.pricing.score}
                    </span>
                    {getTrendIcon(scorecard, 'pricing')}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <Truck className="w-4 h-4 mr-1" />
                    Delivery
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className={getScoreColor(scorecard.metrics.delivery.score)}>
                      {scorecard.metrics.delivery.score}
                    </span>
                    {getTrendIcon(scorecard, 'delivery')}
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center">
                    <Package className="w-4 h-4 mr-1" />
                    Quality
                  </span>
                  <div className="flex items-center space-x-1">
                    <span className={getScoreColor(scorecard.metrics.quality.score)}>
                      {scorecard.metrics.quality.score}
                    </span>
                    {getTrendIcon(scorecard, 'quality')}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Contact Info */}
          <div className="mt-4 pt-4 border-t text-xs text-gray-500">
            <div>Primary: {vendor.contact.primaryContact}</div>
            <div>Phone: {vendor.contact.phone}</div>
            <div>Products: {vendor.products.length}</div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const renderVendorTableRow = (vendor: Vendor) => {
    const scorecard = scorecards[vendor.id];
    const overallScore = scorecard?.overallScore || 0;

    return (
      <tr
        key={vendor.id}
        className="border-b hover:bg-gray-50 cursor-pointer"
        onClick={() => onSelectVendor?.(vendor)}
      >
        <td className="px-4 py-3">
          <div>
            <div className="font-medium text-gray-900">{vendor.name}</div>
            <div className="text-sm text-gray-500">{vendor.contact.email}</div>
          </div>
        </td>
        <td className="px-4 py-3">
          <Badge className={getStatusColor(vendor.status)}>
            {vendor.status}
          </Badge>
        </td>
        <td className="px-4 py-3">
          <div className={`font-semibold ${getScoreColor(overallScore)}`}>
            {overallScore}
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center space-x-2">
            <span>{vendor.metrics.totalOrders}</span>
            {scorecard && getTrendIcon(scorecard, 'delivery')}
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center space-x-2">
            <span>{vendor.metrics.onTimeDeliveryRate.toFixed(1)}%</span>
            {scorecard && getTrendIcon(scorecard, 'delivery')}
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center space-x-2">
            <span>{vendor.metrics.averageLeadTime} days</span>
          </div>
        </td>
        <td className="px-4 py-3 text-sm">
          {vendor.products.length}
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center space-x-2">
            <span>{vendor.reliability.averageRating.toFixed(1)}</span>
            <Star className="w-4 h-4 text-yellow-400 fill-current" />
          </div>
        </td>
        <td className="px-4 py-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onSelectVendor?.(vendor);
              }}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEditVendor?.(vendor);
              }}>
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onArchiveVendor?.(vendor.id);
              }} className="text-red-600">
                <Archive className="w-4 h-4 mr-2" />
                Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </td>
      </tr>
    );
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filters and Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Vendor Management</CardTitle>
          <CardDescription>
            Monitor and manage your vendor relationships and performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search vendors..."
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
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="under-review">Under Review</SelectItem>
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Name</SelectItem>
                  <SelectItem value="rating">Rating</SelectItem>
                  <SelectItem value="orders">Orders</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center border border-gray-300 rounded-md">
                <button
                  onClick={() => setViewMode('table')}
                  className={`p-2 ${viewMode === 'table' ? 'bg-gray-100' : ''}`}
                  title="Table view"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-gray-100' : ''}`}
                  title="Grid view"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Summary */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Showing {filteredAndSortedVendors.length} of {vendors.length} vendors
        </p>
      </div>

      {/* Vendor List */}
      {filteredAndSortedVendors.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center">
            <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No vendors found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search terms or filters
            </p>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredAndSortedVendors.map(renderVendorCard)}
        </div>
      ) : (
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Score
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Orders
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    On-Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lead Time
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Products
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredAndSortedVendors.map(renderVendorTableRow)}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

export default VendorList;