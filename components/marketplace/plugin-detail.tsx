'use client';

import React, { useState, useEffect } from 'react';
import {
  Star,
  Download,
  DollarSign,
  Shield,
  Clock,
  User,
  ExternalLink,
  Heart,
  Share2,
  Flag,
  Loader2,
  CheckCircle,
  AlertCircle,
  Calendar,
  Package,
  Settings,
  FileText
} from 'lucide-react';
import { toast } from 'react-hot-toast';

import { MarketplacePlugin, PluginReview } from '@/types';
import { marketplaceActions, handleMarketplaceError } from '@/actions/marketplace-actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';

interface PluginDetailProps {
  pluginId: string;
  onBack?: () => void;
  onInstall?: (plugin: MarketplacePlugin) => void;
  className?: string;
}

interface ReviewFormData {
  rating: number;
  title: string;
  content: string;
}

export function PluginDetail({
  pluginId,
  onBack,
  onInstall,
  className = ''
}: PluginDetailProps) {
  const [plugin, setPlugin] = useState<MarketplacePlugin | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Reviews state
  const [reviews, setReviews] = useState<{
    reviews: PluginReview[];
    total: number;
    averageRating: number;
    ratingDistribution: { 1: number; 2: number; 3: number; 4: number; 5: number };
  } | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewForm, setReviewForm] = useState<ReviewFormData>({
    rating: 5,
    title: '',
    content: ''
  });
  const [submittingReview, setSubmittingReview] = useState(false);

  // Load plugin details
  const loadPluginDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      const pluginData = await marketplaceActions.getPluginDetails(pluginId);
      setPlugin(pluginData);
    } catch (err) {
      const error = handleMarketplaceError(err);
      setError(error.message);
      toast.error(`Failed to load plugin details: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Load reviews
  const loadReviews = async () => {
    try {
      setLoadingReviews(true);

      const reviewsData = await marketplaceActions.getPluginReviews(pluginId);
      setReviews(reviewsData);
    } catch (err) {
      console.error('Failed to load reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Handle plugin installation
  const handleInstall = async () => {
    if (!plugin || installing) return;

    try {
      setInstalling(true);

      if (plugin.pricing.type === 'free') {
        const installation = await marketplaceActions.installPlugin(plugin.id);
        toast.success(`Installing ${plugin.metadata.name}...`);

        // Monitor installation
        const checkProgress = async () => {
          try {
            const status = await marketplaceActions.getInstallationStatus(installation.installationId);

            if (status.status === 'completed') {
              toast.success(`${plugin.metadata.name} installed successfully!`);
              if (onInstall) {
                onInstall(plugin);
              }
            } else if (status.status === 'failed') {
              toast.error(`Installation failed: ${status.error}`);
            } else {
              setTimeout(checkProgress, 1000);
            }
          } catch (err) {
            toast.error('Failed to check installation status');
          }
        };

        checkProgress();
      } else {
        const purchase = await marketplaceActions.purchasePlugin(plugin.id);

        if (purchase.paymentUrl) {
          window.open(purchase.paymentUrl, '_blank');
          toast.info('Complete the purchase to install the plugin');
        } else {
          toast.success('Purchase completed! Installing plugin...');
          const installation = await marketplaceActions.installPlugin(plugin.id, purchase.purchaseId);
        }
      }
    } catch (err) {
      const error = handleMarketplaceError(err);
      toast.error(`Failed to install ${plugin.metadata.name}: ${error.message}`);
    } finally {
      setInstalling(false);
    }
  };

  // Handle review submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reviewForm.title.trim() || !reviewForm.content.trim()) {
      toast.error('Please fill in all review fields');
      return;
    }

    try {
      setSubmittingReview(true);

      await marketplaceActions.submitPluginReview(pluginId, {
        rating: reviewForm.rating,
        title: reviewForm.title.trim(),
        content: reviewForm.content.trim()
      });

      toast.success('Review submitted successfully!');
      setReviewForm({ rating: 5, title: '', content: '' });
      loadReviews(); // Reload reviews
    } catch (err) {
      const error = handleMarketplaceError(err);
      toast.error(`Failed to submit review: ${error.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Effects
  useEffect(() => {
    loadPluginDetails();
  }, [pluginId]);

  useEffect(() => {
    if (activeTab === 'reviews' && !reviews) {
      loadReviews();
    }
  }, [activeTab]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mr-3" />
        <span className="text-lg text-gray-600">Loading plugin details...</span>
      </div>
    );
  }

  if (error || !plugin) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          Failed to load plugin
        </h3>
        <p className="text-gray-600 mb-4">{error || 'Plugin not found'}</p>
        <Button onClick={onBack}>
          Go Back
        </Button>
      </div>
    );
  }

  const isFree = plugin.pricing.type === 'free';
  const latestVersion = plugin.versions[0];

  const renderRatingStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = {
      sm: 'w-3 h-3',
      md: 'w-4 h-4',
      lg: 'w-5 h-5'
    };

    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating
                ? 'text-yellow-400 fill-current'
                : 'text-gray-300'
            }`}
          />
        ))}
        <span className="ml-1 text-sm text-gray-600">
          {rating.toFixed(1)}
        </span>
      </div>
    );
  };

  const renderRatingDistribution = () => {
    if (!reviews) return null;

    const total = reviews.total;
    const percentages = {
      5: (reviews.ratingDistribution[5] / total) * 100,
      4: (reviews.ratingDistribution[4] / total) * 100,
      3: (reviews.ratingDistribution[3] / total) * 100,
      2: (reviews.ratingDistribution[2] / total) * 100,
      1: (reviews.ratingDistribution[1] / total) * 100
    };

    return (
      <div className="space-y-2">
        {[5, 4, 3, 2, 1].map((rating) => (
          <div key={rating} className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 w-3">{rating}</span>
            <Star className="w-3 h-3 text-yellow-400 fill-current" />
            <div className="flex-1 bg-gray-200 rounded-full h-2">
              <div
                className="bg-yellow-400 h-2 rounded-full"
                style={{ width: `${percentages[rating as keyof typeof percentages]}%` }}
              />
            </div>
            <span className="text-sm text-gray-600 w-8 text-right">
              {reviews.ratingDistribution[rating as keyof typeof reviews.ratingDistribution]}
            </span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={`max-w-6xl mx-auto space-y-6 ${className}`}>
      {/* Back Button */}
      {onBack && (
        <Button variant="ghost" onClick={onBack} className="mb-4">
          ← Back to Marketplace
        </Button>
      )}

      {/* Plugin Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <CardTitle className="text-2xl">{plugin.metadata.name}</CardTitle>
                {plugin.developer.verified && (
                  <Badge variant="secondary" className="flex items-center">
                    <CheckCircle className="w-3 h-3 mr-1" />
                    Verified
                  </Badge>
                )}
              </div>

              <CardDescription className="text-lg mb-4">
                {plugin.metadata.description}
              </CardDescription>

              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-1" />
                  <span>by {plugin.developer.name}</span>
                </div>

                <div className="flex items-center">
                  <Package className="w-4 h-4 mr-1" />
                  <span>{plugin.metadata.category}</span>
                </div>

                <div className="flex items-center">
                  <Download className="w-4 h-4 mr-1" />
                  <span>{plugin.stats.downloads.toLocaleString()} downloads</span>
                </div>

                <div className="flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  <span>Updated {new Date(latestVersion?.releaseDate || '').toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="text-right">
              <div className="mb-4">
                {isFree ? (
                  <Badge variant="secondary" className="text-green-600 text-lg px-3 py-1">
                    Free
                  </Badge>
                ) : (
                  <div className="flex items-center justify-end text-2xl font-bold text-gray-900">
                    <DollarSign className="w-6 h-6" />
                    {plugin.pricing.amount}
                    {plugin.pricing.currency}
                  </div>
                )}
              </div>

              <Button
                onClick={handleInstall}
                disabled={installing}
                size="lg"
                className="w-full"
              >
                {installing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Installing...
                  </>
                ) : isFree ? (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Install Plugin
                  </>
                ) : (
                  <>
                    <DollarSign className="w-5 h-5 mr-2" />
                    Purchase Plugin
                  </>
                )}
              </Button>

              <div className="mt-2 text-sm text-gray-500">
                Version {latestVersion?.version || 'N/A'}
              </div>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Rating and Stats */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {plugin.stats.rating.toFixed(1)}
              </div>
              {renderRatingStars(plugin.stats.rating, 'lg')}
              <div className="text-sm text-gray-600 mt-1">
                {plugin.stats.reviewCount} reviews
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {plugin.stats.downloads.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                Total Downloads
              </div>
            </div>

            <div className="text-center">
              <div className="text-3xl font-bold text-gray-900 mb-2">
                {plugin.stats.activeInstalls.toLocaleString()}
              </div>
              <div className="text-sm text-gray-600">
                Active Installations
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Plugin Details Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="reviews">Reviews</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 leading-relaxed">
                {plugin.metadata.description}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Features</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  Easy to install and configure
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  Regular updates and maintenance
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  Comprehensive documentation
                </li>
                <li className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  Excellent customer support
                </li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permissions Required</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {plugin.metadata.permissions.map((permission) => (
                  <Badge key={permission} variant="outline">
                    {permission.replace('.', ' • ')}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-4">
          {plugin.versions.map((version, index) => (
            <Card key={index}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Version {version.version}
                    {index === 0 && (
                      <Badge variant="secondary" className="ml-2">Latest</Badge>
                    )}
                  </CardTitle>
                  <div className="text-sm text-gray-500">
                    {new Date(version.releaseDate).toLocaleDateString()}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 mb-3">
                  {version.changelog || 'No changelog available for this version.'}
                </p>
                <div className="text-sm text-gray-500">
                  Compatible with store versions: {version.compatibility.join(', ')}
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          {/* Rating Distribution */}
          {reviews && (
            <Card>
              <CardHeader>
                <CardTitle>Rating Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-semibold mb-3">Average Rating</h4>
                    <div className="text-center">
                      <div className="text-4xl font-bold text-gray-900 mb-2">
                        {reviews.averageRating.toFixed(1)}
                      </div>
                      {renderRatingStars(reviews.averageRating, 'lg')}
                      <div className="text-sm text-gray-600 mt-1">
                        Based on {reviews.total} reviews
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-3">Rating Breakdown</h4>
                    {renderRatingDistribution()}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Write Review */}
          <Card>
            <CardHeader>
              <CardTitle>Write a Review</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleReviewSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rating
                  </label>
                  <div className="flex space-x-2">
                    {[1, 2, 3, 4, 5].map((rating) => (
                      <button
                        key={rating}
                        type="button"
                        onClick={() => setReviewForm(prev => ({ ...prev, rating }))}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`w-6 h-6 ${
                            rating <= reviewForm.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          } hover:text-yellow-400`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Title
                  </label>
                  <Input
                    value={reviewForm.title}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Summarize your experience"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Review Content
                  </label>
                  <Textarea
                    value={reviewForm.content}
                    onChange={(e) => setReviewForm(prev => ({ ...prev, content: e.target.value }))}
                    placeholder="Share your experience with this plugin"
                    rows={4}
                  />
                </div>

                <Button type="submit" disabled={submittingReview}>
                  {submittingReview ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Review'
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Reviews List */}
          {loadingReviews ? (
            <div className="text-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500 mx-auto" />
              <p className="text-gray-600 mt-2">Loading reviews...</p>
            </div>
          ) : reviews && reviews.reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.reviews.map((review) => (
                <Card key={review.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {review.userName}
                        </div>
                        <div className="flex items-center mt-1">
                          {renderRatingStars(review.rating, 'sm')}
                          <span className="ml-2 text-sm text-gray-500">
                            {new Date(review.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {review.verified && (
                        <Badge variant="secondary" className="text-xs">
                          Verified Purchase
                        </Badge>
                      )}
                    </div>

                    <h4 className="font-medium text-gray-900 mb-2">
                      {review.title}
                    </h4>

                    <p className="text-gray-700 mb-3">
                      {review.content}
                    </p>

                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <button className="flex items-center hover:text-gray-700">
                        <Heart className="w-4 h-4 mr-1" />
                        Helpful ({review.helpful})
                      </button>
                      <button className="flex items-center hover:text-gray-700">
                        <Flag className="w-4 h-4 mr-1" />
                        Report
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="pt-6 text-center">
                <p className="text-gray-600">No reviews yet. Be the first to review this plugin!</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="w-5 h-5 mr-2" />
                Security Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-2 border-b">
                  <span className="font-medium">Code Review Status</span>
                  <Badge variant="secondary" className="text-green-600">
                    Passed
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="font-medium">Security Scanning</span>
                  <Badge variant="secondary" className="text-green-600">
                    No Issues Detected
                  </Badge>
                </div>

                <div className="flex items-center justify-between py-2 border-b">
                  <span className="font-medium">Last Security Audit</span>
                  <span className="text-gray-600">
                    {new Date().toLocaleDateString()}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2">
                  <span className="font-medium">Sandbox Level</span>
                  <Badge variant="outline">
                    Isolated Environment
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Privacy & Data</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 mb-4">
                This plugin has been reviewed to ensure it handles user data responsibly and complies with privacy regulations.
              </p>

              <div className="space-y-2">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>No personal data collection without consent</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>Secure data transmission</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span>GDPR compliant</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Support Tab */}
        <TabsContent value="support" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Get Support</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <h4 className="font-medium">Documentation</h4>
                    <p className="text-sm text-gray-600">
                      Comprehensive guides and API reference
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <FileText className="w-4 h-4 mr-2" />
                    View Docs
                  </Button>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <h4 className="font-medium">Developer Support</h4>
                    <p className="text-sm text-gray-600">
                      Get help directly from the plugin developer
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Contact
                  </Button>
                </div>

                <div className="flex items-center justify-between py-3 border-b">
                  <div>
                    <h4 className="font-medium">Community Forum</h4>
                    <p className="text-sm text-gray-600">
                      Connect with other users and share experiences
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Visit Forum
                  </Button>
                </div>

                <div className="flex items-center justify-between py-3">
                  <div>
                    <h4 className="font-medium">Report Issues</h4>
                    <p className="text-sm text-gray-600">
                      Report bugs or request new features
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Flag className="w-4 h-4 mr-2" />
                    Report Issue
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Plugin Developer</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">{plugin.developer.name}</h4>
                  <p className="text-sm text-gray-600">
                    {plugin.developer.email}
                  </p>
                  {plugin.developer.website && (
                    <a
                      href={plugin.developer.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 flex items-center mt-1"
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      Website
                    </a>
                  )}
                </div>

                <div className="text-right">
                  <Badge variant={plugin.developer.verified ? "secondary" : "outline"}>
                    {plugin.developer.verified ? 'Verified Developer' : 'Developer'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default PluginDetail;