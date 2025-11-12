import { auditLogger } from './audit-logger';
import { decisionEngine } from './decision-engine';
import { aiLearningSystem } from './ai-learning-system';
import { autoThrottlingService } from './auto-throttling-service';
import { pricingAutomationService } from './pricing-automation';
import { inventoryAutomationService } from './inventory-automation';
import type {
  AutomationMode,
  AutomationConfig,
  AutomationAction,
  AutomationOutcome,
  UserConfirmation,
  AutomationAlert,
  PerformanceMetrics
} from '@/types';

export class HandsOffAutomation {
  private currentMode: AutomationMode = 'manual';
  private config: AutomationConfig;
  private isActive: boolean = false;
  private pendingActions = new Map<string, AutomationAction>();
  private userConfirmations = new Map<string, UserConfirmation>();
  private automationHistory = new Map<string, AutomationOutcome[]>();
  private performanceMetrics = new Map<string, PerformanceMetrics[]>();
  private alertQueue: AutomationAlert[] = [];
  private emergencyStop: boolean = false;
  private learningRate: number = 0.1;

  constructor(config: AutomationConfig) {
    this.config = config;
    this.currentMode = config.defaultMode || 'manual';
    this.initializeHandsOffAutomation();
  }

  /**
   * Initialize Hands-Off automation system
   */
  async initialize(): Promise<void> {
    await this.loadAutomationConfig();
    await this.loadPendingActions();
    await this.startAutomationEngine();
    this.startPerformanceMonitoring();
    this.startAlertProcessing();

    console.log(`Hands-Off automation initialized in ${this.currentMode} mode`);
  }

  /**
   * Set automation mode
   */
  async setAutomationMode(mode: AutomationMode, reason?: string): Promise<void> {
    try {
      const previousMode = this.currentMode;
      this.currentMode = mode;

      await auditLogger.logAutomationEvent('automation_mode_changed', {
        previousMode,
        newMode: mode,
        reason: reason || 'User initiated',
        timestamp: new Date()
      });

      console.log(`Automation mode changed: ${previousMode} → ${mode}`);

      // Handle mode transition
      await this.handleModeTransition(previousMode, mode);

    } catch (error) {
      console.error('Failed to set automation mode:', error);
      throw new Error(`Failed to set automation mode: ${error.message}`);
    }
  }

  /**
   * Process automation request
   */
  async processAutomationRequest(request: AutomationRequest): Promise<AutomationResponse> {
    try {
      if (!this.isActive || this.emergencyStop) {
        return {
          success: false,
          actionId: request.id,
          status: 'blocked',
          reason: this.emergencyStop ? 'Emergency stop activated' : 'Automation not active'
        };
      }

      // Validate request
      const validation = await this.validateAutomationRequest(request);
      if (!validation.valid) {
        return {
          success: false,
          actionId: request.id,
          status: 'rejected',
          reason: validation.reason
        };
      }

      // Route based on automation mode
      const outcome = await this.routeByMode(request);

      // Record outcome
      await this.recordAutomationOutcome(outcome);

      return {
        success: outcome.success,
        actionId: request.id,
        status: outcome.status,
        result: outcome.result,
        requiresConfirmation: outcome.requiresConfirmation,
        executedAt: outcome.executedAt
      };

    } catch (error) {
      console.error('Failed to process automation request:', error);
      throw new Error(`Failed to process automation request: ${error.message}`);
    }
  }

  /**
   * Handle user confirmation
   */
  async handleUserConfirmation(confirmation: UserConfirmation): Promise<ConfirmationResult> {
    try {
      const actionId = confirmation.actionId;
      const pendingAction = this.pendingActions.get(actionId);

      if (!pendingAction) {
        return {
          success: false,
          reason: 'No pending action found for confirmation'
        };
      }

      this.userConfirmations.set(actionId, confirmation);

      if (confirmation.approved) {
        // Execute the approved action
        const outcome = await this.executeAction(pendingAction);
        this.pendingActions.delete(actionId);

        await auditLogger.logAutomationEvent('action_confirmed_and_executed', {
          actionId,
          actionType: pendingAction.type,
          userId: confirmation.userId,
          timestamp: new Date()
        });

        return {
          success: true,
          outcome,
          message: 'Action approved and executed successfully'
        };

      } else {
        // Reject the action
        this.pendingActions.delete(actionId);

        await auditLogger.logAutomationEvent('action_rejected', {
          actionId,
          actionType: pendingAction.type,
          userId: confirmation.userId,
          reason: confirmation.reason,
          timestamp: new Date()
        });

        return {
          success: true,
          message: 'Action rejected by user'
        };
      }

    } catch (error) {
      console.error('Failed to handle user confirmation:', error);
      throw new Error(`Failed to handle user confirmation: ${error.message}`);
    }
  }

  /**
   * Get automation status
   */
  async getAutomationStatus(): Promise<AutomationStatus> {
    try {
      const recentOutcomes = this.getRecentOutcomes();
      const performanceMetrics = this.calculatePerformanceMetrics(recentOutcomes);

      const status: AutomationStatus = {
        isActive: this.isActive,
        currentMode: this.currentMode,
        emergencyStop: this.emergencyStop,
        pendingActions: Array.from(this.pendingActions.values()),
        recentOutcomes: recentOutcomes.slice(-20),
        performanceMetrics,
        alerts: this.alertQueue.slice(-10),
        uptime: this.isActive ? Date.now() - (this.config.startTime || Date.now()) : 0,
        lastActivity: this.getLastActivityTime(),
        learningEnabled: aiLearningSystem ? true : false,
        autoThrottlingEnabled: autoThrottlingService ? true : false
      };

      return status;

    } catch (error) {
      console.error('Failed to get automation status:', error);
      throw new Error(`Failed to get automation status: ${error.message}`);
    }
  }

  /**
   * Emergency stop automation
   */
  async emergencyStopAutomation(reason?: string): Promise<void> {
    try {
      this.emergencyStop = true;
      this.isActive = false;

      // Cancel all pending actions
      for (const [actionId, action] of this.pendingActions) {
        await auditLogger.logAutomationEvent('action_cancelled_emergency_stop', {
          actionId,
          actionType: action.type,
          reason: reason || 'Emergency stop activated'
        });
      }
      this.pendingActions.clear();

      await auditLogger.logAutomationEvent('emergency_stop_activated', {
        reason: reason || 'Manual emergency stop',
        previousMode: this.currentMode,
        timestamp: new Date()
      });

      console.log('EMERGENCY STOP ACTIVATED - All automation paused');

    } catch (error) {
      console.error('Failed to activate emergency stop:', error);
      throw new Error(`Failed to activate emergency stop: ${error.message}`);
    }
  }

  /**
   * Resume automation
   */
  async resumeAutomation(): Promise<void> {
    try {
      this.emergencyStop = false;
      this.isActive = true;

      await auditLogger.logAutomationEvent('automation_resumed', {
        previousMode: this.currentMode,
        timestamp: new Date()
      });

      console.log('Automation resumed');

    } catch (error) {
      console.error('Failed to resume automation:', error);
      throw new Error(`Failed to resume automation: ${error.message}`);
    }
  }

  /**
   * Get automation insights
   */
  async getAutomationInsights(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<AutomationInsights> {
    try {
      const outcomes = this.getOutcomesByTimeframe(timeframe);
      const metrics = this.calculatePerformanceMetrics(outcomes);

      const insights: AutomationInsights = {
        timeframe,
        totalActions: outcomes.length,
        successfulActions: outcomes.filter(o => o.success).length,
        failedActions: outcomes.filter(o => !o.success).length,
        averageExecutionTime: this.calculateAverageExecutionTime(outcomes),
        modeDistribution: this.calculateModeDistribution(outcomes),
        actionTypeDistribution: this.calculateActionTypeDistribution(outcomes),
        userInterventionRate: this.calculateUserInterventionRate(outcomes),
        learningProgress: this.calculateLearningProgress(outcomes),
        topPerformingActions: this.identifyTopPerformingActions(outcomes),
        areasForImprovement: this.identifyAreasForImprovement(outcomes),
        recommendations: await this.generateRecommendations(metrics),
        trends: this.analyzeTrends(outcomes)
      };

      return insights;

    } catch (error) {
      console.error('Failed to get automation insights:', error);
      throw new Error(`Failed to get automation insights: ${error.message}`);
    }
  }

  // Private methods

  private async initializeHandsOffAutomation(): Promise<void> {
    await this.loadAutomationConfig();
  }

  private async loadAutomationConfig(): Promise<void> {
    // Load automation configuration from database
  }

  private async loadPendingActions(): Promise<void> {
    // Load pending actions from database
  }

  private async startAutomationEngine(): void {
    // Main automation engine loop
    setInterval(async () => {
      if (this.isActive && !this.emergencyStop) {
        await this.processAutomationQueue().catch(console.error);
      }
    }, 5000); // Every 5 seconds
  }

  private startPerformanceMonitoring(): void {
    setInterval(async () => {
      await this.updatePerformanceMetrics().catch(console.error);
    }, 60 * 60 * 1000); // Every hour
  }

  private startAlertProcessing(): void {
    setInterval(async () => {
      await this.processAlerts().catch(console.error);
    }, 30 * 1000); // Every 30 seconds
  }

  private async processAutomationQueue(): Promise<void> {
    // Process queued automation tasks
  }

  private async handleModeTransition(fromMode: AutomationMode, toMode: AutomationMode): Promise<void> {
    switch (toMode) {
      case 'full':
        console.log('Switching to Full Automation - AI will handle all decisions');
        // Enable all automated systems
        break;
      case 'hybrid':
        console.log('Switching to Hybrid Mode - AI suggests, user confirms critical actions');
        // Enable partial automation with confirmations
        break;
      case 'manual':
        console.log('Switching to Manual Mode - All decisions require user input');
        // Disable automation, keep monitoring
        // Cancel pending actions
        for (const [actionId, action] of this.pendingActions) {
          if (action.priority !== 'critical') {
            this.pendingActions.delete(actionId);
          }
        }
        break;
    }
  }

  private async routeByMode(request: AutomationRequest): Promise<AutomationOutcome> {
    switch (this.currentMode) {
      case 'full':
        return await this.executeFullAutomation(request);
      case 'hybrid':
        return await this.executeHybridAutomation(request);
      case 'manual':
        return await this.executeManualAutomation(request);
      default:
        throw new Error(`Unknown automation mode: ${this.currentMode}`);
    }
  }

  private async executeFullAutomation(request: AutomationRequest): Promise<AutomationOutcome> {
    try {
      // Full automation - execute immediately
      const action = await this.prepareAction(request);
      const outcome = await this.executeAction(action);

      return {
        id: request.id,
        success: true,
        actionType: request.type,
        mode: 'full',
        status: 'executed',
        result: outcome.result,
        executedAt: new Date(),
        requiresConfirmation: false,
        confidence: action.confidence
      };

    } catch (error) {
      return {
        id: request.id,
        success: false,
        actionType: request.type,
        mode: 'full',
        status: 'failed',
        error: error.message,
        executedAt: new Date(),
        requiresConfirmation: false,
        confidence: 0
      };
    }
  }

  private async executeHybridAutomation(request: AutomationRequest): Promise<AutomationOutcome> {
    try {
      const action = await this.prepareAction(request);

      // Determine if action requires user confirmation
      const requiresConfirmation = await this.requiresUserConfirmation(action);

      if (requiresConfirmation) {
        // Queue for user confirmation
        this.pendingActions.set(request.id, action);

        return {
          id: request.id,
          success: true,
          actionType: request.type,
          mode: 'hybrid',
          status: 'pending_confirmation',
          result: null,
          executedAt: new Date(),
          requiresConfirmation: true,
          confidence: action.confidence
        };

      } else {
        // Execute non-critical actions immediately
        const outcome = await this.executeAction(action);

        return {
          id: request.id,
          success: true,
          actionType: request.type,
          mode: 'hybrid',
          status: 'executed',
          result: outcome.result,
          executedAt: new Date(),
          requiresConfirmation: false,
          confidence: action.confidence
        };
      }

    } catch (error) {
      return {
        id: request.id,
        success: false,
        actionType: request.type,
        mode: 'hybrid',
        status: 'failed',
        error: error.message,
        executedAt: new Date(),
        requiresConfirmation: false,
        confidence: 0
      };
    }
  }

  private async executeManualAutomation(request: AutomationRequest): Promise<AutomationOutcome> {
    // Manual mode - always require user confirmation
    const action = await this.prepareAction(request);
    this.pendingActions.set(request.id, action);

    return {
      id: request.id,
      success: true,
      actionType: request.type,
      mode: 'manual',
      status: 'pending_confirmation',
      result: null,
      executedAt: new Date(),
      requiresConfirmation: true,
      confidence: action.confidence
    };
  }

  private async validateAutomationRequest(request: AutomationRequest): Promise<ValidationResult> {
    // Validate request based on business rules, current state, etc.
    return { valid: true };
  }

  private async prepareAction(request: AutomationRequest): Promise<AutomationAction> {
    const action: AutomationAction = {
      id: request.id,
      type: request.type,
      productId: request.productId,
      data: request.data,
      priority: request.priority || 'medium',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
      confidence: 0.8,
      riskLevel: 'medium'
    };

    // Get AI confidence if available
    if (this.config.enableAI) {
      try {
        const aiInsight = await this.getAIInsight(request);
        action.confidence = aiInsight.confidence;
        action.riskLevel = aiInsight.riskLevel;
      } catch (error) {
        console.error('Failed to get AI insight:', error);
      }
    }

    return action;
  }

  private async executeAction(action: AutomationAction): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      let result: any;

      switch (action.type) {
        case 'PRICE_CHANGE':
          result = await this.executePriceChange(action);
          break;
        case 'PROMOTION':
          result = await this.executePromotion(action);
          break;
        case 'RESTOCK':
          result = await this.executeRestock(action);
          break;
        case 'SUPPLIER_CHANGE':
          result = await this.executeSupplierChange(action);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      return {
        success: true,
        result,
        executionTime: Date.now() - startTime
      };

    } catch (error) {
      return {
        success: false,
        error: error.message,
        executionTime: Date.now() - startTime
      };
    }
  }

  private async requiresUserConfirmation(action: AutomationAction): Promise<boolean> {
    // Determine if action requires user confirmation based on:
    // - Action type
    // - Risk level
    // - Financial impact
    // - Business rules

    if (action.priority === 'critical') return true;
    if (action.riskLevel === 'high') return true;

    // Check financial impact
    if (action.data?.financialImpact > this.config.confirmationThreshold) {
      return true;
    }

    // Check business rules
    const confirmationRules = this.config.confirmationRules || [];
    for (const rule of confirmationRules) {
      if (this.matchesRule(action, rule)) {
        return true;
      }
    }

    return false;
  }

  private async getAIInsight(request: AutomationRequest): Promise<AIInsight> {
    // Get AI insight for the action
    return {
      confidence: 0.85,
      riskLevel: 'medium',
      reasoning: ['AI analysis indicates favorable outcome']
    };
  }

  private matchesRule(action: AutomationAction, rule: any): boolean {
    // Check if action matches confirmation rule
    return false;
  }

  private async executePriceChange(action: AutomationAction): Promise<any> {
    // Delegate to pricing automation service
    return pricingAutomationService.updatePrice(action.productId, action.data.newPrice);
  }

  private async executePromotion(action: AutomationAction): Promise<any> {
    // Execute promotion
    return { success: true, promotionId: `PROM-${Date.now()}` };
  }

  private async executeRestock(action: AutomationAction): Promise<any> {
    // Delegate to inventory automation service
    return inventoryAutomationService.reorderProduct(action.productId, action.data.quantity);
  }

  private async executeSupplierChange(action: AutomationAction): Promise<any> {
    // Execute supplier change
    return { success: true, newSupplier: action.data.newSupplier };
  }

  private async recordAutomationOutcome(outcome: AutomationOutcome): Promise<void> {
    if (!this.automationHistory.has(outcome.actionType)) {
      this.automationHistory.set(outcome.actionType, []);
    }
    this.automationHistory.get(outcome.actionType)!.push(outcome);

    // Send feedback to AI learning system
    if (this.config.enableAI && aiLearningSystem) {
      try {
        await aiLearningSystem.processFeedback({
          modelId: outcome.actionType,
          predictionId: outcome.id,
          actualOutcome: outcome.success ? 'positive' : 'negative',
          feedbackType: 'automation_outcome',
          accuracy: outcome.confidence,
          timestamp: new Date(),
          context: outcome
        });
      } catch (error) {
        console.error('Failed to send feedback to AI system:', error);
      }
    }
  }

  private getRecentOutcomes(): AutomationOutcome[] {
    const allOutcomes: AutomationOutcome[] = [];
    for (const outcomes of this.automationHistory.values()) {
      allOutcomes.push(...outcomes);
    }
    return allOutcomes.filter(o => Date.now() - o.executedAt.getTime() < 24 * 60 * 60 * 1000);
  }

  private calculatePerformanceMetrics(outcomes: AutomationOutcome[]): PerformanceMetrics {
    const successful = outcomes.filter(o => o.success);
    const failed = outcomes.filter(o => !o.success);

    return {
      successRate: outcomes.length > 0 ? successful.length / outcomes.length : 0,
      averageExecutionTime: this.calculateAverageExecutionTime(outcomes),
      errorRate: outcomes.length > 0 ? failed.length / outcomes.length : 0,
      userInterventionRate: this.calculateUserInterventionRate(outcomes),
      confidenceAccuracy: this.calculateConfidenceAccuracy(outcomes),
      lastUpdated: new Date()
    };
  }

  private calculateAverageExecutionTime(outcomes: AutomationOutcome[]): number {
    if (outcomes.length === 0) return 0;
    const totalTime = outcomes.reduce((sum, o) => sum + (o.executionTime || 0), 0);
    return totalTime / outcomes.length;
  }

  private calculateUserInterventionRate(outcomes: AutomationOutcome[]): number {
    if (outcomes.length === 0) return 0;
    const interventionCount = outcomes.filter(o => o.requiresConfirmation).length;
    return interventionCount / outcomes.length;
  }

  private calculateConfidenceAccuracy(outcomes: AutomationOutcome[]): number {
    const confidentOutcomes = outcomes.filter(o => o.confidence > 0.7);
    if (confidentOutcomes.length === 0) return 0;
    const correctConfident = confidentOutcomes.filter(o => o.success).length;
    return correctConfident / confidentOutcomes.length;
  }

  private getLastActivityTime(): Date {
    const recentOutcomes = this.getRecentOutcomes();
    if (recentOutcomes.length === 0) return new Date(0);
    return new Date(Math.max(...recentOutcomes.map(o => o.executedAt.getTime())));
  }

  private getOutcomesByTimeframe(timeframe: 'hour' | 'day' | 'week'): AutomationOutcome[] {
    const now = Date.now();
    const timeframes = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    };

    const cutoff = now - timeframes[timeframe];
    const allOutcomes: AutomationOutcome[] = [];
    for (const outcomes of this.automationHistory.values()) {
      allOutcomes.push(...outcomes);
    }
    return allOutcomes.filter(o => o.executedAt.getTime() > cutoff);
  }

  private calculateModeDistribution(outcomes: AutomationOutcome[]): Record<string, number> {
    return outcomes.reduce((acc, outcome) => {
      acc[outcome.mode] = (acc[outcome.mode] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateActionTypeDistribution(outcomes: AutomationOutcome[]): Record<string, number> {
    return outcomes.reduce((acc, outcome) => {
      acc[outcome.actionType] = (acc[outcome.actionType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculateLearningProgress(outcomes: AutomationOutcome[]): number {
    // Calculate learning progress based on improvement over time
    const recentOutcomes = outcomes.slice(-50);
    const olderOutcomes = outcomes.slice(-100, -50);

    if (recentOutcomes.length === 0 || olderOutcomes.length === 0) return 0;

    const recentSuccessRate = recentOutcomes.filter(o => o.success).length / recentOutcomes.length;
    const olderSuccessRate = olderOutcomes.filter(o => o.success).length / olderOutcomes.length;

    return Math.max(0, (recentSuccessRate - olderSuccessRate) * 100);
  }

  private identifyTopPerformingActions(outcomes: AutomationOutcome[]): string[] {
    const actionPerformance = new Map<string, number>();

    for (const outcome of outcomes) {
      const current = actionPerformance.get(outcome.actionType) || 0;
      const success = outcome.success ? 1 : 0;
      actionPerformance.set(outcome.actionType, current + success);
    }

    return Array.from(actionPerformance.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([actionType]) => actionType);
  }

  private identifyAreasForImprovement(outcomes: AutomationOutcome[]): string[] {
    const failedActions = outcomes.filter(o => !o.success);
    const actionFailureRates = new Map<string, number>();

    for (const outcome of failedActions) {
      const current = actionFailureRates.get(outcome.actionType) || 0;
      actionFailureRates.set(outcome.actionType, current + 1);
    }

    return Array.from(actionFailureRates.entries())
      .filter(([, count]) => count > 2) // More than 2 failures
      .sort(([,a], [,b]) => b - a)
      .map(([actionType]) => actionType);
  }

  private async generateRecommendations(metrics: PerformanceMetrics): Promise<string[]> {
    const recommendations: string[] = [];

    if (metrics.successRate < 0.8) {
      recommendations.push('Consider reviewing automation rules - success rate below 80%');
    }

    if (metrics.errorRate > 0.2) {
      recommendations.push('High error rate detected - review error handling and validation');
    }

    if (metrics.userInterventionRate > 0.5) {
      recommendations.push('Consider adjusting confirmation thresholds to reduce manual intervention');
    }

    if (metrics.averageExecutionTime > 5000) {
      recommendations.push('Optimize action execution - average time above 5 seconds');
    }

    return recommendations;
  }

  private analyzeTrends(outcomes: AutomationOutcome[]): any {
    // Analyze trends in automation performance
    return {
      improvingAccuracy: true,
      increasingEfficiency: false,
      userAdoption: 'steady'
    };
  }

  private async updatePerformanceMetrics(): Promise<void> {
    const outcomes = this.getRecentOutcomes();
    const metrics = this.calculatePerformanceMetrics(outcomes);

    if (!this.performanceMetrics.has('overall')) {
      this.performanceMetrics.set('overall', []);
    }
    this.performanceMetrics.get('overall')!.push(metrics);
  }

  private async processAlerts(): Promise<void> {
    // Process queued alerts
    while (this.alertQueue.length > 0) {
      const alert = this.alertQueue.shift()!;
      await this.handleAlert(alert);
    }
  }

  private async handleAlert(alert: AutomationAlert): Promise<void> {
    // Handle automation alerts
    console.log(`Automation alert: ${alert.message}`);
  }
}

// Type definitions
interface AutomationRequest {
  id: string;
  type: 'PRICE_CHANGE' | 'PROMOTION' | 'RESTOCK' | 'SUPPLIER_CHANGE';
  productId: string;
  data: any;
  priority?: 'low' | 'medium' | 'critical';
  requester?: 'ai' | 'user' | 'system';
}

interface AutomationResponse {
  success: boolean;
  actionId: string;
  status: 'executed' | 'pending_confirmation' | 'rejected' | 'blocked';
  result?: any;
  reason?: string;
  requiresConfirmation?: boolean;
  executedAt?: Date;
}

interface ConfirmationResult {
  success: boolean;
  outcome?: AutomationOutcome;
  message?: string;
  reason?: string;
}

interface AutomationStatus {
  isActive: boolean;
  currentMode: AutomationMode;
  emergencyStop: boolean;
  pendingActions: AutomationAction[];
  recentOutcomes: AutomationOutcome[];
  performanceMetrics: PerformanceMetrics;
  alerts: AutomationAlert[];
  uptime: number;
  lastActivity: Date;
  learningEnabled: boolean;
  autoThrottlingEnabled: boolean;
}

interface AutomationInsights {
  timeframe: 'hour' | 'day' | 'week';
  totalActions: number;
  successfulActions: number;
  failedActions: number;
  averageExecutionTime: number;
  modeDistribution: Record<string, number>;
  actionTypeDistribution: Record<string, number>;
  userInterventionRate: number;
  learningProgress: number;
  topPerformingActions: string[];
  areasForImprovement: string[];
  recommendations: string[];
  trends: any;
}

interface ExecutionResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime: number;
}

interface AIInsight {
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  reasoning: string[];
}

export { HandsOffAutomation };