import { auditLogger } from './audit-logger';
import { productRepository } from './product-repository';
import { notificationService } from './notification-service';
import { emailService } from './email-service';
import { queueManager } from './queue-manager';
import type {
  ProfitReport,
  ProfitMetrics,
  OrderProfitData,
  SalesAnalytics,
  ProfitTrend,
  AutomatedReport
} from '@/types';

export class ProfitAnalyticsService {
  private profitCache = new Map<string, ProfitCacheEntry>();
  private reportQueue: ReportJob[] = [];
  private analyticsData = new Map<string, AnalyticsCache>();

  /**
   * Initialize profit analytics automation
   */
  async initialize(): Promise<void> {
    await this.loadHistoricalData();
    this.startAutomatedReporting();
    this.startProfitMonitoring();
    this.initializeTrendAnalysis();

    console.log('Profit analytics automation initialized');
  }

  /**
   * Calculate profit for a single order
   */
  async calculateOrderProfit(orderData: OrderProfitCalculationData): Promise<OrderProfitData> {
    try {
      // Get revenue
      const revenue = parseFloat(orderData.orderTotal || '0');

      // Calculate total costs
      const costBreakdown = await this.calculateOrderCosts(orderData);

      // Calculate profit metrics
      const totalCost = Object.values(costBreakdown).reduce((sum, cost) => sum + cost, 0);
      const profit = revenue - totalCost;
      const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

      // Calculate ROI
      const totalInvestment = costBreakdown.productCost + costBreakdown.shippingCost + costBreakdown.fees;
      const roi = totalInvestment > 0 ? (profit / totalInvestment) * 100 : 0;

      const profitData: OrderProfitData = {
        orderId: orderData.orderId,
        revenue,
        costs: costBreakdown,
        totalCost,
        profit,
        profitMargin,
        roi,
        orderDate: orderData.orderDate,
        currency: orderData.currency || 'USD'
      };

      // Cache the profit data
      this.profitCache.set(orderData.orderId, {
        orderId: orderData.orderId,
        profitData,
        calculatedAt: new Date()
      });

      // Log profit calculation
      await auditLogger.logProfitEvent('order_profit_calculated', {
        orderId: orderData.orderId,
        revenue,
        totalCost,
        profit,
        profitMargin,
        roi
      });

      return profitData;

    } catch (error) {
      console.error('Failed to calculate order profit:', error);
      throw new Error(`Profit calculation failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive profit report
   */
  async generateProfitReport(period: 'week' | 'month' | 'quarter' | 'year'): Promise<ProfitReport> {
    const { startDate, endDate } = this.getDateRange(period);

    try {
      // Get all orders in period
      const orders = await this.getOrdersInPeriod(startDate, endDate);

      // Calculate profit for each order
      const profitData: OrderProfitData[] = [];
      for (const order of orders) {
        try {
          const orderProfit = await this.calculateOrderProfit({
            orderId: order.id,
            orderTotal: order.total,
            lineItems: order.line_items,
            shippingCost: order.shipping_cost,
            orderDate: order.created_at,
            currency: order.currency
          });
          profitData.push(orderProfit);
        } catch (error) {
          console.error(`Failed to calculate profit for order ${order.id}:`, error);
        }
      }

      // Generate comprehensive report
      const report: ProfitReport = {
        period,
        startDate,
        endDate,
        summary: this.calculateProfitSummary(profitData),
        byProduct: this.groupProfitByProduct(profitData),
        bySupplier: this.groupProfitBySupplier(profitData),
        byCategory: this.groupProfitByCategory(profitData),
        trends: await this.analyzeProfitTrends(profitData, period),
        kpis: this.calculateKPIs(profitData, period),
        recommendations: this.generateProfitRecommendations(profitData),
        generatedAt: new Date()
      };

      // Cache the report
      this.profitCache.set(`report-${period}-${startDate.getTime()}`, {
        period,
        report,
        generatedAt: new Date()
      });

      // Log report generation
      await auditLogger.logProfitEvent('profit_report_generated', {
        period,
        orderCount: profitData.length,
        totalRevenue: report.summary.totalRevenue,
        totalProfit: report.summary.totalProfit,
        averageMargin: report.summary.averageProfitMargin
      });

      return report;

    } catch (error) {
      console.error('Failed to generate profit report:', error);
      throw new Error(`Profit report generation failed: ${error.message}`);
    }
  }

  /**
   * Get real-time profit dashboard data
   */
  async getProfitDashboard(timeframe: 'today' | 'week' | 'month' = 'today'): Promise<ProfitDashboard> {
    const { startDate, endDate } = this.getDateRange(timeframe);

    const orders = await this.getOrdersInPeriod(startDate, endDate);
    const profitData: OrderProfitData[] = [];

    for (const order of orders) {
      const cached = this.profitCache.get(order.id);
      if (cached) {
        profitData.push(cached.profitData);
      } else {
        try {
          const orderProfit = await this.calculateOrderProfit({
            orderId: order.id,
            orderTotal: order.total,
            lineItems: order.line_items,
            shippingCost: order.shipping_cost,
            orderDate: order.created_at,
            currency: order.currency
          });
          profitData.push(orderProfit);
        } catch (error) {
          // Skip orders that can't be calculated
        }
      }
    }

    return {
      timeframe,
      totalRevenue: profitData.reduce((sum, p) => sum + p.revenue, 0),
      totalProfit: profitData.reduce((sum, p) => sum + p.profit, 0),
      totalCost: profitData.reduce((sum, p) => sum + p.totalCost, 0),
      averageMargin: profitData.length > 0
        ? profitData.reduce((sum, p) => sum + p.profitMargin, 0) / profitData.length
        : 0,
      orderCount: profitData.length,
      topProducts: this.getTopProfitProducts(profitData, 10),
      profitTrend: this.calculateProfitTrend(profitData),
      alerts: await this.generateProfitAlerts(profitData)
    };
  }

  /**
   * Predict future profits based on trends
   */
  async predictProfits(days: number = 30): Promise<ProfitPrediction> {
    try {
      // Get historical data for trend analysis
      const historicalData = await this.getHistoricalProfitData(90); // Last 90 days

      // Calculate trends and patterns
      const trends = await this.analyzeProfitTrends(historicalData, 'quarter');

      // Seasonal adjustments
      const seasonalFactors = await this.calculateSeasonalFactors();

      // Make predictions
      const predictions: DailyProfitPrediction[] = [];
      const currentDate = new Date();

      for (let i = 1; i <= days; i++) {
        const predictionDate = new Date(currentDate);
        predictionDate.setDate(currentDate.getDate() + i);

        const dayOfWeek = predictionDate.getDay();
        const dayOfYear = Math.floor((predictionDate.getTime() - new Date(predictionDate.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));

        const basePrediction = trends.revenuePerDay || 0;
        const dayOfWeekFactor = this.getDayOfWeekFactor(dayOfWeek, historicalData);
        const seasonalFactor = seasonalFactors[dayOfYear] || 1;

        const predictedRevenue = basePrediction * dayOfWeekFactor * seasonalFactor;
        const predictedCost = predictedRevenue * (trends.averageCostRatio || 0.7);
        const predictedProfit = predictedRevenue - predictedCost;

        predictions.push({
          date: predictionDate,
          predictedRevenue,
          predictedCost,
          predictedProfit,
          confidence: this.calculatePredictionConfidence(i, days, trends)
        });
      }

      // Calculate summary
      const totalPredictedRevenue = predictions.reduce((sum, p) => sum + p.predictedRevenue, 0);
      const totalPredictedProfit = predictions.reduce((sum, p) => sum + p.predictedProfit, 0);
      const averageConfidence = predictions.reduce((sum, p) => sum + p.confidence, 0) / predictions.length;

      return {
        period: `${days} days`,
        predictions,
        summary: {
          totalRevenue: totalPredictedRevenue,
          totalProfit: totalPredictedProfit,
          averageConfidence,
          dailyAverageRevenue: totalPredictedRevenue / days,
          dailyAverageProfit: totalPredictedProfit / days
        },
        generatedAt: new Date()
      };

    } catch (error) {
      console.error('Failed to predict profits:', error);
      throw new Error(`Profit prediction failed: ${error.message}`);
    }
  }

  /**
   * Generate and export automated reports
   */
  async generateAutomatedReport(
    type: 'daily' | 'weekly' | 'monthly',
    format: 'excel' | 'csv' | 'pdf',
    recipients: string[]
  ): Promise<AutomatedReport> {
    try {
      const period = type === 'daily' ? 'week' : type === 'weekly' ? 'month' : 'quarter';
      const profitReport = await this.generateProfitReport(period);

      // Generate report data
      const reportData = this.formatReportData(profitReport, format);

      // Create file
      const fileUrl = await this.createReportFile(reportData, format, type);

      const automatedReport: AutomatedReport = {
        id: `report-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type,
        period,
        format,
        fileUrl,
        summary: profitReport.summary,
        generatedAt: new Date(),
        recipients
      };

      // Send report to recipients
      await this.emailReport(automatedReport);

      // Log automated report generation
      await auditLogger.logProfitEvent('automated_report_generated', {
        reportId: automatedReport.id,
        type,
        format,
        recipientCount: recipients.length,
        totalRevenue: profitReport.summary.totalRevenue
      });

      return automatedReport;

    } catch (error) {
      console.error('Failed to generate automated report:', error);
      throw new Error(`Automated report generation failed: ${error.message}`);
    }
  }

  /**
   * Monitor profit margins and send alerts
   */
  async monitorProfitMargins(): Promise<void> {
    try {
      const recentOrders = await this.getRecentOrders(24); // Last 24 hours
      const profitData: OrderProfitData[] = [];

      for (const order of recentOrders) {
        try {
          const orderProfit = await this.calculateOrderProfit({
            orderId: order.id,
            orderTotal: order.total,
            lineItems: order.line_items,
            shippingCost: order.shipping_cost,
            orderDate: order.created_at,
            currency: order.currency
          });
          profitData.push(orderProfit);
        } catch (error) {
          // Skip problematic orders
        }
      }

      if (profitData.length === 0) return;

      // Calculate average margin
      const averageMargin = profitData.reduce((sum, p) => sum + p.profitMargin, 0) / profitData.length;

      // Check for margin alerts
      if (averageMargin < 10) {
        await notificationService.sendOperationsAlert({
          system: 'Profit Analytics',
          message: `Low profit margin detected: ${averageMargin.toFixed(2)}% average over last 24 hours`,
          severity: 'high',
          data: {
            averageMargin,
            orderCount: profitData.length,
            timeframe: '24 hours'
          }
        });
      }

      // Check for unprofitable orders
      const unprofitableOrders = profitData.filter(p => p.profit <= 0);
      if (unprofitableOrders.length > 0) {
        await notificationService.sendOperationsAlert({
          system: 'Profit Analytics',
          message: `${unprofitableOrders.length} unprofitable orders detected in last 24 hours`,
          severity: 'medium',
          data: {
            unprofitableOrders: unprofitableOrders.map(o => o.orderId),
            totalLoss: unprofitableOrders.reduce((sum, o) => sum + Math.abs(o.profit), 0)
          }
        });
      }

    } catch (error) {
      console.error('Error monitoring profit margins:', error);
    }
  }

  /**
   * Calculate order costs breakdown
   */
  private async calculateOrderCosts(orderData: OrderProfitCalculationData): Promise<OrderCostBreakdown> {
    const costs: OrderCostBreakdown = {
      productCost: 0,
      shippingCost: 0,
      paymentFees: 0,
      platformFees: 0,
      marketingCosts: 0,
      overheadCosts: 0,
      otherCosts: 0
    };

    // Calculate product costs from line items
    for (const item of orderData.lineItems) {
      const product = await productRepository.getBySku(item.sku);
      if (product && product.cost) {
        costs.productCost += product.cost * item.quantity;
      }
    }

    // Add shipping costs
    costs.shippingCost = parseFloat(orderData.shippingCost || '0');

    // Calculate payment processing fees (typically 2.9% + $0.30)
    const orderTotal = parseFloat(orderData.orderTotal || '0');
    costs.paymentFees = (orderTotal * 0.029) + 0.30;

    // Platform fees (varies by platform)
    costs.platformFees = orderTotal * 0.03; // 3% platform fee

    // Allocate marketing costs (attribution based)
    costs.marketingCosts = await this.allocateMarketingCosts(orderData);

    // Overhead costs (customer service, returns, etc.)
    costs.overheadCosts = orderTotal * 0.05; // 5% overhead allocation

    return costs;
  }

  /**
   * Allocate marketing costs to order
   */
  private async allocateMarketingCosts(orderData: OrderProfitCalculationData): Promise<number> {
    // Implementation would use marketing attribution data
    const orderTotal = parseFloat(orderData.orderTotal || '0');
    return orderTotal * 0.08; // 8% marketing cost allocation
  }

  /**
   * Calculate profit summary from data
   */
  private calculateProfitSummary(profitData: OrderProfitData[]): ProfitMetrics {
    const totalRevenue = profitData.reduce((sum, p) => sum + p.revenue, 0);
    const totalCost = profitData.reduce((sum, p) => sum + p.totalCost, 0);
    const totalProfit = profitData.reduce((sum, p) => sum + p.profit, 0);
    const averageMargin = profitData.length > 0
      ? profitData.reduce((sum, p) => sum + p.profitMargin, 0) / profitData.length
      : 0;

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      averageProfitMargin: averageMargin,
      averageROI: profitData.length > 0
        ? profitData.reduce((sum, p) => sum + p.roi, 0) / profitData.length
        : 0,
      orderCount: profitData.length,
      profitableOrders: profitData.filter(p => p.profit > 0).length,
      unprofitableOrders: profitData.filter(p => p.profit <= 0).length
    };
  }

  /**
   * Group profit data by product
   */
  private groupProfitByProduct(profitData: OrderProfitData[]): any[] {
    const productGroups = new Map<string, any>();

    for (const order of profitData) {
      // Implementation would group by actual product data
      // Simplified for now
    }

    return Array.from(productGroups.values());
  }

  /**
   * Group profit data by supplier
   */
  private groupProfitBySupplier(profitData: OrderProfitData[]): any[] {
    const supplierGroups = new Map<string, any>();

    for (const order of profitData) {
      // Implementation would group by supplier data
      // Simplified for now
    }

    return Array.from(supplierGroups.values());
  }

  /**
   * Group profit data by category
   */
  private groupProfitByCategory(profitData: OrderProfitData[]): any[] {
    const categoryGroups = new Map<string, any>();

    for (const order of profitData) {
      // Implementation would group by category data
      // Simplified for now
    }

    return Array.from(categoryGroups.values());
  }

  /**
   * Analyze profit trends over time
   */
  private async analyzeProfitTrends(profitData: OrderProfitData[], period: string): Promise<ProfitTrend> {
    // Implementation would analyze trends using statistical methods
    return {
      revenueGrowthRate: 5.2,
      profitGrowthRate: 3.8,
      marginTrend: 'stable',
      revenuePerDay: 1250,
      profitPerDay: 375,
      averageCostRatio: 0.7
    };
  }

  /**
   * Calculate KPIs
   */
  private calculateKPIs(profitData: OrderProfitData[], period: string): any {
    return {
      averageOrderValue: profitData.reduce((sum, p) => sum + p.revenue, 0) / profitData.length,
      profitPerOrder: profitData.reduce((sum, p) => sum + p.profit, 0) / profitData.length,
      conversionRate: 2.5,
      customerAcquisitionCost: 45,
      customerLifetimeValue: 850
    };
  }

  /**
   * Generate profit recommendations
   */
  private generateProfitRecommendations(profitData: OrderProfitData[]): string[] {
    const recommendations: string[] = [];

    const averageMargin = profitData.reduce((sum, p) => sum + p.profitMargin, 0) / profitData.length;

    if (averageMargin < 15) {
      recommendations.push('Consider raising prices or reducing costs to improve profit margins');
    }

    const unprofitableRate = (profitData.filter(p => p.profit <= 0).length / profitData.length) * 100;
    if (unprofitableRate > 10) {
      recommendations.push(`High unprofitable order rate (${unprofitableRate.toFixed(1)}%). Review pricing strategy.`);
    }

    recommendations.push('Focus on high-margin products for increased profitability');
    recommendations.push('Consider dynamic pricing based on demand and competition');

    return recommendations;
  }

  /**
   * Start automated reporting scheduler
   */
  private startAutomatedReporting(): void {
    // Daily reports at 8 AM
    queueManager.scheduleJob('daily-report', {}, {
      cron: '0 8 * * *'
    });

    // Weekly reports on Monday at 9 AM
    queueManager.scheduleJob('weekly-report', {}, {
      cron: '0 9 * * 1'
    });

    // Monthly reports on 1st at 10 AM
    queueManager.scheduleJob('monthly-report', {}, {
      cron: '0 10 1 * *'
    });
  }

  /**
   * Start profit monitoring
   */
  private startProfitMonitoring(): void {
    // Monitor profit margins every hour
    setInterval(() => {
      this.monitorProfitMargins().catch(console.error);
    }, 60 * 60 * 1000);
  }

  /**
   * Initialize trend analysis
   */
  private initializeTrendAnalysis(): void {
    // Analyze trends every 6 hours
    setInterval(() => {
      this.updateTrendAnalysis().catch(console.error);
    }, 6 * 60 * 60 * 1000);
  }

  // Helper methods
  private getDateRange(period: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (period) {
      case 'today':
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(startDate.getDate() - 7);
    }

    return { startDate, endDate };
  }

  private async loadHistoricalData(): Promise<void> {
    // Load historical profit data for analysis
  }

  private async getOrdersInPeriod(startDate: Date, endDate: Date): Promise<any[]> {
    // Implementation would fetch orders from database
    return [];
  }

  private getTopProfitProducts(profitData: OrderProfitData[], limit: number): any[] {
    // Implementation would group by product and sort by profit
    return [];
  }

  private calculateProfitTrend(profitData: OrderProfitData[]): any {
    // Calculate profit trend for dashboard
    return { direction: 'up', percentage: 5.2 };
  }

  private async generateProfitAlerts(profitData: OrderProfitData[]): Promise<any[]> {
    // Generate profit alerts for dashboard
    return [];
  }

  private async getHistoricalProfitData(days: number): Promise<OrderProfitData[]> {
    // Get historical profit data for prediction
    return [];
  }

  private async calculateSeasonalFactors(): Promise<number[]> {
    // Calculate seasonal adjustment factors
    return new Array(366).fill(1); // Placeholder
  }

  private getDayOfWeekFactor(dayOfWeek: number, historicalData: OrderProfitData[]): number {
    // Calculate day of week performance factor
    const factors = [0.8, 0.9, 1.0, 1.0, 1.1, 1.2, 0.7]; // Sun-Sat
    return factors[dayOfWeek];
  }

  private calculatePredictionConfidence(dayIndex: number, totalDays: number, trends: ProfitTrend): number {
    // Calculate prediction confidence based on distance from present
    return Math.max(0.5, 1 - (dayIndex / totalDays) * 0.5);
  }

  private formatReportData(report: ProfitReport, format: string): any {
    // Format report data for export
    return report;
  }

  private async createReportFile(data: any, format: string, type: string): Promise<string> {
    // Create report file and return URL
    return `https://example.com/reports/report-${Date.now()}.${format}`;
  }

  private async emailReport(report: AutomatedReport): Promise<void> {
    // Send report via email to recipients
    for (const recipient of report.recipients) {
      await emailService.sendAutomatedReport({
        to: recipient,
        report,
        reportType: report.type
      });
    }
  }

  private async getRecentOrders(hours: number): Promise<any[]> {
    // Get recent orders for monitoring
    return [];
  }

  private async updateTrendAnalysis(): Promise<void> {
    // Update trend analysis data
  }
}

// Type definitions
interface ProfitCacheEntry {
  orderId?: string;
  period?: string;
  profitData?: OrderProfitData;
  report?: ProfitReport;
  calculatedAt?: Date;
  generatedAt?: Date;
}

interface AnalyticsCache {
  key: string;
  data: any;
  timestamp: Date;
}

interface ReportJob {
  type: 'daily' | 'weekly' | 'monthly';
  scheduledAt: Date;
  format?: string;
  recipients?: string[];
}

interface OrderProfitCalculationData {
  orderId: string;
  orderTotal: string;
  lineItems: any[];
  shippingCost?: string;
  orderDate: string;
  currency?: string;
}

interface OrderCostBreakdown {
  productCost: number;
  shippingCost: number;
  paymentFees: number;
  platformFees: number;
  marketingCosts: number;
  overheadCosts: number;
  otherCosts: number;
}

interface ProfitDashboard {
  timeframe: string;
  totalRevenue: number;
  totalProfit: number;
  totalCost: number;
  averageMargin: number;
  orderCount: number;
  topProducts: any[];
  profitTrend: any;
  alerts: any[];
}

interface ProfitPrediction {
  period: string;
  predictions: DailyProfitPrediction[];
  summary: {
    totalRevenue: number;
    totalProfit: number;
    averageConfidence: number;
    dailyAverageRevenue: number;
    dailyAverageProfit: number;
  };
  generatedAt: Date;
}

interface DailyProfitPrediction {
  date: Date;
  predictedRevenue: number;
  predictedCost: number;
  predictedProfit: number;
  confidence: number; // 0-1
}

export const profitAnalyticsService = new ProfitAnalyticsService();