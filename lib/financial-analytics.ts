import { auditLogger } from './audit-logger';
import { profitAnalyticsService } from './profit-analytics';
import { revenueSplitService } from './revenue-split-service';
import { currencyService } from './currency-service';
import { notificationService } from './notification-service';
import type {
  FinancialReport,
  PNLStatement,
  BalanceSheet,
  ExpenseForecast,
  FinancialMetrics,
  Budget,
  BudgetCategory
} from '@/types';

export class FinancialAnalyticsService {
  private forecasts = new Map<string, ExpenseForecast>();
  private budgets = new Map<string, Budget>();
  private financialCache = new Map<string, FinancialCacheEntry>();

  /**
   * Initialize financial analytics
   */
  async initialize(): Promise<void> {
    await this.loadHistoricalData();
    await this.loadBudgets();
    this.startAutomatedReporting();
    this.startForecastUpdates();

    console.log('Financial analytics initialized');
  }

  /**
   * Generate comprehensive P&L statement
   */
  async generatePNLStatement(
    startDate: Date,
    endDate: Date,
    currency: string = 'USD'
  ): Promise<PNLStatement> {
    try {
      const period = { startDate, endDate };

      // Get revenue data
      const revenue = await this.calculateRevenue(period, currency);

      // Get cost of goods sold
      const cogs = await this.calculateCOGS(period, currency);

      // Calculate gross profit
      const grossProfit = revenue.total - cogs.total;

      // Get operating expenses
      const operatingExpenses = await this.calculateOperatingExpenses(period, currency);

      // Calculate operating income
      const operatingIncome = grossProfit - operatingExpenses.total;

      // Get other income and expenses
      const otherIncome = await this.calculateOtherIncome(period, currency);
      const otherExpenses = await this.calculateOtherExpenses(period, currency);

      // Calculate net income
      const netIncome = operatingIncome + otherIncome.total - otherExpenses.total;

      // Calculate tax expense
      const taxExpense = await this.calculateTaxExpense(netIncome, period);

      // Final net income after tax
      const netIncomeAfterTax = netIncome - taxExpense;

      const pnlStatement: PNLStatement = {
        period,
        currency,
        revenue,
        cogs,
        grossProfit: {
          total: grossProfit,
          margin: revenue.total > 0 ? (grossProfit / revenue.total) * 100 : 0
        },
        operatingExpenses,
        operatingIncome: {
          total: operatingIncome,
          margin: revenue.total > 0 ? (operatingIncome / revenue.total) * 100 : 0
        },
        otherIncome,
        otherExpenses,
        netIncome: {
          beforeTax: netIncome,
          taxExpense,
          afterTax: netIncomeAfterTax,
          margin: revenue.total > 0 ? (netIncomeAfterTax / revenue.total) * 100 : 0
        },
        metrics: await this.calculatePNLMetrics(period, currency),
        generatedAt: new Date()
      };

      // Cache the statement
      this.financialCache.set(`pnl-${startDate.getTime()}-${endDate.getTime()}`, {
        type: 'pnl',
        data: pnlStatement,
        generatedAt: new Date()
      });

      await auditLogger.logFinancialEvent('pnl_generated', {
        period,
        currency,
        totalRevenue: revenue.total,
        netIncome: netIncomeAfterTax,
        profitMargin: pnlStatement.netIncome.margin
      });

      return pnlStatement;

    } catch (error) {
      console.error('P&L generation failed:', error);
      throw new Error(`P&L generation failed: ${error.message}`);
    }
  }

  /**
   * Generate balance sheet
   */
  async generateBalanceSheet(
    asOfDate: Date,
    currency: string = 'USD'
  ): Promise<BalanceSheet> {
    try {
      // Calculate assets
      const assets = await this.calculateAssets(asOfDate, currency);

      // Calculate liabilities
      const liabilities = await this.calculateLiabilities(asOfDate, currency);

      // Calculate equity
      const equity = await this.calculateEquity(asOfDate, currency);

      // Validate balance sheet equation
      const totalAssets = assets.current + assets.nonCurrent + assets.other;
      const totalLiabilities = liabilities.current + liabilities.nonCurrent;
      const totalEquity = equity.common + equity.retained + equity.other;

      const balanceSheet: BalanceSheet = {
        asOfDate,
        currency,
        assets,
        liabilities,
        equity,
        validation: {
          assetsMatchLiabilitiesEquity: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.01,
          totalAssets,
          totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
          difference: totalAssets - (totalLiabilities + totalEquity)
        },
        financialRatios: await this.calculateFinancialRatios(assets, liabilities, equity),
        generatedAt: new Date()
      };

      await auditLogger.logFinancialEvent('balance_sheet_generated', {
        asOfDate,
        currency,
        totalAssets,
        totalLiabilities,
        totalEquity,
        validation: balanceSheet.validation.assetsMatchLiabilitiesEquity
      });

      return balanceSheet;

    } catch (error) {
      console.error('Balance sheet generation failed:', error);
      throw new Error(`Balance sheet generation failed: ${error.message}`);
    }
  }

  /**
   * Create expense forecast
   */
  async createExpenseForecast(
    startDate: Date,
    endDate: Date,
    currency: string = 'USD'
  ): Promise<ExpenseForecast> {
    try {
      const forecastId = this.generateForecastId();
      const period = { startDate, endDate };
      const months = this.getMonthsBetweenDates(startDate, endDate);

      // Get historical expense data
      const historicalData = await this.getHistoricalExpenses(
        new Date(startDate.getTime() - 365 * 24 * 60 * 60 * 1000), // Last 12 months
        startDate,
        currency
      );

      // Calculate forecast by category
      const categoryForecasts: CategoryForecast[] = [];
      let totalForecast = 0;

      for (const category of this.getExpenseCategories()) {
        const categoryForecast = await this.forecastCategoryExpenses(
          category,
          months,
          historicalData.filter(e => e.category === category)
        );

        categoryForecasts.push(categoryForecast);
        totalForecast += categoryForecast.totalForecast;
      }

      // Apply seasonal adjustments
      const adjustedForecasts = await this.applySeasonalAdjustments(
        categoryForecasts,
        months,
        historicalData
      );

      // Calculate confidence intervals
      const confidenceIntervals = await this.calculateConfidenceIntervals(
        adjustedForecasts,
        historicalData
      );

      const forecast: ExpenseForecast = {
        id: forecastId,
        period,
        currency,
        totalForecast,
        categoryForecasts: adjustedForecasts,
        confidenceIntervals,
        assumptions: await this.getDocumentedAssumptions(),
        accuracy: await this.calculateForecastAccuracy(historicalData),
        generatedAt: new Date()
      };

      this.forecasts.set(forecastId, forecast);

      await auditLogger.logFinancialEvent('expense_forecast_created', {
        forecastId,
        period,
        currency,
        totalForecast,
        categoryCount: adjustedForecasts.length
      });

      return forecast;

    } catch (error) {
      console.error('Expense forecast creation failed:', error);
      throw new Error(`Expense forecast creation failed: ${error.message}`);
    }
  }

  /**
   * Generate comprehensive financial report
   */
  async generateFinancialReport(
    startDate: Date,
    endDate: Date,
    includeForecast: boolean = true,
    currency: string = 'USD'
  ): Promise<FinancialReport> {
    try {
      // Generate P&L
      const pnlStatement = await this.generatePNLStatement(startDate, endDate, currency);

      // Generate Balance Sheet
      const balanceSheet = await this.generateBalanceSheet(endDate, currency);

      // Generate Cash Flow Statement
      const cashFlowStatement = await this.generateCashFlowStatement(startDate, endDate, currency);

      // Get financial metrics
      const metrics = await this.calculateFinancialMetrics(startDate, endDate, currency);

      // Include forecast if requested
      let forecast: ExpenseForecast | undefined;
      if (includeForecast) {
        const forecastStart = new Date(endDate);
        const forecastEnd = new Date(endDate.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
        forecast = await this.createExpenseForecast(forecastStart, forecastEnd, currency);
      }

      const report: FinancialReport = {
        id: this.generateReportId(),
        period: { startDate, endDate },
        currency,
        pnlStatement,
        balanceSheet,
        cashFlowStatement,
        metrics,
        forecast,
        insights: await this.generateFinancialInsights(pnlStatement, balanceSheet, cashFlowStatement),
        recommendations: await this.generateFinancialRecommendations(metrics),
        generatedAt: new Date()
      };

      await auditLogger.logFinancialEvent('financial_report_generated', {
        reportId: report.id,
        period,
        currency,
        includeForecast,
        netIncome: pnlStatement.netIncome.afterTax,
        totalAssets: balanceSheet.validation.totalAssets
      });

      return report;

    } catch (error) {
      console.error('Financial report generation failed:', error);
      throw new Error(`Financial report generation failed: ${error.message}`);
    }
  }

  /**
   * Create and manage budgets
   */
  async createBudget(budgetData: BudgetData): Promise<Budget> {
    try {
      const budget: Budget = {
        id: this.generateBudgetId(),
        name: budgetData.name,
        period: budgetData.period,
        currency: budgetData.currency,
        categories: budgetData.categories,
        totalBudget: budgetData.categories.reduce((sum, cat) => sum + cat.budgetAmount, 0),
        actualSpending: 0,
        variance: 0,
        status: 'active',
        createdBy: budgetData.createdBy,
        approvedBy: budgetData.approvedBy,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      this.budgets.set(budget.id, budget);

      await auditLogger.logFinancialEvent('budget_created', {
        budgetId: budget.id,
        budgetName: budget.name,
        period: budget.period,
        totalBudget: budget.totalBudget
      });

      return budget;

    } catch (error) {
      console.error('Budget creation failed:', error);
      throw new Error(`Budget creation failed: ${error.message}`);
    }
  }

  /**
   * Monitor budget performance and send alerts
   */
  async monitorBudgetPerformance(): Promise<BudgetAlert[]> {
    const alerts: BudgetAlert[] = [];

    for (const budget of this.budgets.values()) {
      if (budget.status !== 'active') continue;

      const currentSpending = await this.getCurrentSpending(budget);
      const variance = budget.totalBudget - currentSpending;
      const variancePercentage = (variance / budget.totalBudget) * 100;

      // Update budget actuals
      budget.actualSpending = currentSpending;
      budget.variance = variance;

      // Check for alerts
      if (variancePercentage < -10) {
        alerts.push({
          budgetId: budget.id,
          budgetName: budget.name,
          type: 'overspend',
          severity: 'high',
          message: `Budget "${budget.name}" is ${Math.abs(variancePercentage).toFixed(1)}% over budget`,
          currentSpending,
          budgetAmount: budget.totalBudget,
          variance,
          variancePercentage
        });
      } else if (variancePercentage < 0) {
        alerts.push({
          budgetId: budget.id,
          budgetName: budget.name,
          type: 'warning',
          severity: 'medium',
          message: `Budget "${budget.name}" is ${Math.abs(variancePercentage).toFixed(1)}% over budget`,
          currentSpending,
          budgetAmount: budget.totalBudget,
          variance,
          variancePercentage
        });
      } else if (variancePercentage > 20 && budget.period.endDate < new Date()) {
        alerts.push({
          budgetId: budget.id,
          budgetName: budget.name,
          type: 'underspend',
          severity: 'low',
          message: `Budget "${budget.name}" has ${variancePercentage.toFixed(1)}% remaining`,
          currentSpending,
          budgetAmount: budget.totalBudget,
          variance,
          variancePercentage
        });
      }

      // Check individual category performance
      for (const category of budget.categories) {
        const categorySpending = await this.getCategorySpending(category.categoryId, budget.period);
        const categoryVariance = category.budgetAmount - categorySpending;
        const categoryVariancePercentage = (categoryVariance / category.budgetAmount) * 100;

        if (categoryVariancePercentage < -15) {
          alerts.push({
            budgetId: budget.id,
            budgetName: budget.name,
            type: 'category_overspend',
            severity: 'high',
            message: `Category "${category.name}" is ${Math.abs(categoryVariancePercentage).toFixed(1)}% over budget`,
            currentSpending: categorySpending,
            budgetAmount: category.budgetAmount,
            variance: categoryVariance,
            variancePercentage: categoryVariancePercentage
          });
        }
      }
    }

    // Send notifications for high-severity alerts
    const highSeverityAlerts = alerts.filter(alert => alert.severity === 'high');
    if (highSeverityAlerts.length > 0) {
      await notificationService.sendOperationsAlert({
        system: 'Financial Analytics',
        message: `${highSeverityAlerts.length} budget alerts require attention`,
        severity: 'high',
        data: { alerts: highSeverityAlerts }
      });
    }

    return alerts;
  }

  /**
   * Get financial KPIs dashboard
   */
  async getFinancialKPIs(timeframe: 'month' | 'quarter' | 'year' = 'month'): Promise<FinancialKPIDashboard> {
    const { startDate, endDate } = this.getDateRangeForTimeframe(timeframe);

    try {
      // Get P&L data
      const pnl = await this.generatePNLStatement(startDate, endDate);

      // Get key metrics
      const metrics = await this.calculateFinancialMetrics(startDate, endDate);

      // Get budget performance
      const budgetPerformance = await this.getBudgetPerformance(startDate, endDate);

      // Get cash position
      const cashPosition = await this.getCashPosition(endDate);

      // Get profitability trends
      const profitabilityTrends = await this.getProfitabilityTrends(timeframe);

      return {
        timeframe,
        period: { startDate, endDate },
        revenue: {
          total: pnl.revenue.total,
          growth: metrics.revenueGrowth,
          breakdown: pnl.revenue.breakdown
        },
        profitability: {
          grossMargin: pnl.grossProfit.margin,
          operatingMargin: pnl.operatingIncome.margin,
          netMargin: pnl.netIncome.margin,
          netIncome: pnl.netIncome.afterTax
        },
        expenses: {
          total: pnl.operatingExpenses.total,
          budgetVariance: budgetPerformance.variance,
          breakdown: pnl.operatingExpenses.breakdown
        },
        cash: {
          position: cashPosition,
          burnRate: metrics.monthlyBurnRate,
          runway: metrics.cashRunway
        }
      };

      return kpiDashboard;
      },
      kpis: {
        customerAcquisitionCost: metrics.customerAcquisitionCost,
        customerLifetimeValue: metrics.customerLifetimeValue,
        ltvToCACRatio: metrics.ltvToCACRatio,
        grossRetentionRate: metrics.grossRetentionRate,
        netRetentionRate: metrics.netRetentionRate
      },
      trends: profitabilityTrends,
      alerts: await this.getFinancialAlerts(startDate, endDate),
      lastUpdated: new Date()
    };

    } catch (error) {
      console.error('Financial KPIs generation failed:', error);
      throw error;
    }
  }

  // Private methods

  /**
   * Load historical data
   */
  private async loadHistoricalData(): Promise<void> {
    // Implementation would load historical financial data
  }

  /**
   * Load budgets
   */
  private async loadBudgets(): Promise<void> {
    // Implementation would load budgets from database
  }

  /**
   * Start automated reporting
   */
  private startAutomatedReporting(): void {
    // Monthly financial reports on 1st of each month
    setInterval(async () => {
      const now = new Date();
      if (now.getDate() === 1 && now.getHours() === 9 && now.getMinutes() < 5) {
        await this.generateMonthlyReports().catch(console.error);
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Start forecast updates
   */
  private startForecastUpdates(): void {
    // Update forecasts weekly
    setInterval(async () => {
      await this.updateForecasts().catch(console.error);
    }, 7 * 24 * 60 * 60 * 1000); // Every week
  }

  /**
   * Calculate revenue for period
   */
  private async calculateRevenue(period: any, currency: string): Promise<any> {
    // Implementation would calculate revenue from orders, subscriptions, etc.
    return {
      total: 125000,
      breakdown: {
        productSales: 100000,
        services: 15000,
        subscriptions: 10000
      }
    };
  }

  /**
   * Calculate cost of goods sold
   */
  private async calculateCOGS(period: any, currency: string): Promise<any> {
    // Implementation would calculate COGS from inventory costs, shipping, etc.
    return {
      total: 75000,
      breakdown: {
        materials: 50000,
        labor: 15000,
        shipping: 10000
      }
    };
  }

  /**
   * Calculate operating expenses
   */
  private async calculateOperatingExpenses(period: any, currency: string): Promise<any> {
    // Implementation would calculate operating expenses
    return {
      total: 25000,
      breakdown: {
        salaries: 15000,
        rent: 5000,
        marketing: 3000,
        utilities: 2000
      }
    };
  }

  /**
   * Calculate financial metrics
   */
  private async calculateFinancialMetrics(
    startDate: Date,
    endDate: Date,
    currency: string
  ): Promise<FinancialMetrics> {
    return {
      revenueGrowth: 15.2,
      profitMargin: 20.5,
      operatingMargin: 18.3,
      grossMargin: 40.0,
      customerAcquisitionCost: 150,
      customerLifetimeValue: 1200,
      ltvToCACRatio: 8.0,
      grossRetentionRate: 92.5,
      netRetentionRate: 105.2,
      monthlyBurnRate: 15000,
      cashRunway: 18,
      debtToEquityRatio: 0.3,
      currentRatio: 2.5,
      quickRatio: 1.8
    };
  }

  // Helper methods and additional implementations would go here...

  private generateForecastId(): string {
    return `forecast_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBudgetId(): string {
    return `budget_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMonthsBetweenDates(startDate: Date, endDate: Date): Date[] {
    const months: Date[] = [];
    const current = new Date(startDate);

    while (current <= endDate) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  }

  private getExpenseCategories(): string[] {
    return [
      'salaries',
      'rent',
      'marketing',
      'utilities',
      'software',
      'professional_services',
      'insurance',
      'supplies',
      'travel',
      'other_expenses'
    ];
  }

  private getDateRangeForTimeframe(timeframe: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeframe) {
      case 'month':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return { startDate, endDate };
  }
}

// Type definitions
interface FinancialCacheEntry {
  type: 'pnl' | 'balance_sheet' | 'cash_flow';
  data: any;
  generatedAt: Date;
}

interface BudgetData {
  name: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  currency: string;
  categories: BudgetCategory[];
  createdBy: string;
  approvedBy?: string;
}

interface BudgetAlert {
  budgetId: string;
  budgetName: string;
  type: 'overspend' | 'warning' | 'underspend' | 'category_overspend';
  severity: 'low' | 'medium' | 'high';
  message: string;
  currentSpending: number;
  budgetAmount: number;
  variance: number;
  variancePercentage: number;
}

interface FinancialKPIDashboard {
  timeframe: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  revenue: {
    total: number;
    growth: number;
    breakdown: any;
  };
  profitability: {
    grossMargin: number;
    operatingMargin: number;
    netMargin: number;
    netIncome: number;
  };
  expenses: {
    total: number;
    budgetVariance: number;
    breakdown: any;
  };
  cash: {
    position: number;
    burnRate: number;
    runway: number;
  };
  kpis: {
    customerAcquisitionCost: number;
    customerLifetimeValue: number;
    ltvToCACRatio: number;
    grossRetentionRate: number;
    netRetentionRate: number;
  };
  trends: any;
  alerts: any[];
  lastUpdated: Date;
}

interface CategoryForecast {
  category: string;
  monthlyForecasts: Array<{
    month: Date;
    forecast: number;
    confidence: number;
  }>;
  totalForecast: number;
  historicalAverage: number;
  growthRate: number;
  seasonalityFactor: number;
}

export const financialAnalyticsService = new FinancialAnalyticsService();