import {
  MarketplacePlugin,
  PluginReview,
  PluginSubmission,
  PluginMetadata,
  Plugin
} from '@/types';

const MARKETPLACE_API_URL = process.env.NEXT_PUBLIC_MARKETPLACE_API_URL || 'http://localhost:3001/api/marketplace';

// API Client for marketplace operations
class MarketplaceAPIClient {
  private baseURL: string;
  private apiKey?: string;

  constructor(baseURL: string, apiKey?: string) {
    this.baseURL = baseURL;
    this.apiKey = apiKey;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.apiKey) {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      return await response.json();
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Network request failed');
    }
  }

  // Plugin browsing and discovery
  async getAvailablePlugins(params?: {
    category?: string;
    search?: string;
    sortBy?: 'popularity' | 'rating' | 'price' | 'newest';
    sortOrder?: 'asc' | 'desc';
    pricing?: 'free' | 'paid' | 'all';
    page?: number;
    limit?: number;
  }): Promise<{
    plugins: MarketplacePlugin[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request(`/plugins?${searchParams.toString()}`);
  }

  async getPluginDetails(pluginId: string): Promise<MarketplacePlugin> {
    return this.request(`/plugins/${pluginId}`);
  }

  async getFeaturedPlugins(limit: number = 10): Promise<MarketplacePlugin[]> {
    return this.request(`/plugins/featured?limit=${limit}`);
  }

  async getPopularPlugins(limit: number = 10): Promise<MarketplacePlugin[]> {
    return this.request(`/plugins/popular?limit=${limit}`);
  }

  async getNewReleases(limit: number = 10): Promise<MarketplacePlugin[]> {
    return this.request(`/plugins/new?limit=${limit}`);
  }

  async searchPlugins(query: string, filters?: {
    category?: string;
    pricing?: string;
    minRating?: number;
  }): Promise<MarketplacePlugin[]> {
    const searchParams = new URLSearchParams({ q: query });

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request(`/plugins/search?${searchParams.toString()}`);
  }

  // Categories and tags
  async getCategories(): Promise<{
    id: string;
    name: string;
    description: string;
    pluginCount: number;
  }[]> {
    return this.request('/categories');
  }

  async getTags(): Promise<{
    id: string;
    name: string;
    pluginCount: number;
  }[]> {
    return this.request('/tags');
  }

  // Plugin reviews and ratings
  async getPluginReviews(
    pluginId: string,
    params?: {
      page?: number;
      limit?: number;
      sortBy?: 'helpful' | 'newest' | 'rating';
    }
  ): Promise<{
    reviews: PluginReview[];
    total: number;
    averageRating: number;
    ratingDistribution: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  }> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) {
          searchParams.append(key, value.toString());
        }
      });
    }

    return this.request(`/plugins/${pluginId}/reviews?${searchParams.toString()}`);
  }

  async submitPluginReview(
    pluginId: string,
    review: {
      rating: number;
      title: string;
      content: string;
    }
  ): Promise<PluginReview> {
    return this.request(`/plugins/${pluginId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(review),
    });
  }

  async updatePluginReview(
    pluginId: string,
    reviewId: string,
    review: {
      rating?: number;
      title?: string;
      content?: string;
    }
  ): Promise<PluginReview> {
    return this.request(`/plugins/${pluginId}/reviews/${reviewId}`, {
      method: 'PUT',
      body: JSON.stringify(review),
    });
  }

  async deletePluginReview(pluginId: string, reviewId: string): Promise<void> {
    return this.request(`/plugins/${pluginId}/reviews/${reviewId}`, {
      method: 'DELETE',
    });
  }

  async markReviewHelpful(pluginId: string, reviewId: string): Promise<void> {
    return this.request(`/plugins/${pluginId}/reviews/${reviewId}/helpful`, {
      method: 'POST',
    });
  }

  // Plugin installation and purchasing
  async purchasePlugin(
    pluginId: string,
    pricingOption?: {
      type: 'one-time' | 'subscription';
      planId?: string;
    }
  ): Promise<{
    purchaseId: string;
    status: 'pending' | 'completed' | 'failed';
    amount: number;
    currency: string;
    paymentUrl?: string;
  }> {
    return this.request(`/plugins/${pluginId}/purchase`, {
      method: 'POST',
      body: JSON.stringify(pricingOption),
    });
  }

  async getPurchaseStatus(purchaseId: string): Promise<{
    purchaseId: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    pluginId: string;
    amount: number;
    currency: string;
    completedAt?: string;
  }> {
    return this.request(`/purchases/${purchaseId}`);
  }

  async getUserPurchases(): Promise<{
    purchases: {
      id: string;
      pluginId: string;
      pluginName: string;
      amount: number;
      currency: string;
      status: string;
      purchaseDate: string;
      expiresAt?: string;
    }[];
  }> {
    return this.request('/purchases');
  }

  async installPlugin(pluginId: string, purchaseId?: string): Promise<{
    installationId: string;
    status: 'downloading' | 'installing' | 'completed' | 'failed';
    downloadUrl?: string;
    licenseKey?: string;
  }> {
    return this.request(`/plugins/${pluginId}/install`, {
      method: 'POST',
      body: JSON.stringify({ purchaseId }),
    });
  }

  async getInstallationStatus(installationId: string): Promise<{
    installationId: string;
    status: 'downloading' | 'installing' | 'completed' | 'failed';
    progress: number;
    error?: string;
  }> {
    return this.request(`/installations/${installationId}`);
  }

  async getUserInstallations(): Promise<{
    installations: {
      id: string;
      pluginId: string;
      pluginName: string;
      version: string;
      status: string;
      installDate: string;
      autoUpdate: boolean;
    }[];
  }> {
    return this.request('/installations');
  }

  // Plugin updates
  async checkForUpdates(pluginId: string): Promise<{
    hasUpdate: boolean;
    currentVersion: string;
    latestVersion?: string;
    changelog?: string;
    downloadUrl?: string;
  }> {
    return this.request(`/plugins/${pluginId}/updates/check`);
  }

  async updatePlugin(
    pluginId: string,
    version?: string
  ): Promise<{
    updateId: string;
    status: 'downloading' | 'installing' | 'completed' | 'failed';
  }> {
    return this.request(`/plugins/${pluginId}/update`, {
      method: 'POST',
      body: JSON.stringify({ version }),
    });
  }

  // Plugin submission (for developers)
  async submitPlugin(submission: {
    pluginId: string;
    version: string;
    manifest: any;
    codeFiles: {
      name: string;
      content: string;
      type: string;
    }[];
    documentation?: string;
    screenshots: string[];
    changelog?: string;
  }): Promise<{
    submissionId: string;
    status: 'pending' | 'in_review' | 'approved' | 'rejected';
    submittedAt: string;
  }> {
    return this.request('/submissions', {
      method: 'POST',
      body: JSON.stringify(submission),
    });
  }

  async getSubmissions(status?: string): Promise<{
    submissions: PluginSubmission[];
  }> {
    const searchParams = status ? new URLSearchParams({ status }) : '';
    return this.request(`/submissions?${searchParams.toString()}`);
  }

  async getSubmission(submissionId: string): Promise<PluginSubmission> {
    return this.request(`/submissions/${submissionId}`);
  }

  // Developer dashboard
  async getDeveloperStats(): Promise<{
    totalPlugins: number;
    totalDownloads: number;
    totalRevenue: number;
    monthlyRevenue: number;
    activeSubscriptions: number;
    topPlugins: {
      pluginId: string;
      name: string;
      downloads: number;
      revenue: number;
    }[];
  }> {
    return this.request('/developer/stats');
  }

  async getDeveloperPlugins(): Promise<{
    plugins: MarketplacePlugin[];
  }> {
    return this.request('/developer/plugins');
  }

  async updatePluginListing(
    pluginId: string,
    updates: {
      name?: string;
      description?: string;
      pricing?: any;
      screenshots?: string[];
      documentation?: string;
    }
  ): Promise<MarketplacePlugin> {
    return this.request(`/developer/plugins/${pluginId}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  }

  // Analytics and insights
  async getPluginAnalytics(pluginId: string): Promise<{
    downloads: {
      total: number;
      thisMonth: number;
      thisWeek: number;
      today: number;
      trend: 'up' | 'down' | 'stable';
    };
    revenue: {
      total: number;
      thisMonth: number;
      thisWeek: number;
      today: number;
      trend: 'up' | 'down' | 'stable';
    };
    reviews: {
      averageRating: number;
      totalReviews: number;
      newReviews: number;
    };
    installations: {
      active: number;
      total: number;
      churnRate: number;
    };
  }> {
    return this.request(`/developer/plugins/${pluginId}/analytics`);
  }

  // Admin operations
  async reviewSubmission(
    submissionId: string,
    review: {
      status: 'approved' | 'rejected' | 'requires_changes';
      notes?: string;
      reviewerFeedback?: string;
    }
  ): Promise<PluginSubmission> {
    return this.request(`/admin/submissions/${submissionId}/review`, {
      method: 'POST',
      body: JSON.stringify(review),
    });
  }

  async getPendingSubmissions(): Promise<{
    submissions: PluginSubmission[];
  }> {
    return this.request('/admin/submissions/pending');
  }

  async getMarketplaceStats(): Promise<{
    totalPlugins: number;
    totalDownloads: number;
    totalRevenue: number;
    activeDevelopers: number;
    newSubmissions: number;
    topCategories: {
      category: string;
      pluginCount: number;
      downloadCount: number;
    }[];
  }> {
    return this.request('/admin/stats');
  }
}

// Create and export the API client instance
export const marketplaceAPI = new MarketplaceAPIClient(MARKETPLACE_API_URL);

// Export convenience functions for common operations
export const marketplaceActions = {
  // Browsing
  getAvailablePlugins: marketplaceAPI.getAvailablePlugins.bind(marketplaceAPI),
  getPluginDetails: marketplaceAPI.getPluginDetails.bind(marketplaceAPI),
  getFeaturedPlugins: marketplaceAPI.getFeaturedPlugins.bind(marketplaceAPI),
  getPopularPlugins: marketplaceAPI.getPopularPlugins.bind(marketplaceAPI),
  getNewReleases: marketplaceAPI.getNewReleases.bind(marketplaceAPI),
  searchPlugins: marketplaceAPI.searchPlugins.bind(marketplaceAPI),

  // Categories
  getCategories: marketplaceAPI.getCategories.bind(marketplaceAPI),
  getTags: marketplaceAPI.getTags.bind(marketplaceAPI),

  // Reviews
  getPluginReviews: marketplaceAPI.getPluginReviews.bind(marketplaceAPI),
  submitPluginReview: marketplaceAPI.submitPluginReview.bind(marketplaceAPI),
  updatePluginReview: marketplaceAPI.updatePluginReview.bind(marketplaceAPI),
  deletePluginReview: marketplaceAPI.deletePluginReview.bind(marketplaceAPI),
  markReviewHelpful: marketplaceAPI.markReviewHelpful.bind(marketplaceAPI),

  // Purchasing and Installation
  purchasePlugin: marketplaceAPI.purchasePlugin.bind(marketplaceAPI),
  getPurchaseStatus: marketplaceAPI.getPurchaseStatus.bind(marketplaceAPI),
  getUserPurchases: marketplaceAPI.getUserPurchases.bind(marketplaceAPI),
  installPlugin: marketplaceAPI.installPlugin.bind(marketplaceAPI),
  getInstallationStatus: marketplaceAPI.getInstallationStatus.bind(marketplaceAPI),
  getUserInstallations: marketplaceAPI.getUserInstallations.bind(marketplaceAPI),

  // Updates
  checkForUpdates: marketplaceAPI.checkForUpdates.bind(marketplaceAPI),
  updatePlugin: marketplaceAPI.updatePlugin.bind(marketplaceAPI),

  // Developer
  submitPlugin: marketplaceAPI.submitPlugin.bind(marketplaceAPI),
  getSubmissions: marketplaceAPI.getSubmissions.bind(marketplaceAPI),
  getSubmission: marketplaceAPI.getSubmission.bind(marketplaceAPI),
  getDeveloperStats: marketplaceAPI.getDeveloperStats.bind(marketplaceAPI),
  getDeveloperPlugins: marketplaceAPI.getDeveloperPlugins.bind(marketplaceAPI),
  updatePluginListing: marketplaceAPI.updatePluginListing.bind(marketplaceAPI),

  // Analytics
  getPluginAnalytics: marketplaceAPI.getPluginAnalytics.bind(marketplaceAPI),

  // Admin
  reviewSubmission: marketplaceAPI.reviewSubmission.bind(marketplaceAPI),
  getPendingSubmissions: marketplaceAPI.getPendingSubmissions.bind(marketplaceAPI),
  getMarketplaceStats: marketplaceAPI.getMarketplaceStats.bind(marketplaceAPI),
};

// Export types for use in components
export type { MarketplacePlugin, PluginReview, PluginSubmission };

// Error handling utilities
export class MarketplaceError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'MarketplaceError';
  }
}

export const handleMarketplaceError = (error: unknown): MarketplaceError => {
  if (error instanceof MarketplaceError) {
    return error;
  }

  if (error instanceof Error) {
    // Try to extract API error details
    if (error.message.includes('HTTP 401')) {
      return new MarketplaceError('Authentication required', 'AUTH_REQUIRED', 401);
    }
    if (error.message.includes('HTTP 403')) {
      return new MarketplaceError('Access denied', 'ACCESS_DENIED', 403);
    }
    if (error.message.includes('HTTP 404')) {
      return new MarketplaceError('Resource not found', 'NOT_FOUND', 404);
    }
    if (error.message.includes('HTTP 429')) {
      return new MarketplaceError('Too many requests', 'RATE_LIMIT', 429);
    }
    if (error.message.includes('HTTP 500')) {
      return new MarketplaceError('Server error', 'SERVER_ERROR', 500);
    }

    return new MarketplaceError(error.message);
  }

  return new MarketplaceError('An unknown error occurred');
};

// Utility functions for common patterns
export const loadPluginWithDependencies = async (
  pluginId: string,
  onProgress?: (progress: number) => void
): Promise<void> => {
  try {
    // Get plugin details
    const plugin = await marketplaceActions.getPluginDetails(pluginId);

    // Check dependencies
    if (plugin.metadata.dependencies.length > 0) {
      for (const depId of plugin.metadata.dependencies) {
        // Install dependencies first
        await loadPluginWithDependencies(depId, onProgress);
      }
    }

    // Install the main plugin
    const installation = await marketplaceActions.installPlugin(pluginId);

    // Monitor installation progress
    if (onProgress) {
      onProgress(0);
      const checkProgress = async () => {
        const status = await marketplaceActions.getInstallationStatus(installation.installationId);
        onProgress(status.progress);

        if (status.status !== 'completed' && status.status !== 'failed') {
          setTimeout(checkProgress, 1000);
        }
      };
      checkProgress();
    }

  } catch (error) {
    throw handleMarketplaceError(error);
  }
};

export default marketplaceAPI;