import { auditLogger } from './audit-logger';
import { decisionEngine } from './decision-engine';
import { aiLearningSystem } from './ai-learning-system';
import { marketAnalysisService } from './market-analysis-service';
import type {
  CompetitorMonitor,
  CompetitorActivity,
  PriceThrottlingRule,
  ThrottlingAction,
  CompetitorResponse,
  MarketSignal
} from '@/types';

export class AutoThrottlingService {
  private monitors = new Map<string, CompetitorMonitor>();
  private throttlingRules = new Map<string, PriceThrottlingRule[]>();
  private recentActivities = new Map<string, CompetitorActivity[]>();
  private responseHistory = new Map<string, CompetitorResponse[]>();
  private marketSignals = new Map<string, MarketSignal[]>();
  private isActive: boolean = true;
  private monitoringInterval: number = 5 * 60 * 1000; // 5 minutes
  private responseDelay: number = 10 * 60 * 1000; // 10 minutes delay

  constructor(config: AutoThrottlingConfig) {
    this.isActive = config.enabled !== false;
    this.monitoringInterval = config.monitoringInterval || 5 * 60 * 1000;
    this.responseDelay = config.responseDelay || 10 * 60 * 1000;
    this.initializeAutoThrottling();
  }

  /**
   * Initialize auto-throttling system
   */
  async initialize(): Promise<void> {
    await this.loadCompetitorMonitors();
    await this.loadThrottlingRules();
    await this.startCompetitorMonitoring();
    this.startMarketSignalProcessing();

    console.log('Auto-throttling system initialized');
  }

  /**
   * Add competitor monitor
   */
  async addCompetitorMonitor(monitor: CompetitorMonitor): Promise<void> {
    try {
      this.monitors.set(monitor.id, monitor);
      this.recentActivities.set(monitor.id, []);

      await auditLogger.logAutomationEvent('competitor_monitor_added', {
        monitorId: monitor.id,
        competitorName: monitor.competitorName,
        competitorDomain: monitor.competitorDomain,
        monitoringType: monitor.monitoringType
      });

      console.log(`Added competitor monitor for: ${monitor.competitorName}`);

    } catch (error) {
      console.error('Failed to add competitor monitor:', error);
      throw new Error(`Failed to add competitor monitor: ${error.message}`);
    }
  }

  /**
   * Add price throttling rule
   */
  async addThrottlingRule(rule: PriceThrottlingRule): Promise<void> {
    try {
      if (!this.throttlingRules.has(rule.productId)) {
        this.throttlingRules.set(rule.productId, []);
      }
      this.throttlingRules.get(rule.productId)!.push(rule);

      await auditLogger.logAutomationEvent('throttling_rule_added', {
        ruleId: rule.id,
        productId: rule.productId,
        ruleType: rule.type,
        threshold: rule.threshold,
        action: rule.action
      });

      console.log(`Added throttling rule for product: ${rule.productId}`);

    } catch (error) {
      console.error('Failed to add throttling rule:', error);
      throw new Error(`Failed to add throttling rule: ${error.message}`);
    }
  }

  /**
   * Process competitor activity
   */
  async processCompetitorActivity(activity: CompetitorActivity): Promise<void> {
    try {
      if (!this.isActive) return;

      // Store activity
      const activities = this.recentActivities.get(activity.competitorId) || [];
      activities.push(activity);
      this.recentActivities.set(activity.competitorId, activities.slice(-100)); // Keep last 100

      // Analyze activity impact
      const impact = await this.analyzeActivityImpact(activity);

      // Check if response is needed
      if (impact.requiresResponse) {
        await this.scheduleResponse(activity, impact);
      }

      // Update market signals
      await this.updateMarketSignals(activity, impact);

      // Log activity processing
      await auditLogger.logAutomationEvent('competitor_activity_processed', {
        competitorId: activity.competitorId,
        activityType: activity.type,
        impact: impact.impactScore,
        requiresResponse: impact.requiresResponse
      });

    } catch (error) {
      console.error('Failed to process competitor activity:', error);
    }
  }

  /**
   * Get throttling recommendation
   */
  async getThrottlingRecommendation(productId: string, context: any): Promise<ThrottlingRecommendation> {
    try {
      const rules = this.throttlingRules.get(productId) || [];
      const recentResponses = this.responseHistory.get(productId) || [];
      const marketSignals = this.marketSignals.get(productId) || [];

      // Analyze current market conditions
      const marketAnalysis = await this.analyzeMarketConditions(productId, context);

      // Check throttling rules
      const applicableRules = rules.filter(rule => this.evaluateRule(rule, context, marketAnalysis));

      // Calculate recommended action
      const recommendation: ThrottlingRecommendation = {
        productId,
        currentPrice: context.currentPrice,
        recommendedPrice: context.currentPrice,
        action: 'HOLD',
        confidence: 0,
        reasoning: [],
        marketVolatility: marketAnalysis.volatility,
        competitorActivity: marketAnalysis.competitorActivity,
        recentResponses: recentResponses.slice(-5),
        marketSignals: marketSignals.slice(-10),
        suggestedDelay: this.calculateOptimalDelay(productId, marketAnalysis),
        risks: [],
        opportunities: []
      };

      // Process applicable rules
      for (const rule of applicableRules) {
        const ruleResult = await this.applyRule(rule, context, marketAnalysis);
        if (ruleResult.confidence > recommendation.confidence) {
          recommendation.recommendedPrice = ruleResult.recommendedPrice;
          recommendation.action = ruleResult.action;
          recommendation.confidence = ruleResult.confidence;
          recommendation.reasoning = ruleResult.reasoning;
        }
      }

      // Add AI insights
      const aiInsights = await this.getAIThrottlingInsights(productId, context, marketAnalysis);
      if (aiInsights.confidence > recommendation.confidence * 1.2) { // AI needs higher confidence to override
        recommendation.recommendedPrice = aiInsights.recommendedPrice;
        recommendation.action = aiInsights.action;
        recommendation.confidence = aiInsights.confidence;
        recommendation.reasoning = [...recommendation.reasoning, ...aiInsights.reasoning];
      }

      return recommendation;

    } catch (error) {
      console.error('Failed to get throttling recommendation:', error);
      throw new Error(`Failed to get throttling recommendation: ${error.message}`);
    }
  }

  /**
   * Execute throttling action
   */
  async executeThrottlingAction(action: ThrottlingAction): Promise<ThrottlingActionResult> {
    try {
      // Validate action against recent responses
      const canExecute = await this.validateThrottlingAction(action);
      if (!canExecute.allowed) {
        return {
          success: false,
          actionId: action.id,
          reason: canExecute.reason,
          executedAt: new Date()
        };
      }

      // Execute the action
      let result: any;
      switch (action.type) {
        case 'PRICE_CHANGE':
          result = await this.executePriceChange(action);
          break;
        case 'PROMOTION':
          result = await this.executePromotion(action);
          break;
        case 'PAUSE_AUTOMATION':
          result = await this.pauseAutomation(action);
          break;
        default:
          throw new Error(`Unknown action type: ${action.type}`);
      }

      // Record response
      const response: CompetitorResponse = {
        id: `RESP-${Date.now()}`,
        competitorId: action.competitorId || 'MARKET',
        productId: action.productId,
        action: action.type,
        triggerActivity: action.triggerActivity,
        responseTime: Date.now(),
        effectiveness: 0,
        marketImpact: 0,
        createdAt: new Date()
      };

      if (!this.responseHistory.has(action.productId)) {
        this.responseHistory.set(action.productId, []);
      }
      this.responseHistory.get(action.productId)!.push(response);

      // Log action execution
      await auditLogger.logAutomationEvent('throttling_action_executed', {
        actionId: action.id,
        actionType: action.type,
        productId: action.productId,
        success: result.success,
        executionTime: result.executionTime
      });

      return {
        success: result.success,
        actionId: action.id,
        result: result.data,
        executedAt: new Date()
      };

    } catch (error) {
      console.error('Failed to execute throttling action:', error);
      throw new Error(`Failed to execute throttling action: ${error.message}`);
    }
  }

  /**
   * Get competitor analysis
   */
  async getCompetitorAnalysis(productId?: string): Promise<CompetitorAnalysis> {
    try {
      const monitors = Array.from(this.monitors.values());
      const analysis: CompetitorAnalysis = {
        totalCompetitors: monitors.length,
        activeCompetitors: 0,
        recentActivities: [],
        priceChanges: 0,
        promotions: 0,
        outOfStock: 0,
        newEntries: 0,
        averageResponseTime: 0,
        marketVolatility: 0,
        topCompetitors: [],
        threats: [],
        opportunities: []
      };

      // Analyze each competitor
      for (const monitor of monitors) {
        const activities = this.recentActivities.get(monitor.id) || [];
        const recentActivities = activities.filter(a =>
          Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000
        );

        if (recentActivities.length > 0) {
          analysis.activeCompetitors++;
        }

        // Categorize activities
        for (const activity of recentActivities) {
          if (!productId || activity.productId === productId) {
            analysis.recentActivities.push({
              competitorName: monitor.competitorName,
              activityType: activity.type,
              timestamp: activity.timestamp,
              impact: activity.impact || 0
            });

            switch (activity.type) {
              case 'PRICE_CHANGE':
                analysis.priceChanges++;
                break;
              case 'PROMOTION':
                analysis.promotions++;
                break;
              case 'OUT_OF_STOCK':
                analysis.outOfStock++;
                break;
              case 'NEW_PRODUCT':
                analysis.newEntries++;
                break;
            }
          }
        }
      }

      // Calculate market volatility
      analysis.marketVolatility = this.calculateMarketVolatility(analysis.recentActivities);

      // Identify top competitors
      analysis.topCompetitors = this.identifyTopCompetitors(analysis.recentActivities);

      // Identify threats and opportunities
      const insights = await this.analyzeMarketIntelligence(analysis);
      analysis.threats = insights.threats;
      analysis.opportunities = insights.opportunities;

      return analysis;

    } catch (error) {
      console.error('Failed to get competitor analysis:', error);
      throw new Error(`Failed to get competitor analysis: ${error.message}`);
    }
  }

  // Private methods

  private async initializeAutoThrottling(): Promise<void> {
    await this.loadCompetitorMonitors();
    await this.loadThrottlingRules();
  }

  private async loadCompetitorMonitors(): Promise<void> {
    // Load competitor monitors from database
  }

  private async loadThrottlingRules(): Promise<void> {
    // Load throttling rules from database
  }

  private async startCompetitorMonitoring(): Promise<void> {
    setInterval(async () => {
      if (this.isActive) {
        await this.scanForCompetitorActivity().catch(console.error);
      }
    }, this.monitoringInterval);
  }

  private startMarketSignalProcessing(): void {
    setInterval(async () => {
      if (this.isActive) {
        await this.processMarketSignals().catch(console.error);
      }
    }, 60 * 60 * 1000); // Every hour
  }

  private async scanForCompetitorActivity(): Promise<void> {
    // Implementation would scan websites, APIs, or other sources
  }

  private async analyzeActivityImpact(activity: CompetitorActivity): Promise<ActivityImpact> {
    const impact: ActivityImpact = {
      impactScore: 0,
      requiresResponse: false,
      urgency: 'low',
      affectedProducts: [activity.productId],
      marketEffect: 'none'
    };

    // Calculate impact based on activity type and magnitude
    switch (activity.type) {
      case 'PRICE_CHANGE':
        impact.impactScore = Math.abs(activity.newPrice - activity.oldPrice) / activity.oldPrice;
        impact.requiresResponse = impact.impactScore > 0.05; // 5% change threshold
        impact.urgency = impact.impactScore > 0.1 ? 'high' : 'medium';
        impact.marketEffect = 'price_pressure';
        break;
      case 'PROMOTION':
        impact.impactScore = activity.discount / 100;
        impact.requiresResponse = impact.impactScore > 0.15; // 15% discount threshold
        impact.urgency = impact.impactScore > 0.25 ? 'high' : 'medium';
        impact.marketEffect = 'promotional_pressure';
        break;
      case 'OUT_OF_STOCK':
        impact.impactScore = 0.3;
        impact.requiresResponse = true;
        impact.urgency = 'medium';
        impact.marketEffect = 'supply_opportunity';
        break;
    }

    return impact;
  }

  private async scheduleResponse(activity: CompetitorActivity, impact: ActivityImpact): Promise<void> {
    // Schedule response with appropriate delay
    setTimeout(async () => {
      try {
        const recommendation = await this.generateResponse(activity, impact);
        if (recommendation.action !== 'HOLD') {
          await this.executeThrottlingAction({
            id: `AUTO-${Date.now()}`,
            type: recommendation.action,
            productId: activity.productId,
            competitorId: activity.competitorId,
            triggerActivity: activity,
            newPrice: recommendation.newPrice,
            discount: recommendation.discount,
            reason: recommendation.reasoning.join(', ')
          });
        }
      } catch (error) {
        console.error('Failed to execute scheduled response:', error);
      }
    }, this.responseDelay);
  }

  private async updateMarketSignals(activity: CompetitorActivity, impact: ActivityImpact): Promise<void> {
    const signal: MarketSignal = {
      id: `SIGNAL-${Date.now()}`,
      type: activity.type,
      productId: activity.productId,
      competitorId: activity.competitorId,
      strength: impact.impactScore,
      timestamp: new Date(),
      decayRate: 0.1,
      persistence: 24 * 60 * 60 * 1000 // 24 hours
    };

    if (!this.marketSignals.has(activity.productId)) {
      this.marketSignals.set(activity.productId, []);
    }
    this.marketSignals.get(activity.productId)!.push(signal);
  }

  private evaluateRule(rule: PriceThrottlingRule, context: any, marketAnalysis: any): boolean {
    switch (rule.type) {
      case 'COMPETITOR_PRICE_CHANGE':
        return marketAnalysis.competitorPriceChange >= rule.threshold;
      case 'MARKET_VOLATILITY':
        return marketAnalysis.volatility >= rule.threshold;
      case 'RESPONSE_FREQUENCY':
        return this.getResponseFrequency(context.productId) <= rule.threshold;
      default:
        return false;
    }
  }

  private getResponseFrequency(productId: string): number {
    const responses = this.responseHistory.get(productId) || [];
    const recentResponses = responses.filter(r =>
      Date.now() - r.responseTime < 24 * 60 * 60 * 1000
    );
    return recentResponses.length;
  }

  private async applyRule(rule: PriceThrottlingRule, context: any, marketAnalysis: any): Promise<RuleResult> {
    const result: RuleResult = {
      recommendedPrice: context.currentPrice,
      action: 'HOLD',
      confidence: 0.7,
      reasoning: [`Applied ${rule.type} rule`]
    };

    switch (rule.action) {
      case 'MATCH_PRICE':
        if (marketAnalysis.lowestCompetitorPrice) {
          result.recommendedPrice = marketAnalysis.lowestCompetitorPrice * (1 - rule.marginBuffer || 0.02);
          result.action = 'PRICE_CHANGE';
          result.reasoning.push('Matching competitor price with buffer');
        }
        break;
      case 'WAIT_AND_OBSERVE':
        result.action = 'HOLD';
        result.reasoning.push('Waiting to observe market reaction');
        break;
      case 'PROMOTIONAL_RESPONSE':
        result.action = 'PROMOTION';
        result.discount = rule.promotionalDiscount || 10;
        result.reasoning.push('Launching promotional response');
        break;
    }

    return result;
  }

  private async analyzeMarketConditions(productId: string, context: any): Promise<MarketAnalysis> {
    const signals = this.marketSignals.get(productId) || [];
    const recentSignals = signals.filter(s =>
      Date.now() - s.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    return {
      volatility: this.calculateMarketVolatility(recentSignals),
      competitorActivity: recentSignals.length,
      lowestCompetitorPrice: context.lowestCompetitorPrice,
      highestCompetitorPrice: context.highestCompetitorPrice,
      averageCompetitorPrice: context.averageCompetitorPrice,
      priceTrend: this.calculatePriceTrend(recentSignals),
      marketPressure: this.calculateMarketPressure(recentSignals)
    };
  }

  private calculateMarketVolatility(signals: MarketSignal[]): number {
    if (signals.length === 0) return 0;

    const totalStrength = signals.reduce((sum, signal) => sum + signal.strength, 0);
    return Math.min(totalStrength / signals.length, 1);
  }

  private calculatePriceTrend(signals: MarketSignal[]): 'up' | 'down' | 'stable' {
    const priceSignals = signals.filter(s => s.type === 'PRICE_CHANGE');
    if (priceSignals.length === 0) return 'stable';

    const upChanges = priceSignals.filter(s => s.strength > 0).length;
    const downChanges = priceSignals.filter(s => s.strength < 0).length;

    if (upChanges > downChanges * 1.5) return 'up';
    if (downChanges > upChanges * 1.5) return 'down';
    return 'stable';
  }

  private calculateMarketPressure(signals: MarketSignal[]): 'high' | 'medium' | 'low' {
    const totalStrength = signals.reduce((sum, signal) => sum + Math.abs(signal.strength), 0);
    if (totalStrength > 0.5) return 'high';
    if (totalStrength > 0.2) return 'medium';
    return 'low';
  }

  private async getAIThrottlingInsights(productId: string, context: any, marketAnalysis: any): Promise<AIInsightResult> {
    try {
      // Use AI learning system for insights
      const aiContext = {
        productId,
        currentPrice: context.currentPrice,
        marketConditions: marketAnalysis,
        recentPerformance: context.recentPerformance,
        competitorData: context.competitorData
      };

      // Get AI recommendation
      const prediction = await aiLearningSystem.predictOptimalPrice(productId, aiContext);

      return {
        recommendedPrice: prediction.recommendedPrice,
        action: prediction.recommendedPrice !== context.currentPrice ? 'PRICE_CHANGE' : 'HOLD',
        confidence: prediction.confidence,
        reasoning: prediction.reasoning.split(', ')
      };

    } catch (error) {
      console.error('Failed to get AI throttling insights:', error);
      return {
        recommendedPrice: context.currentPrice,
        action: 'HOLD',
        confidence: 0,
        reasoning: ['AI insights unavailable']
      };
    }
  }

  private calculateOptimalDelay(productId: string, marketAnalysis: any): number {
    const baseDelay = this.responseDelay;
    const volatilityMultiplier = 1 + marketAnalysis.volatility;
    const activityMultiplier = Math.min(1 + marketAnalysis.competitorActivity * 0.1, 2);

    return baseDelay * volatilityMultiplier * activityMultiplier;
  }

  private async validateThrottlingAction(action: ThrottlingAction): Promise<ValidationResult> {
    const recentResponses = this.responseHistory.get(action.productId) || [];
    const veryRecentResponses = recentResponses.filter(r =>
      Date.now() - r.responseTime < 60 * 60 * 1000 // Last hour
    );

    if (veryRecentResponses.length >= 3) {
      return {
        allowed: false,
        reason: 'Too many recent responses. Throttling to avoid overreaction.'
      };
    }

    return { allowed: true };
  }

  private async executePriceChange(action: ThrottlingAction): Promise<any> {
    // Implementation would execute price change
    return {
      success: true,
      executionTime: 1000,
      data: { newPrice: action.newPrice }
    };
  }

  private async executePromotion(action: ThrottlingAction): Promise<any> {
    // Implementation would execute promotion
    return {
      success: true,
      executionTime: 1500,
      data: { discount: action.discount }
    };
  }

  private async pauseAutomation(action: ThrottlingAction): Promise<any> {
    // Implementation would pause automation
    return {
      success: true,
      executionTime: 500,
      data: { paused: true }
    };
  }

  private identifyTopCompetitors(activities: any[]): any[] {
    const competitorScores = new Map<string, number>();

    activities.forEach(activity => {
      const current = competitorScores.get(activity.competitorName) || 0;
      competitorScores.set(activity.competitorName, current + Math.abs(activity.impact));
    });

    return Array.from(competitorScores.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([name, score]) => ({ name, activityScore: score }));
  }

  private async analyzeMarketIntelligence(analysis: CompetitorAnalysis): Promise<MarketIntelligence> {
    const threats: string[] = [];
    const opportunities: string[] = [];

    if (analysis.priceChanges > analysis.totalCompetitors * 0.5) {
      threats.push('High price volatility detected - market instability');
    }

    if (analysis.promotions > analysis.totalCompetitors * 0.3) {
      threats.push('Increased promotional activity - margin pressure');
      opportunities.push('Opportunity to capture customers from over-promoting competitors');
    }

    if (analysis.outOfStock > 0) {
      opportunities.push('Competitors out of stock - capture market share');
    }

    return { threats, opportunities };
  }

  private async processMarketSignals(): Promise<void> {
    // Implementation would process and decay market signals
  }

  private async generateResponse(activity: CompetitorActivity, impact: ActivityImpact): Promise<any> {
    // Generate appropriate response based on activity and impact
    return {
      action: 'HOLD',
      newPrice: activity.newPrice,
      discount: 0,
      reasoning: ['Auto-generated response based on competitor activity']
    };
  }
}

// Type definitions
interface AutoThrottlingConfig {
  enabled?: boolean;
  monitoringInterval?: number;
  responseDelay?: number;
  maxResponsesPerHour?: number;
  volatilityThreshold?: number;
}

interface ActivityImpact {
  impactScore: number;
  requiresResponse: boolean;
  urgency: 'low' | 'medium' | 'high';
  affectedProducts: string[];
  marketEffect: 'none' | 'price_pressure' | 'promotional_pressure' | 'supply_opportunity';
}

interface ThrottlingRecommendation {
  productId: string;
  currentPrice: number;
  recommendedPrice: number;
  action: 'HOLD' | 'PRICE_CHANGE' | 'PROMOTION' | 'PAUSE_AUTOMATION';
  confidence: number;
  reasoning: string[];
  marketVolatility: number;
  competitorActivity: number;
  recentResponses: CompetitorResponse[];
  marketSignals: MarketSignal[];
  suggestedDelay: number;
  risks: string[];
  opportunities: string[];
}

interface ThrottlingAction {
  id: string;
  type: 'PRICE_CHANGE' | 'PROMOTION' | 'PAUSE_AUTOMATION';
  productId: string;
  competitorId?: string;
  triggerActivity?: CompetitorActivity;
  newPrice?: number;
  discount?: number;
  reason?: string;
}

interface ThrottlingActionResult {
  success: boolean;
  actionId: string;
  result?: any;
  reason?: string;
  executedAt: Date;
}

interface CompetitorAnalysis {
  totalCompetitors: number;
  activeCompetitors: number;
  recentActivities: any[];
  priceChanges: number;
  promotions: number;
  outOfStock: number;
  newEntries: number;
  averageResponseTime: number;
  marketVolatility: number;
  topCompetitors: any[];
  threats: string[];
  opportunities: string[];
}

interface RuleResult {
  recommendedPrice: number;
  action: string;
  confidence: number;
  reasoning: string[];
}

interface MarketAnalysis {
  volatility: number;
  competitorActivity: number;
  lowestCompetitorPrice?: number;
  highestCompetitorPrice?: number;
  averageCompetitorPrice?: number;
  priceTrend: 'up' | 'down' | 'stable';
  marketPressure: 'high' | 'medium' | 'low';
}

interface AIInsightResult {
  recommendedPrice: number;
  action: string;
  confidence: number;
  reasoning: string[];
}

interface ValidationResult {
  allowed: boolean;
  reason?: string;
}

interface MarketIntelligence {
  threats: string[];
  opportunities: string[];
}

export { AutoThrottlingService };