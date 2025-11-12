'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Brain,
  TrendingUp,
  Target,
  Lightbulb,
  BarChart3,
  Activity,
  CheckCircle,
  AlertTriangle,
  Info,
  Zap,
  Clock,
  DollarSign,
  Users,
  ShoppingBag,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';

interface AIInsight {
  id: string;
  type: 'opportunity' | 'risk' | 'recommendation' | 'trend';
  title: string;
  description: string;
  confidence: number;
  impact: 'low' | 'medium' | 'high';
  category: string;
  timestamp: Date;
  actionable: boolean;
  estimatedValue?: number;
}

interface ModelPerformance {
  modelId: string;
  modelName: string;
  accuracy: number;
  predictions: number;
  improvementRate: number;
  lastTraining: Date;
  status: 'active' | 'training' | 'inactive';
}

interface BusinessMetric {
  name: string;
  current: number;
  previous: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
}

export default function AIInsightsDashboard() {
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [models, setModels] = useState<ModelPerformance[]>([]);
  const [metrics, setMetrics] = useState<BusinessMetric[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('7d');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAIInsights();
    const interval = setInterval(fetchAIInsights, 300000); // Update every 5 minutes
    return () => clearInterval(interval);
  }, [selectedTimeframe, selectedCategory]);

  const fetchAIInsights = async () => {
    try {
      const response = await fetch(`/api/automation/insights?timeframe=${selectedTimeframe}&recommendations=true`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data.insights || []);
        setModels(data.models || []);
        setMetrics(data.metrics || []);
      }
    } catch (error) {
      console.error('Failed to fetch AI insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const trainModel = async (modelId: string) => {
    try {
      const response = await fetch('/api/ai/models/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId })
      });

      if (response.ok) {
        fetchAIInsights();
      }
    } catch (error) {
      console.error('Failed to train model:', error);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'opportunity': return <Target className="h-4 w-4 text-green-500" />;
      case 'risk': return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'recommendation': return <Lightbulb className="h-4 w-4 text-blue-500" />;
      case 'trend': return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default: return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high': return 'text-red-600 bg-red-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return 'text-green-600';
    if (confidence >= 0.7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getModelStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'training': return 'text-blue-600';
      case 'inactive': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const formatTrend = (trend: string, value: number) => {
    const icon = trend === 'up' ? <TrendingUp className="h-4 w-4" /> :
                 trend === 'down' ? <TrendingUp className="h-4 w-4 rotate-180" /> :
                 <div className="h-4 w-4 bg-gray-300 rounded-full" />;

    return (
      <div className={`flex items-center space-x-1 ${
        trend === 'up' ? 'text-green-600' :
        trend === 'down' ? 'text-red-600' : 'text-gray-600'
      }`}>
        {icon}
        <span>{Math.abs(value)}%</span>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Brain className="h-12 w-12 animate-pulse mx-auto mb-4" />
          <p className="text-lg font-medium">Loading AI Insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Insights Dashboard</h1>
          <p className="text-muted-foreground">Business intelligence and learning system analytics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              <SelectItem value="pricing">Pricing</SelectItem>
              <SelectItem value="inventory">Inventory</SelectItem>
              <SelectItem value="marketing">Marketing</SelectItem>
              <SelectItem value="operations">Operations</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="24h">24 Hours</SelectItem>
              <SelectItem value="7d">7 Days</SelectItem>
              <SelectItem value="30d">30 Days</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={fetchAIInsights} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Accuracy</CardTitle>
            <Brain className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92.5%</div>
            <Progress value={92.5} className="mt-2" />
            <p className="text-xs text-muted-foreground">+2.3% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Insights</CardTitle>
            <Lightbulb className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{insights.length}</div>
            <div className="flex space-x-1 mt-2">
              <Badge variant="secondary" className="text-xs">
                {insights.filter(i => i.type === 'opportunity').length} opportunities
              </Badge>
              <Badge variant="destructive" className="text-xs">
                {insights.filter(i => i.type === 'risk').length} risks
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Learning Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">87%</div>
            <Progress value={87} className="mt-2" />
            <p className="text-xs text-muted-foreground">Model improvement rate</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Predictions</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,247</div>
            <p className="text-xs text-muted-foreground">This period</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>AI Insights & Recommendations</CardTitle>
              <CardDescription>
                Actionable insights generated by the AI learning system
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium">No insights available</p>
              <p className="text-sm text-muted-foreground">AI insights will appear as the system learns from your data</p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <Card key={insight.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          {getInsightIcon(insight.type)}
                          <Badge className={getImpactColor(insight.impact)}>
                            {insight.impact}
                          </Badge>
                          <Badge variant="outline">
                            {insight.category}
                          </Badge>
                          <span className={`text-sm font-medium ${getConfidenceColor(insight.confidence)}`}>
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                          {insight.actionable && (
                            <Badge variant="secondary">Actionable</Badge>
                          )}
                        </div>
                        <h3 className="font-semibold mb-1">{insight.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">{insight.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {insight.timestamp.toLocaleString()}
                          </span>
                          {insight.estimatedValue && (
                            <span className="flex items-center">
                              <DollarSign className="h-3 w-3 mr-1" />
                              Est. value: ${insight.estimatedValue.toLocaleString()}
                            </span>
                          )}
                        </div>
                      </div>
                      {insight.actionable && (
                        <Button size="sm" className="ml-4">
                          Take Action
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Model Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Model Performance</CardTitle>
            <CardDescription>
              AI learning models and their performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {models.map((model) => (
                <div key={model.modelId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium">{model.modelName}</h4>
                      <p className="text-sm text-muted-foreground">
                        {model.predictions.toLocaleString()} predictions
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge className={getModelStatusColor(model.status)}>
                        {model.status}
                      </Badge>
                      <p className="text-sm text-muted-foreground">
                        {Math.round(model.accuracy * 100)}% accuracy
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Progress value={model.accuracy * 100} className="flex-1" />
                    <span className="text-sm text-muted-foreground">
                      +{Math.round(model.improvementRate * 100)}%
                    </span>
                    {model.status === 'active' && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => trainModel(model.modelId)}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Train
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Business Impact Metrics</CardTitle>
            <CardDescription>
              Key business metrics influenced by AI decisions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-medium">Revenue Increase</p>
                    <p className="text-sm text-muted-foreground">AI-optimized pricing</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">+18.3%</p>
                  <p className="text-xs text-muted-foreground">vs baseline</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <ShoppingBag className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-medium">Conversion Rate</p>
                    <p className="text-sm text-muted-foreground">AI-recommended actions</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-blue-600">+12.7%</p>
                  <p className="text-xs text-muted-foreground">improvement</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Users className="h-5 w-5 text-purple-600" />
                  <div>
                    <p className="font-medium">Customer Satisfaction</p>
                    <p className="text-sm text-muted-foreground">Personalization impact</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-purple-600">94.2%</p>
                  <p className="text-xs text-muted-foreground">satisfaction score</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Zap className="h-5 w-5 text-orange-600" />
                  <div>
                    <p className="font-medium">Operational Efficiency</p>
                    <p className="text-sm text-muted-foreground">Automation savings</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-orange-600">+67%</p>
                  <p className="text-xs text-muted-foreground">time saved</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Trends Analysis</TabsTrigger>
          <TabsTrigger value="predictions">Predictions</TabsTrigger>
          <TabsTrigger value="learning">Learning Progress</TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>AI Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                  <div className="text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-sm text-muted-foreground">Performance trend chart</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Insight Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pricing Opportunities</span>
                    <span className="font-medium">{insights.filter(i => i.category === 'pricing').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Inventory Insights</span>
                    <span className="font-medium">{insights.filter(i => i.category === 'inventory').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Marketing Recommendations</span>
                    <span className="font-medium">{insights.filter(i => i.category === 'marketing').length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Operational Improvements</span>
                    <span className="font-medium">{insights.filter(i => i.category === 'operations').length}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="predictions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent AI Predictions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-muted/50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">Prediction accuracy visualization</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="learning" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Learning Progress Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center space-x-4 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div className="flex-1">
                    <p className="font-medium">Pricing Model Trained</p>
                    <p className="text-sm text-muted-foreground">Improved accuracy by 3.2%</p>
                  </div>
                  <span className="text-sm text-muted-foreground">2 hours ago</span>
                </div>

                <div className="flex items-center space-x-4 p-3 bg-blue-50 rounded-lg">
                  <Brain className="h-5 w-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="font-medium">New Pattern Detected</p>
                    <p className="text-sm text-muted-foreground">Weekend shopping behavior analysis</p>
                  </div>
                  <span className="text-sm text-muted-foreground">5 hours ago</span>
                </div>

                <div className="flex items-center space-x-4 p-3 bg-purple-50 rounded-lg">
                  <Target className="h-5 w-5 text-purple-600" />
                  <div className="flex-1">
                    <p className="font-medium">Demand Forecast Updated</p>
                    <p className="text-sm text-muted-foreground">15 product categories optimized</p>
                  </div>
                  <span className="text-sm text-muted-foreground">1 day ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}