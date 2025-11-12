'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot,
  Users,
  Settings,
  Shield,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  BarChart3,
  Pause,
  Play,
  RotateCcw,
  Eye,
  Edit,
  Save,
  X
} from 'lucide-react';

interface AutomationConfig {
  general: {
    maxActionsPerHour: number;
    responseDelaySeconds: number;
    confidenceThreshold: number;
    enableLogging: boolean;
    enableNotifications: boolean;
  };
  throttling: {
    enabled: boolean;
    priceChangeThreshold: number;
    competitorResponseDelay: number;
    maxPriceChangesPerDay: number;
    promotionalResponseEnabled: boolean;
  };
  ai: {
    learningEnabled: boolean;
    modelRetrainingInterval: number;
    predictionConfidenceThreshold: number;
    enableBusinessInsights: boolean;
    feedbackProcessingEnabled: boolean;
  };
  emergency: {
    autoStopOnErrorRate: boolean;
    errorRateThreshold: number;
    maxConsecutiveFailures: number;
    enableAutoRecovery: boolean;
    recoveryDelayMinutes: number;
  };
}

interface PendingAction {
  id: string;
  type: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  estimatedImpact: string;
  requiresConfirmation: boolean;
  timestamp: Date;
}

export default function AutomationControls() {
  const [config, setConfig] = useState<AutomationConfig>({
    general: {
      maxActionsPerHour: 50,
      responseDelaySeconds: 300,
      confidenceThreshold: 0.75,
      enableLogging: true,
      enableNotifications: true
    },
    throttling: {
      enabled: true,
      priceChangeThreshold: 5,
      competitorResponseDelay: 600,
      maxPriceChangesPerDay: 10,
      promotionalResponseEnabled: true
    },
    ai: {
      learningEnabled: true,
      modelRetrainingInterval: 24,
      predictionConfidenceThreshold: 0.8,
      enableBusinessInsights: true,
      feedbackProcessingEnabled: true
    },
    emergency: {
      autoStopOnErrorRate: false,
      errorRateThreshold: 0.2,
      maxConsecutiveFailures: 5,
      enableAutoRecovery: true,
      recoveryDelayMinutes: 10
    }
  });

  const [pendingActions, setPendingActions] = useState<PendingAction[]>([
    {
      id: '1',
      type: 'PRICE_CHANGE',
      description: 'Adjust price for Product #123 to match competitor',
      priority: 'medium',
      confidence: 0.85,
      estimatedImpact: '+12% sales velocity',
      requiresConfirmation: true,
      timestamp: new Date()
    },
    {
      id: '2',
      type: 'PROMOTION',
      description: 'Launch flash sale for Category A',
      priority: 'high',
      confidence: 0.92,
      estimatedImpact: '+25% traffic, +15% conversion',
      requiresConfirmation: true,
      timestamp: new Date()
    }
  ]);

  const [editingConfig, setEditingConfig] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);

  const handleConfigUpdate = (section: keyof AutomationConfig, field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value
      }
    }));
  };

  const handleActionApproval = async (actionId: string, approved: boolean, reason?: string) => {
    try {
      const response = await fetch('/api/automation/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'confirm_action',
          data: {
            confirmation: {
              actionId,
              approved,
              reason,
              userId: 'current-user',
              timestamp: new Date()
            }
          }
        })
      });

      if (response.ok) {
        setPendingActions(prev => prev.filter(action => action.id !== actionId));
      }
    } catch (error) {
      console.error('Failed to handle action approval:', error);
    }
  };

  const saveConfiguration = async () => {
    try {
      const response = await fetch('/api/automation/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config })
      });

      if (response.ok) {
        setEditingConfig(false);
      }
    } catch (error) {
      console.error('Failed to save configuration:', error);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
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

  return (
    <div className="space-y-6">
      {/* Pending Actions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pending Actions</CardTitle>
              <CardDescription>
                Actions requiring your approval in Hybrid/Manual modes
              </CardDescription>
            </div>
            <Badge variant="secondary">
              {pendingActions.length} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {pendingActions.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">No pending actions</p>
              <p className="text-sm text-muted-foreground">All automation actions are up to date</p>
            </div>
          ) : (
            <div className="space-y-4">
              {pendingActions.map((action) => (
                <Card key={action.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <Badge className={getPriorityColor(action.priority)}>
                            {action.priority}
                          </Badge>
                          <Badge variant="outline">
                            {action.type}
                          </Badge>
                          <span className={`text-sm font-medium ${getConfidenceColor(action.confidence)}`}>
                            {Math.round(action.confidence * 100)}% confidence
                          </span>
                        </div>
                        <p className="font-medium mb-1">{action.description}</p>
                        <p className="text-sm text-muted-foreground mb-2">
                          <Target className="h-3 w-3 inline mr-1" />
                          Estimated impact: {action.estimatedImpact}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 inline mr-1" />
                          {action.timestamp.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2 ml-4">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedAction(action.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleActionApproval(action.id, true)}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleActionApproval(action.id, false, 'User rejected')}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Reject
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

      {/* Configuration Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Automation Configuration</CardTitle>
              <CardDescription>
                Fine-tune automation behavior and thresholds
              </CardDescription>
            </div>
            <div className="flex space-x-2">
              {editingConfig ? (
                <>
                  <Button onClick={saveConfiguration} size="sm">
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                  <Button onClick={() => setEditingConfig(false)} variant="outline" size="sm">
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setEditingConfig(true)} variant="outline" size="sm">
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="throttling">Throttling</TabsTrigger>
              <TabsTrigger value="ai">AI Settings</TabsTrigger>
              <TabsTrigger value="emergency">Emergency</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxActions">Max Actions Per Hour</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        id="maxActions"
                        min={1}
                        max={200}
                        step={5}
                        value={[config.general.maxActionsPerHour]}
                        onValueChange={([value]) => handleConfigUpdate('general', 'maxActionsPerHour', value)}
                        disabled={!editingConfig}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{config.general.maxActionsPerHour}</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="responseDelay">Response Delay (seconds)</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        id="responseDelay"
                        min={30}
                        max={1800}
                        step={30}
                        value={[config.general.responseDelaySeconds]}
                        onValueChange={([value]) => handleConfigUpdate('general', 'responseDelaySeconds', value)}
                        disabled={!editingConfig}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-16">{Math.floor(config.general.responseDelaySeconds / 60)}m</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="confidence">Confidence Threshold</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        id="confidence"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={[config.general.confidenceThreshold]}
                        onValueChange={([value]) => handleConfigUpdate('general', 'confidenceThreshold', value)}
                        disabled={!editingConfig}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{Math.round(config.general.confidenceThreshold * 100)}%</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="logging">Enable Logging</Label>
                      <Switch
                        id="logging"
                        checked={config.general.enableLogging}
                        onCheckedChange={(checked) => handleConfigUpdate('general', 'enableLogging', checked)}
                        disabled={!editingConfig}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="notifications">Enable Notifications</Label>
                      <Switch
                        id="notifications"
                        checked={config.general.enableNotifications}
                        onCheckedChange={(checked) => handleConfigUpdate('general', 'enableNotifications', checked)}
                        disabled={!editingConfig}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="throttling" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="priceThreshold">Price Change Threshold (%)</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        id="priceThreshold"
                        min={1}
                        max={20}
                        step={0.5}
                        value={[config.throttling.priceChangeThreshold]}
                        onValueChange={([value]) => handleConfigUpdate('throttling', 'priceChangeThreshold', value)}
                        disabled={!editingConfig}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{config.throttling.priceChangeThreshold}%</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="competitorDelay">Competitor Response Delay (minutes)</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        id="competitorDelay"
                        min={5}
                        max={120}
                        step={5}
                        value={[config.throttling.competitorResponseDelay / 60]}
                        onValueChange={([value]) => handleConfigUpdate('throttling', 'competitorResponseDelay', value * 60)}
                        disabled={!editingConfig}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{config.throttling.competitorResponseDelay / 60}m</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="maxPriceChanges">Max Price Changes Per Day</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        id="maxPriceChanges"
                        min={1}
                        max={50}
                        step={1}
                        value={[config.throttling.maxPriceChangesPerDay]}
                        onValueChange={([value]) => handleConfigUpdate('throttling', 'maxPriceChangesPerDay', value)}
                        disabled={!editingConfig}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{config.throttling.maxPriceChangesPerDay}</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="throttlingEnabled">Enable Auto-Throttling</Label>
                      <Switch
                        id="throttlingEnabled"
                        checked={config.throttling.enabled}
                        onCheckedChange={(checked) => handleConfigUpdate('throttling', 'enabled', checked)}
                        disabled={!editingConfig}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="promotionalResponse">Promotional Response</Label>
                      <Switch
                        id="promotionalResponse"
                        checked={config.throttling.promotionalResponseEnabled}
                        onCheckedChange={(checked) => handleConfigUpdate('throttling', 'promotionalResponseEnabled', checked)}
                        disabled={!editingConfig}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="retrainingInterval">Model Retraining Interval (hours)</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        id="retrainingInterval"
                        min={1}
                        max={168}
                        step={1}
                        value={[config.ai.modelRetrainingInterval]}
                        onValueChange={([value]) => handleConfigUpdate('ai', 'modelRetrainingInterval', value)}
                        disabled={!editingConfig}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{config.ai.modelRetrainingInterval}h</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="aiConfidence">AI Prediction Confidence Threshold</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        id="aiConfidence"
                        min={0.1}
                        max={1}
                        step={0.05}
                        value={[config.ai.predictionConfidenceThreshold]}
                        onValueChange={([value]) => handleConfigUpdate('ai', 'predictionConfidenceThreshold', value)}
                        disabled={!editingConfig}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{Math.round(config.ai.predictionConfidenceThreshold * 100)}%</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="aiLearning">Enable AI Learning</Label>
                    <Switch
                      id="aiLearning"
                      checked={config.ai.learningEnabled}
                      onCheckedChange={(checked) => handleConfigUpdate('ai', 'learningEnabled', checked)}
                      disabled={!editingConfig}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="businessInsights">Enable Business Insights</Label>
                    <Switch
                      id="businessInsights"
                      checked={config.ai.enableBusinessInsights}
                      onCheckedChange={(checked) => handleConfigUpdate('ai', 'enableBusinessInsights', checked)}
                      disabled={!editingConfig}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="feedbackProcessing">Enable Feedback Processing</Label>
                    <Switch
                      id="feedbackProcessing"
                      checked={config.ai.feedbackProcessingEnabled}
                      onCheckedChange={(checked) => handleConfigUpdate('ai', 'feedbackProcessingEnabled', checked)}
                      disabled={!editingConfig}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="errorThreshold">Error Rate Threshold</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        id="errorThreshold"
                        min={0.05}
                        max={0.5}
                        step={0.05}
                        value={[config.emergency.errorRateThreshold]}
                        onValueChange={([value]) => handleConfigUpdate('emergency', 'errorRateThreshold', value)}
                        disabled={!editingConfig}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{Math.round(config.emergency.errorRateThreshold * 100)}%</span>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="maxFailures">Max Consecutive Failures</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        id="maxFailures"
                        min={1}
                        max={20}
                        step={1}
                        value={[config.emergency.maxConsecutiveFailures]}
                        onValueChange={([value]) => handleConfigUpdate('emergency', 'maxConsecutiveFailures', value)}
                        disabled={!editingConfig}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{config.emergency.maxConsecutiveFailures}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label htmlFor="recoveryDelay">Recovery Delay (minutes)</Label>
                    <div className="flex items-center space-x-2">
                      <Slider
                        id="recoveryDelay"
                        min={1}
                        max={60}
                        step={1}
                        value={[config.emergency.recoveryDelayMinutes]}
                        onValueChange={([value]) => handleConfigUpdate('emergency', 'recoveryDelayMinutes', value)}
                        disabled={!editingConfig}
                        className="flex-1"
                      />
                      <span className="text-sm font-medium w-12">{config.emergency.recoveryDelayMinutes}m</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoStopError">Auto-Stop on High Error Rate</Label>
                      <Switch
                        id="autoStopError"
                        checked={config.emergency.autoStopOnErrorRate}
                        onCheckedChange={(checked) => handleConfigUpdate('emergency', 'autoStopOnErrorRate', checked)}
                        disabled={!editingConfig}
                      />
                    </div>

                    <div className="flex items-center justify-between">
                      <Label htmlFor="autoRecovery">Enable Auto-Recovery</Label>
                      <Switch
                        id="autoRecovery"
                        checked={config.emergency.enableAutoRecovery}
                        onCheckedChange={(checked) => handleConfigUpdate('emergency', 'enableAutoRecovery', checked)}
                        disabled={!editingConfig}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}