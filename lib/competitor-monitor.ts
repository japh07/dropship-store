import { auditLogger } from './audit-logger';
import { autoThrottlingService } from './auto-throttling-service';
import type {
  CompetitorMonitor,
  CompetitorActivity,
  CompetitorData,
  MonitoringSource,
  PriceComparison,
  CompetitorAlert
} from '@/types';

export class CompetitorMonitor {
  private monitors = new Map<string, CompetitorMonitor>();
  private monitoringSources = new Map<string, MonitoringSource>();
  private activityHistory = new Map<string, CompetitorActivity[]>();
  private priceHistory = new Map<string, PriceComparison[]>();
  private alerts = new Map<string, CompetitorAlert[]>();
  private isActive: boolean = true;
  private monitoringInterval: number = 30 * 60 * 1000; // 30 minutes
  private alertThresholds = {
    priceChangePercent: 5,
    outOfStockDuration: 2 * 60 * 60 * 1000, // 2 hours
    promotionDiscount: 15,
    newProductGracePeriod: 24 * 60 * 60 * 1000 // 24 hours
  };

  constructor(config: CompetitorMonitorConfig) {
    this.isActive = config.enabled !== false;
    this.monitoringInterval = config.monitoringInterval || 30 * 60 * 1000;
    this.alertThresholds = { ...this.alertThresholds, ...config.alertThresholds };
    this.initializeMonitoring();
  }

  /**
   * Initialize competitor monitoring
   */
  async initialize(): Promise<void> {
    await this.loadCompetitorMonitors();
    await this.loadMonitoringSources();
    await this.startMonitoringProcess();
    this.startAlertProcessing();

    console.log('Competitor monitoring system initialized');
  }

  /**
   * Add competitor monitor
   */
  async addCompetitorMonitor(monitor: CompetitorMonitor): Promise<void> {
    try {
      // Validate monitor configuration
      await this.validateMonitorConfiguration(monitor);

      this.monitors.set(monitor.id, monitor);
      this.activityHistory.set(monitor.id, []);
      this.priceHistory.set(monitor.id, []);

      await auditLogger.logMonitoringEvent('competitor_monitor_added', {
        monitorId: monitor.id,
        competitorName: monitor.competitorName,
        competitorDomain: monitor.competitorDomain,
        monitoringType: monitor.monitoringType,
        productsToMonitor: monitor.productsToMonitor?.length || 0
      });

      console.log(`Added competitor monitor for: ${monitor.competitorName}`);

    } catch (error) {
      console.error('Failed to add competitor monitor:', error);
      throw new Error(`Failed to add competitor monitor: ${error.message}`);
    }
  }

  /**
   * Remove competitor monitor
   */
  async removeCompetitorMonitor(monitorId: string): Promise<void> {
    try {
      const monitor = this.monitors.get(monitorId);
      if (!monitor) {
        throw new Error(`Monitor not found: ${monitorId}`);
      }

      this.monitors.delete(monitorId);
      this.activityHistory.delete(monitorId);
      this.priceHistory.delete(monitorId);
      this.alerts.delete(monitorId);

      await auditLogger.logMonitoringEvent('competitor_monitor_removed', {
        monitorId,
        competitorName: monitor.competitorName
      });

      console.log(`Removed competitor monitor: ${monitor.competitorName}`);

    } catch (error) {
      console.error('Failed to remove competitor monitor:', error);
      throw new Error(`Failed to remove competitor monitor: ${error.message}`);
    }
  }

  /**
   * Get competitor data
   */
  async getCompetitorData(monitorId: string): Promise<CompetitorData | null> {
    try {
      const monitor = this.monitors.get(monitorId);
      if (!monitor) {
        return null;
      }

      const activities = this.activityHistory.get(monitorId) || [];
      const prices = this.priceHistory.get(monitorId) || [];
      const competitorAlerts = this.alerts.get(monitorId) || [];

      // Get current data
      const currentData = await this.scrapeCompetitorData(monitor);

      const competitorData: CompetitorData = {
        monitorId,
        competitorName: monitor.competitorName,
        competitorDomain: monitor.competitorDomain,
        lastScraped: new Date(),
        currentProducts: currentData.products,
        recentActivities: activities.slice(-20),
        priceHistory: prices.slice(-50),
        alerts: competitorAlerts.slice(-10),
        metrics: this.calculateCompetitorMetrics(activities, prices),
        status: this.getCompetitorStatus(activities, currentData),
        monitoringType: monitor.monitoringType
      };

      return competitorData;

    } catch (error) {
      console.error('Failed to get competitor data:', error);
      throw new Error(`Failed to get competitor data: ${error.message}`);
    }
  }

  /**
   * Get all competitor data
   */
  async getAllCompetitorData(): Promise<CompetitorData[]> {
    try {
      const competitorData: CompetitorData[] = [];

      for (const [monitorId] of this.monitors) {
        try {
          const data = await this.getCompetitorData(monitorId);
          if (data) {
            competitorData.push(data);
          }
        } catch (error) {
          console.error(`Failed to get data for monitor ${monitorId}:`, error);
        }
      }

      return competitorData.sort((a, b) => a.competitorName.localeCompare(b.competitorName));

    } catch (error) {
      console.error('Failed to get all competitor data:', error);
      throw new Error(`Failed to get all competitor data: ${error.message}`);
    }
  }

  /**
   * Perform competitor analysis
   */
  async performCompetitorAnalysis(productId?: string): Promise<CompetitorAnalysisResult> {
    try {
      const allCompetitorData = await this.getAllCompetitorData();

      // Filter by product if specified
      const relevantData = productId
        ? allCompetitorData.filter(data =>
            data.currentProducts.some(product => product.productId === productId)
          )
        : allCompetitorData;

      const analysis: CompetitorAnalysisResult = {
        timestamp: new Date(),
        productId,
        totalCompetitors: relevantData.length,
        activeCompetitors: relevantData.filter(data => data.status === 'active').length,
        averagePrice: this.calculateAveragePrice(relevantData, productId),
        priceRange: this.calculatePriceRange(relevantData, productId),
        marketShare: this.estimateMarketShare(relevantData),
        competitorTrends: this.analyzeCompetitorTrends(relevantData),
        opportunities: this.identifyOpportunities(relevantData, productId),
        threats: this.identifyThreats(relevantData, productId),
        recommendations: await this.generateCompetitorRecommendations(relevantData, productId),
        priceElasticity: this.calculatePriceElasticity(relevantData, productId),
        promotionalActivity: this.analyzePromotionalActivity(relevantData)
      };

      return analysis;

    } catch (error) {
      console.error('Failed to perform competitor analysis:', error);
      throw new Error(`Failed to perform competitor analysis: ${error.message}`);
    }
  }

  /**
   * Create monitoring alert
   */
  async createAlert(alert: CompetitorAlert): Promise<void> {
    try {
      if (!this.alerts.has(alert.competitorId)) {
        this.alerts.set(alert.competitorId, []);
      }

      this.alerts.get(alert.competitorId)!.push(alert);

      await auditLogger.logMonitoringEvent('competitor_alert_created', {
        alertId: alert.id,
        competitorId: alert.competitorId,
        alertType: alert.type,
        severity: alert.severity,
        message: alert.message
      });

      // Process alert immediately if high severity
      if (alert.severity === 'high') {
        await this.processHighPriorityAlert(alert);
      }

    } catch (error) {
      console.error('Failed to create competitor alert:', error);
    }
  }

  /**
   * Get monitoring insights
   */
  async getMonitoringInsights(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<MonitoringInsights> {
    try {
      const cutoffTime = this.getCutoffTime(timeframe);
      const allActivities = this.getAllRecentActivities(cutoffTime);
      const allPriceChanges = this.getAllRecentPriceChanges(cutoffTime);

      const insights: MonitoringInsights = {
        timeframe,
        totalActivities: allActivities.length,
        activityByType: this.groupActivitiesByType(allActivities),
        activityByCompetitor: this.groupActivitiesByCompetitor(allActivities),
        priceVolatility: this.calculatePriceVolatility(allPriceChanges),
        mostActiveCompetitors: this.identifyMostActiveCompetitors(allActivities),
        priceLeaders: this.identifyPriceLeaders(),
        marketMovements: this.analyzeMarketMovements(allPriceChanges),
        alertTrends: this.analyzeAlertTrends(cutoffTime),
        monitoringEfficiency: this.calculateMonitoringEfficiency(),
        dataQuality: this.assessDataQuality(),
        recommendations: await this.generateMonitoringRecommendations(allActivities, allPriceChanges)
      };

      return insights;

    } catch (error) {
      console.error('Failed to get monitoring insights:', error);
      throw new Error(`Failed to get monitoring insights: ${error.message}`);
    }
  }

  // Private methods

  private async initializeMonitoring(): Promise<void> {
    await this.loadCompetitorMonitors();
  }

  private async loadCompetitorMonitors(): Promise<void> {
    // Load competitor monitors from database
  }

  private async loadMonitoringSources(): Promise<void> {
    // Load monitoring sources (web scraping APIs, etc.)
  }

  private async startMonitoringProcess(): void {
    setInterval(async () => {
      if (this.isActive) {
        await this.performMonitoringCycle().catch(console.error);
      }
    }, this.monitoringInterval);
  }

  private startAlertProcessing(): void {
    setInterval(async () => {
      await this.processAlerts().catch(console.error);
    }, 60 * 1000); // Every minute
  }

  private async performMonitoringCycle(): Promise<void> {
    for (const [monitorId, monitor] of this.monitors) {
      try {
        await this.monitorCompetitor(monitorId, monitor);
      } catch (error) {
        console.error(`Failed to monitor competitor ${monitorId}:`, error);
      }
    }
  }

  private async monitorCompetitor(monitorId: string, monitor: CompetitorMonitor): Promise<void> {
    const previousData = await this.getPreviousCompetitorData(monitorId);
    const currentData = await this.scrapeCompetitorData(monitor);

    // Detect changes
    const changes = await this.detectChanges(previousData, currentData);

    // Process detected changes
    for (const change of changes) {
      await this.processCompetitorChange(monitorId, change);
    }
  }

  private async scrapeCompetitorData(monitor: CompetitorMonitor): Promise<any> {
    switch (monitor.monitoringType) {
      case 'web_scraping':
        return await this.scrapeWebsite(monitor);
      case 'api_integration':
        return await this.fetchFromAPI(monitor);
      case 'manual_input':
        return await this.getManualInput(monitor);
      default:
        throw new Error(`Unknown monitoring type: ${monitor.monitoringType}`);
    }
  }

  private async scrapeWebsite(monitor: CompetitorMonitor): Promise<any> {
    // Implementation would use web scraping libraries
    // This is a simplified mock implementation
    return {
      products: [
        {
          productId: 'prod-1',
          name: 'Sample Product',
          price: 99.99,
          inStock: true,
          category: 'electronics'
        }
      ],
      lastUpdated: new Date()
    };
  }

  private async fetchFromAPI(monitor: CompetitorMonitor): Promise<any> {
    // Implementation would fetch from competitor API if available
    return {
      products: [],
      lastUpdated: new Date()
    };
  }

  private async getManualInput(monitor: CompetitorMonitor): Promise<any> {
    // Implementation would get manually entered data
    return {
      products: [],
      lastUpdated: new Date()
    };
  }

  private async getPreviousCompetitorData(monitorId: string): Promise<any> {
    // Get previous competitor data for comparison
    return {
      products: [],
      lastUpdated: new Date(0)
    };
  }

  private async detectChanges(previousData: any, currentData: any): Promise<CompetitorActivity[]> {
    const changes: CompetitorActivity[] = [];

    const previousProducts = new Map(
      previousData.products?.map((p: any) => [p.productId, p]) || []
    );
    const currentProducts = new Map(
      currentData.products?.map((p: any) => [p.productId, p]) || []
    );

    // Detect price changes
    for (const [productId, currentProduct] of currentProducts) {
      const previousProduct = previousProducts.get(productId);

      if (previousProduct) {
        if (previousProduct.price !== currentProduct.price) {
          changes.push({
            id: `CHANGE-${Date.now()}-${Math.random()}`,
            competitorId: 'unknown', // Would be filled with actual competitor ID
            productId,
            type: 'PRICE_CHANGE',
            oldPrice: previousProduct.price,
            newPrice: currentProduct.price,
            timestamp: new Date(),
            impact: Math.abs(currentProduct.price - previousProduct.price) / previousProduct.price
          });
        }

        if (previousProduct.inStock !== currentProduct.inStock) {
          changes.push({
            id: `CHANGE-${Date.now()}-${Math.random()}`,
            competitorId: 'unknown',
            productId,
            type: currentProduct.inStock ? 'BACK_IN_STOCK' : 'OUT_OF_STOCK',
            timestamp: new Date(),
            impact: currentProduct.inStock ? 0.2 : 0.3
          });
        }
      } else {
        // New product
        changes.push({
          id: `CHANGE-${Date.now()}-${Math.random()}`,
          competitorId: 'unknown',
          productId,
          type: 'NEW_PRODUCT',
          newPrice: currentProduct.price,
          timestamp: new Date(),
          impact: 0.15
        });
      }
    }

    // Detect removed products
    for (const [productId, previousProduct] of previousProducts) {
      if (!currentProducts.has(productId)) {
        changes.push({
          id: `CHANGE-${Date.now()}-${Math.random()}`,
          competitorId: 'unknown',
          productId,
          type: 'PRODUCT_REMOVED',
          oldPrice: previousProduct.price,
          timestamp: new Date(),
          impact: 0.1
        });
      }
    }

    return changes;
  }

  private async processCompetitorChange(monitorId: string, change: CompetitorActivity): Promise<void> {
    // Store activity
    const activities = this.activityHistory.get(monitorId) || [];
    activities.push(change);
    this.activityHistory.set(monitorId, activities.slice(-100)); // Keep last 100

    // Check for alerts
    await this.checkForAlerts(monitorId, change);

    // Forward to auto-throttling service
    if (autoThrottlingService) {
      try {
        await autoThrottlingService.processCompetitorActivity(change);
      } catch (error) {
        console.error('Failed to forward activity to auto-throttling:', error);
      }
    }

    // Log activity
    await auditLogger.logMonitoringEvent('competitor_change_detected', {
      monitorId,
      activityId: change.id,
      activityType: change.type,
      productId: change.productId,
      impact: change.impact
    });
  }

  private async checkForAlerts(monitorId: string, change: CompetitorActivity): Promise<void> {
    let shouldAlert = false;
    let alertMessage = '';
    let severity: 'low' | 'medium' | 'high' = 'low';

    switch (change.type) {
      case 'PRICE_CHANGE':
        const priceChangePercent = Math.abs(
          ((change.newPrice! - change.oldPrice!) / change.oldPrice!) * 100
        );
        if (priceChangePercent > this.alertThresholds.priceChangePercent) {
          shouldAlert = true;
          alertMessage = `Significant price change detected: ${priceChangePercent.toFixed(1)}%`;
          severity = priceChangePercent > 15 ? 'high' : 'medium';
        }
        break;

      case 'OUT_OF_STOCK':
        shouldAlert = true;
        alertMessage = `Product out of stock: ${change.productId}`;
        severity = 'medium';
        break;

      case 'NEW_PRODUCT':
        shouldAlert = true;
        alertMessage = `New competitor product: ${change.productId}`;
        severity = 'low';
        break;
    }

    if (shouldAlert) {
      await this.createAlert({
        id: `ALERT-${Date.now()}`,
        competitorId: monitorId,
        type: change.type,
        severity,
        message: alertMessage,
        timestamp: new Date(),
        acknowledged: false
      });
    }
  }

  private async processHighPriorityAlert(alert: CompetitorAlert): Promise<void> {
    // Immediate processing for high-priority alerts
    console.log(`HIGH PRIORITY ALERT: ${alert.message}`);

    // Could send notifications, trigger automation, etc.
  }

  private async processAlerts(): Promise<void> {
    // Process queued alerts
    for (const [competitorId, alerts] of this.alerts) {
      const unprocessedAlerts = alerts.filter(alert => !alert.acknowledged);

      for (const alert of unprocessedAlerts) {
        await this.processAlert(alert);
      }
    }
  }

  private async processAlert(alert: CompetitorAlert): Promise<void> {
    // Mark as processed
    alert.acknowledged = true;
    alert.processedAt = new Date();
  }

  private async validateMonitorConfiguration(monitor: CompetitorMonitor): Promise<void> {
    if (!monitor.competitorDomain) {
      throw new Error('Competitor domain is required');
    }

    if (!monitor.monitoringType) {
      throw new Error('Monitoring type is required');
    }
  }

  private calculateCompetitorMetrics(activities: CompetitorActivity[], prices: PriceComparison[]): any {
    return {
      totalActivities: activities.length,
      averagePriceImpact: activities.reduce((sum, a) => sum + (a.impact || 0), 0) / Math.max(activities.length, 1),
      priceChanges: activities.filter(a => a.type === 'PRICE_CHANGE').length,
      stockChanges: activities.filter(a => ['OUT_OF_STOCK', 'BACK_IN_STOCK'].includes(a.type)).length,
      lastActivity: activities.length > 0 ? activities[activities.length - 1].timestamp : null
    };
  }

  private getCompetitorStatus(activities: CompetitorActivity[], currentData: any): 'active' | 'inactive' | 'error' {
    const lastActivity = activities.length > 0 ? activities[activities.length - 1].timestamp : null;
    const hoursSinceLastActivity = lastActivity
      ? (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60)
      : 999;

    if (hoursSinceLastActivity > 24) {
      return 'inactive';
    }

    if (currentData.products?.length === 0) {
      return 'error';
    }

    return 'active';
  }

  private calculateAveragePrice(competitorData: CompetitorData[], productId?: string): number {
    const allPrices: number[] = [];

    competitorData.forEach(data => {
      data.currentProducts.forEach(product => {
        if (!productId || product.productId === productId) {
          allPrices.push(product.price);
        }
      });
    });

    return allPrices.length > 0 ? allPrices.reduce((sum, price) => sum + price, 0) / allPrices.length : 0;
  }

  private calculatePriceRange(competitorData: CompetitorData[], productId?: string): { min: number; max: number } {
    const allPrices: number[] = [];

    competitorData.forEach(data => {
      data.currentProducts.forEach(product => {
        if (!productId || product.productId === productId) {
          allPrices.push(product.price);
        }
      });
    });

    if (allPrices.length === 0) {
      return { min: 0, max: 0 };
    }

    return {
      min: Math.min(...allPrices),
      max: Math.max(...allPrices)
    };
  }

  private estimateMarketShare(competitorData: CompetitorData[]): Record<string, number> {
    // Simplified market share estimation based on product count
    const totalProducts = competitorData.reduce((sum, data) => sum + data.currentProducts.length, 0);
    const marketShare: Record<string, number> = {};

    competitorData.forEach(data => {
      marketShare[data.competitorName] = totalProducts > 0
        ? (data.currentProducts.length / totalProducts) * 100
        : 0;
    });

    return marketShare;
  }

  private analyzeCompetitorTrends(competitorData: CompetitorData[]): any {
    // Analyze trends in competitor activities
    return {
      priceTrend: 'stable', // Would analyze price history
      activityLevel: 'moderate',
      competitiveIntensity: 'medium'
    };
  }

  private identifyOpportunities(competitorData: CompetitorData[], productId?: string): string[] {
    const opportunities: string[] = [];

    competitorData.forEach(data => {
      data.currentProducts.forEach(product => {
        if (!productId || product.productId === productId) {
          if (!product.inStock) {
            opportunities.push(`${data.competitorName} out of stock for ${product.name}`);
          }
        }
      });
    });

    return opportunities;
  }

  private identifyThreats(competitorData: CompetitorData[], productId?: string): string[] {
    const threats: string[] = [];

    // Identify low-price competitors
    const avgPrice = this.calculateAveragePrice(competitorData, productId);
    competitorData.forEach(data => {
      data.currentProducts.forEach(product => {
        if (!productId || product.productId === productId) {
          if (product.price < avgPrice * 0.9) {
            threats.push(`${data.competitorName} has significantly lower price for ${product.name}`);
          }
        }
      });
    });

    return threats;
  }

  private async generateCompetitorRecommendations(
    competitorData: CompetitorData[],
    productId?: string
  ): Promise<string[]> {
    const recommendations: string[] = [];
    const avgPrice = this.calculateAveragePrice(competitorData, productId);

    competitorData.forEach(data => {
      data.currentProducts.forEach(product => {
        if (!productId || product.productId === productId) {
          if (product.price > avgPrice * 1.2) {
            recommendations.push(`Consider price adjustment for ${product.name} - competitor ${data.competitorName} is much lower`);
          }
        }
      });
    });

    return recommendations.slice(0, 5);
  }

  private calculatePriceElasticity(competitorData: CompetitorData[], productId?: string): number {
    // Simplified price elasticity calculation
    return 1.5; // Would be calculated based on historical data
  }

  private analyzePromotionalActivity(competitorData: CompetitorData[]): any {
    return {
      activePromotions: 0,
      averageDiscount: 0,
      promotionFrequency: 'low'
    };
  }

  private getCutoffTime(timeframe: 'hour' | 'day' | 'week'): Date {
    const now = Date.now();
    const timeframes = {
      hour: 60 * 60 * 1000,
      day: 24 * 60 * 60 * 1000,
      week: 7 * 24 * 60 * 60 * 1000
    };

    return new Date(now - timeframes[timeframe]);
  }

  private getAllRecentActivities(cutoffTime: Date): CompetitorActivity[] {
    const allActivities: CompetitorActivity[] = [];

    for (const activities of this.activityHistory.values()) {
      allActivities.push(...activities.filter(a => a.timestamp.getTime() > cutoffTime.getTime()));
    }

    return allActivities;
  }

  private getAllRecentPriceChanges(cutoffTime: Date): any[] {
    const allPriceChanges: any[] = [];

    for (const prices of this.priceHistory.values()) {
      allPriceChanges.push(...prices.filter(p => p.timestamp.getTime() > cutoffTime.getTime()));
    }

    return allPriceChanges;
  }

  private groupActivitiesByType(activities: CompetitorActivity[]): Record<string, number> {
    return activities.reduce((acc, activity) => {
      acc[activity.type] = (acc[activity.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private groupActivitiesByCompetitor(activities: CompetitorActivity[]): Record<string, number> {
    return activities.reduce((acc, activity) => {
      acc[activity.competitorId] = (acc[activity.competitorId] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  private calculatePriceVolatility(priceChanges: any[]): number {
    if (priceChanges.length === 0) return 0;

    const priceChangesOnly = priceChanges.filter(p => p.type === 'PRICE_CHANGE');
    const avgChange = priceChangesOnly.reduce((sum, p) => sum + Math.abs(p.priceChangePercent), 0) / priceChangesOnly.length;

    return Math.min(avgChange / 100, 1);
  }

  private identifyMostActiveCompetitors(activities: CompetitorActivity[]): any[] {
    const competitorActivity = new Map<string, number>();

    activities.forEach(activity => {
      const count = competitorActivity.get(activity.competitorId) || 0;
      competitorActivity.set(activity.competitorId, count + 1);
    });

    return Array.from(competitorActivity.entries())
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([competitorId, activityCount]) => ({ competitorId, activityCount }));
  }

  private identifyPriceLeaders(): any[] {
    // Identify competitors with lowest prices
    return [];
  }

  private analyzeMarketMovements(priceChanges: any[]): any {
    return {
      trend: 'stable',
      volatility: this.calculatePriceVolatility(priceChanges),
      significantMovements: priceChanges.filter(p => Math.abs(p.priceChangePercent) > 10).length
    };
  }

  private analyzeAlertTrends(cutoffTime: Date): any {
    const recentAlerts: CompetitorAlert[] = [];

    for (const alerts of this.alerts.values()) {
      recentAlerts.push(...alerts.filter(a => a.timestamp.getTime() > cutoffTime.getTime()));
    }

    return {
      totalAlerts: recentAlerts.length,
      bySeverity: recentAlerts.reduce((acc, alert) => {
        acc[alert.severity] = (acc[alert.severity] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byType: recentAlerts.reduce((acc, alert) => {
        acc[alert.type] = (acc[alert.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };
  }

  private calculateMonitoringEfficiency(): number {
    // Calculate how efficiently monitoring is working
    return 0.85; // 85% efficiency
  }

  private assessDataQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    // Assess quality of monitoring data
    return 'good';
  }

  private async generateMonitoringRecommendations(
    activities: CompetitorActivity[],
    priceChanges: any[]
  ): Promise<string[]> {
    const recommendations: string[] = [];

    if (activities.length === 0) {
      recommendations.push('No competitor activity detected - check monitoring configuration');
    }

    if (this.calculatePriceVolatility(priceChanges) > 0.3) {
      recommendations.push('High price volatility detected - consider more frequent monitoring');
    }

    return recommendations;
  }
}

// Type definitions
interface CompetitorMonitorConfig {
  enabled?: boolean;
  monitoringInterval?: number;
  alertThresholds?: {
    priceChangePercent?: number;
    outOfStockDuration?: number;
    promotionDiscount?: number;
    newProductGracePeriod?: number;
  };
}

interface CompetitorAnalysisResult {
  timestamp: Date;
  productId?: string;
  totalCompetitors: number;
  activeCompetitors: number;
  averagePrice: number;
  priceRange: { min: number; max: number };
  marketShare: Record<string, number>;
  competitorTrends: any;
  opportunities: string[];
  threats: string[];
  recommendations: string[];
  priceElasticity: number;
  promotionalActivity: any;
}

interface MonitoringInsights {
  timeframe: 'hour' | 'day' | 'week';
  totalActivities: number;
  activityByType: Record<string, number>;
  activityByCompetitor: Record<string, number>;
  priceVolatility: number;
  mostActiveCompetitors: any[];
  priceLeaders: any[];
  marketMovements: any;
  alertTrends: any;
  monitoringEfficiency: number;
  dataQuality: 'excellent' | 'good' | 'fair' | 'poor';
  recommendations: string[];
}

export { CompetitorMonitor };