'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Eye,
  Users,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Activity,
  Target,
  DollarSign,
  ShoppingBag,
  Clock,
  BarChart3,
  RefreshCw,
  Settings,
  Plus,
  Search,
  Filter,
  Download,
  Zap,
  Shield
} from 'lucide-react';

interface CompetitorData {
  id: string;
  name: string;
  domain: string;
  status: 'active' | 'inactive' | 'error';
  lastScraped: Date;
  productCount: number;
  avgPrice: number;
  priceRange: { min: number; max: number };
  recentActivity: number;
  marketShare: number;
  alerts: number;
}

interface CompetitorActivity {
  id: string;
  competitorId: string;
  competitorName: string;
  type: 'PRICE_CHANGE' | 'NEW_PRODUCT' | 'OUT_OF_STOCK' | 'PROMOTION' | 'PRODUCT_REMOVED';
  productId?: string;
  productName?: string;
  oldPrice?: number;
  newPrice?: number;
  discount?: number;
  impact: number;
  timestamp: Date;
}

interface MarketIntelligence {
  marketVolatility: number;
  priceLeadership: string[];
  opportunities: string[];
  threats: string[];
  trends: {
    direction: 'up' | 'down' | 'stable';
    confidence: number;
    description: string;
  }[];
}

export default function CompetitorMonitoringDashboard() {
  const [competitors, setCompetitors] = useState<CompetitorData[]>([]);
  const [activities, setActivities] = useState<CompetitorActivity[]>([]);
  const [marketIntelligence, setMarketIntelligence] = useState<MarketIntelligence | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompetitor, setSelectedCompetitor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchCompetitorData();
    if (autoRefresh) {
      const interval = setInterval(fetchCompetitorData, 300000); // Update every 5 minutes
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const fetchCompetitorData = async () => {
    try {
      // Fetch competitor data
      const competitorsResponse = await fetch('/api/competitors/monitoring');
      if (competitorsResponse.ok) {
        const data = await competitorsResponse.json();
        setCompetitors(data.competitors || []);
      }

      // Fetch recent activities
      const activitiesResponse = await fetch('/api/competitors/activities');
      if (activitiesResponse.ok) {
        const data = await activitiesResponse.json();
        setActivities(data.activities || []);
      }

      // Fetch market intelligence
      const intelligenceResponse = await fetch('/api/competitors/intelligence');
      if (intelligenceResponse.ok) {
        const data = await intelligenceResponse.json();
        setMarketIntelligence(data);
      }
    } catch (error) {
      console.error('Failed to fetch competitor data:', error);
    } finally {
      setLoading(false);
    }
  };

  const addCompetitorMonitor = async (competitorData: any) => {
    try {
      const response = await fetch('/api/competitors/monitor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(competitorData)
      });

      if (response.ok) {
        fetchCompetitorData();
      }
    } catch (error) {
      console.error('Failed to add competitor monitor:', error);
    }
  };

  const analyzeCompetitor = async (competitorId: string) => {
    try {
      const response = await fetch(`/api/competitors/${competitorId}/analyze`, {
        method: 'POST'
      });

      if (response.ok) {
        fetchCompetitorData();
      }
    } catch (error) {
      console.error('Failed to analyze competitor:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'PRICE_CHANGE': return <DollarSign className="h-4 w-4" />;
      case 'NEW_PRODUCT': return <ShoppingBag className="h-4 w-4" />;
      case 'OUT_OF_STOCK': return <AlertTriangle className="h-4 w-4" />;
      case 'PROMOTION': return <Target className="h-4 w-4" />;
      case 'PRODUCT_REMOVED': return <ShoppingBag className="h-4 w-4 text-red-500" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50';
      case 'inactive': return 'text-gray-600 bg-gray-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getImpactColor = (impact: number) => {
    if (impact >= 0.3) return 'text-red-600';
    if (impact >= 0.1) return 'text-yellow-600';
    return 'text-green-600';
  };

  const formatPriceChange = (oldPrice: number, newPrice: number) => {
    const change = ((newPrice - oldPrice) / oldPrice) * 100;
    const color = change > 0 ? 'text-red-600' : 'text-green-600';
    const icon = change > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;

    return (
      <span className={`flex items-center ${color}`}>
        {icon}
        {Math.abs(change).toFixed(1)}%
      </span>
    );
  };

  const filteredCompetitors = competitors.filter(competitor =>
    competitor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    competitor.domain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const recentActivities = activities
    .filter(activity => !selectedCompetitor || activity.competitorId === selectedCompetitor)
    .slice(0, 20);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Eye className="h-12 w-12 animate-pulse mx-auto mb-4" />
          <p className="text-lg font-medium">Loading Competitor Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Competitor Intelligence</h1>
          <p className="text-muted-foreground">Real-time competitor monitoring and market analysis</p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              checked={autoRefresh}
              onCheckedChange={setAutoRefresh}
            />
            <span className="text-sm">Auto-refresh</span>
          </div>
          <Button onClick={fetchCompetitorData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Add Competitor
          </Button>
        </div>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Competitors</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competitors.filter(c => c.status === 'active').length}
            </div>
            <p className="text-xs text-muted-foreground">
              {competitors.length} total monitored
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Market Volatility</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketIntelligence ? Math.round(marketIntelligence.marketVolatility * 100) : 0}%
            </div>
            <Progress value={marketIntelligence ? marketIntelligence.marketVolatility * 100 : 0} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Activities</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activities.length}</div>
            <p className="text-xs text-muted-foreground">Last 24 hours</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {competitors.reduce((sum, c) => sum + c.alerts, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Requiring attention</p>
          </CardContent>
        </Card>
      </div>

      {/* Market Intelligence */}
      {marketIntelligence && (
        <Card>
          <CardHeader>
            <CardTitle>Market Intelligence</CardTitle>
            <CardDescription>
              AI-powered market analysis and competitive insights
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-2" />
                  Price Leaders
                </h3>
                <div className="space-y-2">
                  {marketIntelligence.priceLeadership.map((leader, index) => (
                    <div key={index} className="flex items-center justify-between text-sm">
                      <span>{leader}</span>
                      <Badge variant="outline">Lowest prices</Badge>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <Target className="h-4 w-4 mr-2" />
                  Opportunities
                </h3>
                <div className="space-y-2">
                  {marketIntelligence.opportunities.map((opportunity, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <div className="w-1 h-1 bg-green-500 rounded-full mt-2"></div>
                      <span>{opportunity}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-3 flex items-center">
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Threats
                </h3>
                <div className="space-y-2">
                  {marketIntelligence.threats.map((threat, index) => (
                    <div key={index} className="flex items-start space-x-2 text-sm">
                      <div className="w-1 h-1 bg-red-500 rounded-full mt-2"></div>
                      <span>{threat}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Competitors List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Competitor Monitoring</CardTitle>
                <div className="flex items-center space-x-2">
                  <div className="relative">
                    <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search competitors..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-9 w-64"
                    />
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredCompetitors.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-lg font-medium">No competitors found</p>
                  <p className="text-sm text-muted-foreground">Add competitors to start monitoring</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredCompetitors.map((competitor) => (
                    <Card key={competitor.id} className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedCompetitor(competitor.id === selectedCompetitor ? null : competitor.id)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <div>
                              <h3 className="font-semibold">{competitor.name}</h3>
                              <p className="text-sm text-muted-foreground">{competitor.domain}</p>
                            </div>
                            <Badge className={getStatusColor(competitor.status)}>
                              {competitor.status}
                            </Badge>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{competitor.productCount} products</p>
                            <p className="text-sm text-muted-foreground">
                              Avg: ${competitor.avgPrice.toFixed(2)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-muted-foreground">Price Range</p>
                            <p className="font-medium">
                              ${competitor.priceRange.min} - ${competitor.priceRange.max}
                            </p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Market Share</p>
                            <p className="font-medium">{competitor.marketShare.toFixed(1)}%</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Activity</p>
                            <p className="font-medium">{competitor.recentActivity} today</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Alerts</p>
                            <p className={`font-medium ${competitor.alerts > 0 ? 'text-red-600' : ''}`}>
                              {competitor.alerts}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          <p className="text-xs text-muted-foreground">
                            Last scraped: {competitor.lastScraped.toLocaleString()}
                          </p>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button size="sm" variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      analyzeCompetitor(competitor.id);
                                    }}>
                              <BarChart3 className="h-3 w-3 mr-1" />
                              Analyze
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activities */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Recent Activities</CardTitle>
              <CardDescription>
                Latest competitor movements and changes
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivities.length === 0 ? (
                <div className="text-center py-8">
                  <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">No recent activities</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="p-3 border rounded-lg">
                      <div className="flex items-start space-x-3">
                        <div className="mt-1">
                          {getActivityIcon(activity.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{activity.competitorName}</p>
                          <p className="text-sm text-muted-foreground mb-1">
                            {activity.type.replace('_', ' ')}
                            {activity.productName && ` - ${activity.productName}`}
                          </p>

                          {activity.oldPrice && activity.newPrice && (
                            <div className="flex items-center space-x-2 text-sm">
                              <span>${activity.oldPrice}</span>
                              {formatPriceChange(activity.oldPrice, activity.newPrice)}
                              <span>${activity.newPrice}</span>
                            </div>
                          )}

                          {activity.discount && (
                            <p className="text-sm text-blue-600">
                              {activity.discount}% discount
                            </p>
                          )}

                          <div className="flex items-center justify-between mt-2">
                            <span className="text-xs text-muted-foreground">
                              {activity.timestamp.toLocaleString()}
                            </span>
                            <span className={`text-xs font-medium ${getImpactColor(activity.impact)}`}>
                              Impact: {Math.round(activity.impact * 100)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Price Trends</TabsTrigger>
          <TabsTrigger value="analysis">Market Analysis</TabsTrigger>
          <TabsTrigger value="alerts">Alerts Management</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Price Trend Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-96 flex items-center justify-center bg-muted/50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Price trend visualization chart</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Competitive Positioning</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Your avg. price</span>
                    <span className="font-medium">$125.50</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Market avg. price</span>
                    <span className="font-medium">$118.30</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Lowest competitor</span>
                    <span className="font-medium">$95.99</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Highest competitor</span>
                    <span className="font-medium">$156.75</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Market Share Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {competitors.slice(0, 5).map((competitor) => (
                    <div key={competitor.id} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>{competitor.name}</span>
                        <span>{competitor.marketShare.toFixed(1)}%</span>
                      </div>
                      <Progress value={competitor.marketShare} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Competitive Alerts</CardTitle>
              <CardDescription>
                Important competitor movements requiring attention
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activities
                  .filter(a => a.impact > 0.2)
                  .slice(0, 10)
                  .map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${
                          activity.type === 'PRICE_CHANGE' ? 'bg-red-100' :
                          activity.type === 'PROMOTION' ? 'bg-blue-100' :
                          'bg-yellow-100'
                        }`}>
                          {getActivityIcon(activity.type)}
                        </div>
                        <div>
                          <p className="font-medium">{activity.competitorName}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.type.replace('_', ' ')}
                            {activity.productName && ` - ${activity.productName}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={activity.impact > 0.3 ? 'destructive' : 'secondary'}>
                          {Math.round(activity.impact * 100)}% impact
                        </Badge>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}