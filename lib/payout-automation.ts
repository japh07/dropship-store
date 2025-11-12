import { auditLogger } from './audit-logger';
import { revenueSplitService } from './revenue-split-service';
import { currencyService } from './currency-service';
import { notificationService } from './notification-service';
import { stripeClient } from './stripe-client';
import type {
  Payout,
  PayoutSchedule,
  PayoutBatch,
  VendorPayout,
  PayoutMethod,
  PayoutTransaction,
  PayoutMetrics
} from '@/types';

export class PayoutAutomationService {
  private schedules = new Map<string, PayoutSchedule>();
  private pendingPayouts = new Map<string, VendorPayout>();
  private payoutHistory = new Map<string, Payout[]>();
  private payoutMethods = new Map<string, PayoutMethod>();

  /**
   * Initialize payout automation
   */
  async initialize(): Promise<void> {
    await this.loadPayoutSchedules();
    await this.loadPayoutMethods();
    await this.loadPendingPayouts();
    this.startPayoutProcessing();
    this.startPayoutMonitoring();

    console.log('Payout automation initialized');
  }

  /**
   * Configure payout schedule for vendor
   */
  async configurePayoutSchedule(config: PayoutScheduleConfig): Promise<PayoutSchedule> {
    try {
      const schedule: PayoutSchedule = {
        id: this.generateScheduleId(),
        vendorId: config.vendorId,
        frequency: config.frequency,
        dayOfWeek: config.dayOfWeek,
        dayOfMonth: config.dayOfMonth,
        minimumAmount: config.minimumAmount,
        maximumAmount: config.maximumAmount,
        currency: config.currency,
        method: config.method,
        fees: config.fees || { processing: 0.5, transfer: 0.25 },
        autoProcess: config.autoProcess !== false,
        notifications: config.notifications !== false,
        createdAt: new Date(),
        nextPayoutDate: this.calculateNextPayoutDate(config),
        lastPayoutDate: null
      };

      this.schedules.set(schedule.id, schedule);

      await auditLogger.logPayoutEvent('payout_schedule_configured', {
        scheduleId: schedule.id,
        vendorId: schedule.vendorId,
        frequency: schedule.frequency,
        nextPayoutDate: schedule.nextPayoutDate
      });

      return schedule;

    } catch (error) {
      console.error('Payout schedule configuration failed:', error);
      throw new Error(`Payout schedule configuration failed: ${error.message}`);
    }
  }

  /**
   * Create vendor payout
   */
  async createVendorPayout(vendorId: string, options?: PayoutOptions): Promise<VendorPayout> {
    try {
      // Get vendor's payout schedule
      const schedule = await this.getVendorSchedule(vendorId);
      if (!schedule) {
        throw new Error(`No payout schedule found for vendor: ${vendorId}`);
      }

      // Calculate available funds
      const availableFunds = await this.calculateAvailableFunds(vendorId, schedule);

      if (availableFunds.total < schedule.minimumAmount) {
        throw new Error(`Insufficient funds. Available: $${availableFunds.total}, Minimum: $${schedule.minimumAmount}`);
      }

      // Calculate payout amount
      const payoutAmount = this.calculatePayoutAmount(availableFunds.total, schedule);

      // Calculate fees
      const fees = this.calculatePayoutFees(payoutAmount, schedule);

      // Create payout record
      const payout: VendorPayout = {
        id: this.generatePayoutId(),
        vendorId,
        scheduleId: schedule.id,
        amount: payoutAmount,
        currency: schedule.currency,
        fees,
        netAmount: payoutAmount - fees.total,
        status: 'pending',
        method: schedule.method,
        transactions: availableFunds.transactions,
        createdAt: new Date(),
        scheduledFor: options?.immediate ? new Date() : schedule.nextPayoutDate,
        processedAt: null,
        completedAt: null,
        failureReason: null,
        retryCount: 0
      };

      this.pendingPayouts.set(payout.id, payout);

      // Process immediately if requested
      if (options?.immediate) {
        await this.processPayout(payout);
      }

      await auditLogger.logPayoutEvent('vendor_payout_created', {
        payoutId: payout.id,
        vendorId,
        amount: payout.amount,
        netAmount: payout.netAmount,
        transactionCount: payout.transactions.length
      });

      return payout;

    } catch (error) {
      console.error('Vendor payout creation failed:', error);
      throw new Error(`Vendor payout creation failed: ${error.message}`);
    }
  }

  /**
   * Process scheduled payouts
   */
  async processScheduledPayouts(): Promise<PayoutBatch> {
    const batch: PayoutBatch = {
      id: this.generateBatchId(),
      processedAt: new Date(),
      totalPayouts: 0,
      successfulPayouts: 0,
      failedPayouts: 0,
      totalAmount: 0,
      totalFees: 0,
      payouts: []
    };

    try {
      // Get due payouts
      const duePayouts = await this.getDuePayouts();

      console.log(`Processing ${duePayouts.length} scheduled payouts`);

      for (const payout of duePayouts) {
        try {
          const result = await this.processPayout(payout);
          batch.payouts.push(result);

          batch.totalPayouts++;
          batch.totalAmount += payout.amount;
          batch.totalFees += payout.fees.total;

          if (payout.status === 'completed') {
            batch.successfulPayouts++;
          } else {
            batch.failedPayouts++;
          }

        } catch (error) {
          console.error(`Failed to process payout ${payout.id}:`, error);
          payout.status = 'failed';
          payout.failureReason = error.message;
          batch.failedPayouts++;
          batch.payouts.push(payout);
        }
      }

      // Update schedule next payout dates
      await this.updateScheduleNextDates(batch.payouts);

      // Send batch summary notification
      if (batch.totalPayouts > 0) {
        await this.sendBatchNotification(batch);
      }

      await auditLogger.logPayoutEvent('payout_batch_processed', {
        batchId: batch.id,
        totalPayouts: batch.totalPayouts,
        successfulPayouts: batch.successfulPayouts,
        failedPayouts: batch.failedPayouts,
        totalAmount: batch.totalAmount
      });

      return batch;

    } catch (error) {
      console.error('Scheduled payout processing failed:', error);
      throw error;
    }
  }

  /**
   * Process individual payout
   */
  async processPayout(payout: VendorPayout): Promise<VendorPayout> {
    try {
      payout.status = 'processing';
      payout.processedAt = new Date();

      // Convert currency if needed
      if (payout.currency !== 'USD') {
        const conversion = await currencyService.convertAmount(
          payout.amount,
          payout.currency,
          'USD'
        );
        // Update payout with converted amounts if needed
      }

      // Process payout based on method
      let result: PayoutResult;

      switch (payout.method) {
        case 'stripe':
          result = await this.processStripePayout(payout);
          break;
        case 'bank_transfer':
          result = await this.processBankTransferPayout(payout);
          break;
        case 'paypal':
          result = await this.processPayPalPayout(payout);
          break;
        case 'check':
          result = await this.processCheckPayout(payout);
          break;
        default:
          throw new Error(`Unsupported payout method: ${payout.method}`);
      }

      if (result.success) {
        payout.status = 'completed';
        payout.completedAt = new Date();
        payout.externalId = result.externalId;
        payout.externalReference = result.reference;

        // Mark transactions as paid
        await this.markTransactionsAsPaid(payout.transactions);

      } else {
        payout.status = 'failed';
        payout.failureReason = result.error;
        payout.retryCount++;

        // Schedule retry if applicable
        if (payout.retryCount < 3) {
          await this.schedulePayoutRetry(payout);
        }
      }

      // Send notification
      if (payout.status === 'completed') {
        await this.sendPayoutSuccessNotification(payout);
      } else {
        await this.sendPayoutFailureNotification(payout);
      }

      return payout;

    } catch (error) {
      payout.status = 'failed';
      payout.failureReason = error.message;
      payout.retryCount++;
      throw error;
    }
  }

  /**
   * Get payout metrics
   */
  async getPayoutMetrics(
    startDate: Date,
    endDate: Date,
    vendorId?: string
  ): Promise<PayoutMetrics> {
    try {
      const filters: PayoutFilters = {
        startDate,
        endDate,
        vendorId
      };

      const payouts = await this.getPayouts(filters);
      const schedule = vendorId ? await this.getVendorSchedule(vendorId) : null;

      const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
      const totalFees = payouts.reduce((sum, p) => sum + p.fees.total, 0);
      const netAmount = totalAmount - totalFees;

      const metrics: PayoutMetrics = {
        period: { startDate, endDate },
        vendorId,
        totalPayouts: payouts.length,
        totalAmount,
        totalFees,
        netAmount,
        averagePayoutAmount: payouts.length > 0 ? totalAmount / payouts.length : 0,
        successRate: this.calculateSuccessRate(payouts),
        averageProcessingTime: this.calculateAverageProcessingTime(payouts),
        payoutBreakdown: this.getPayoutBreakdown(payouts),
        trends: await this.calculatePayoutTrends(filters),
        nextScheduledPayouts: await this.getNextScheduledPayouts(vendorId),
        vendorMetrics: vendorId ? await this.getVendorPayoutMetrics(vendorId, startDate, endDate) : undefined
      };

      return metrics;

    } catch (error) {
      console.error('Failed to get payout metrics:', error);
      throw error;
    }
  }

  /**
   * Get vendor payout summary
   */
  async getVendorPayoutSummary(vendorId: string): Promise<VendorPayoutSummary> {
    try {
      const schedule = await this.getVendorSchedule(vendorId);
      const currentBalance = await this.calculateAvailableFunds(vendorId, schedule);
      const recentPayouts = await this.getRecentPayouts(vendorId, 10);
      const upcomingPayout = await this.getNextPayout(vendorId);

      return {
        vendorId,
        currentBalance: currentBalance.total,
        pendingTransactions: currentBalance.transactions.length,
        lastPayout: recentPayouts[0] || null,
        nextPayout: upcomingPayout,
        schedule: schedule || null,
        payoutMethod: schedule?.method || 'stripe',
        monthToDate: await this.getMonthToDateTotals(vendorId),
        yearToDate: await this.getYearToDateTotals(vendorId),
        averagePayoutAmount: recentPayouts.length > 0
          ? recentPayouts.reduce((sum, p) => sum + p.amount, 0) / recentPayouts.length
          : 0
      };

    } catch (error) {
      console.error('Failed to get vendor payout summary:', error);
      throw error;
    }
  }

  /**
   * Handle payout failures and retries
   */
  async handlePayoutFailures(): Promise<FailureResolution[]> {
    const resolutions: FailureResolution[] = [];

    try {
      // Get failed payouts eligible for retry
      const failedPayouts = await this.getRetryableFailedPayouts();

      for (const payout of failedPayouts) {
        try {
          // Analyze failure reason
          const analysis = await this.analyzePayoutFailure(payout);

          // Attempt resolution
          const resolution = await this.resolvePayoutFailure(payout, analysis);
          resolutions.push(resolution);

          if (resolution.resolved) {
            await auditLogger.logPayoutEvent('payout_failure_resolved', {
              payoutId: payout.id,
              vendorId: payout.vendorId,
              originalError: payout.failureReason,
              resolution: resolution.resolutionType
            });
          }

        } catch (error) {
          console.error(`Failed to resolve payout ${payout.id}:`, error);
          resolutions.push({
            payoutId: payout.id,
            resolved: false,
            resolutionType: 'manual_intervention',
            message: `Failed to resolve: ${error.message}`
          });
        }
      }

      return resolutions;

    } catch (error) {
      console.error('Payout failure handling failed:', error);
      throw error;
    }
  }

  // Private methods

  /**
   * Start payout processing scheduler
   */
  private startPayoutProcessing(): void {
    // Check for scheduled payouts every hour
    setInterval(async () => {
      try {
        await this.processScheduledPayouts().catch(console.error);
      } catch (error) {
        console.error('Scheduled payout processing error:', error);
      }
    }, 60 * 60 * 1000);

    // Check for immediate payouts every 5 minutes
    setInterval(async () => {
      try {
        await this.processImmediatePayouts().catch(console.error);
      } catch (error) {
        console.error('Immediate payout processing error:', error);
      }
    }, 5 * 60 * 1000);
  }

  /**
   * Start payout monitoring
   */
  private startPayoutMonitoring(): void {
    // Monitor for failed payouts every 30 minutes
    setInterval(async () => {
      try {
        await this.handlePayoutFailures().catch(console.error);
      } catch (error) {
        console.error('Payout failure monitoring error:', error);
      }
    }, 30 * 60 * 1000);

    // Send daily payout summaries
    setInterval(async () => {
      try {
        await this.sendDailyPayoutSummary().catch(console.error);
      } catch (error) {
        console.error('Daily payout summary error:', error);
      }
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Process Stripe payout
   */
  private async processStripePayout(payout: VendorPayout): Promise<PayoutResult> {
    try {
      const vendor = await this.getVendor(payout.vendorId);
      if (!vendor.stripeAccountId) {
        throw new Error('Vendor has no Stripe account');
      }

      const transfer = await stripeClient.transfers.create({
        amount: Math.round(payout.amount * 100), // Convert to cents
        currency: payout.currency.toLowerCase(),
        destination: vendor.stripeAccountId,
        transfer_group: `payout_${payout.id}`,
        metadata: {
          payoutId: payout.id,
          vendorId: payout.vendorId,
          transactionCount: payout.transactions.length
        }
      });

      return {
        success: true,
        externalId: transfer.id,
        reference: transfer.id
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process bank transfer payout
   */
  private async processBankTransferPayout(payout: VendorPayout): Promise<PayoutResult> {
    // Implementation would integrate with bank transfer API (e.g., Plaid, Wise)
    return {
      success: true,
      externalId: `bt_${Date.now()}`,
      reference: `Bank Transfer ${payout.id}`
    };
  }

  /**
   * Process PayPal payout
   */
  private async processPayPalPayout(payout: VendorPayout): Promise<PayoutResult> {
    // Implementation would integrate with PayPal Payouts API
    return {
      success: true,
      externalId: `pp_${Date.now()}`,
      reference: `PayPal Payout ${payout.id}`
    };
  }

  /**
   * Process check payout
   */
  private async processCheckPayout(payout: VendorPayout): Promise<PayoutResult> {
    // Implementation would handle check printing and mailing
    return {
      success: true,
      externalId: `check_${Date.now()}`,
      reference: `Check #${Date.now()}`
    };
  }

  // Helper methods
  private generateScheduleId(): string {
    return `schedule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generatePayoutId(): string {
    return `payout_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private calculateNextPayoutDate(config: PayoutScheduleConfig): Date {
    const now = new Date();
    const nextDate = new Date(now);

    switch (config.frequency) {
      case 'daily':
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case 'weekly':
        const daysUntilNext = (config.dayOfWeek! + 7 - now.getDay()) % 7 || 7;
        nextDate.setDate(nextDate.getDate() + daysUntilNext);
        break;
      case 'biweekly':
        nextDate.setDate(nextDate.getDate() + 14);
        break;
      case 'monthly':
        nextDate.setMonth(nextDate.getMonth() + 1);
        if (config.dayOfMonth) {
          nextDate.setDate(Math.min(config.dayOfMonth, this.getDaysInMonth(nextDate)));
        }
        break;
      case 'quarterly':
        nextDate.setMonth(nextDate.getMonth() + 3);
        break;
    }

    return nextDate;
  }

  private getDaysInMonth(date: Date): number {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  }

  private async loadPayoutSchedules(): Promise<void> {
    // Implementation would load schedules from database
  }

  private async loadPayoutMethods(): Promise<void> {
    // Implementation would load payout methods from database
  }

  private async loadPendingPayouts(): Promise<void> {
    // Implementation would load pending payouts from database
  }

  private async getVendorSchedule(vendorId: string): Promise<PayoutSchedule | null> {
    // Implementation would get vendor's schedule
    return null;
  }

  private async calculateAvailableFunds(vendorId: string, schedule: PayoutSchedule): Promise<any> {
    // Implementation would calculate available funds from unpaid transactions
    return {
      total: 1000,
      transactions: []
    };
  }

  private calculatePayoutAmount(availableFunds: number, schedule: PayoutSchedule): number {
    let amount = availableFunds;

    // Apply maximum limit if set
    if (schedule.maximumAmount && amount > schedule.maximumAmount) {
      amount = schedule.maximumAmount;
    }

    return amount;
  }

  private calculatePayoutFees(amount: number, schedule: PayoutSchedule): any {
    const processingFee = amount * (schedule.fees.processing / 100);
    const transferFee = schedule.fees.transfer;

    return {
      processing: processingFee,
      transfer: transferFee,
      total: processingFee + transferFee
    };
  }

  private async getVendor(vendorId: string): Promise<any> {
    // Implementation would get vendor details
    return { stripeAccountId: 'acct_test' };
  }

  private async markTransactionsAsPaid(transactions: PayoutTransaction[]): Promise<void> {
    // Implementation would mark transactions as paid
  }

  private async sendPayoutSuccessNotification(payout: VendorPayout): Promise<void> {
    // Implementation would send success notification to vendor
  }

  private async sendPayoutFailureNotification(payout: VendorPayout): Promise<void> {
    // Implementation would send failure notification
  }

  private async getDuePayouts(): Promise<VendorPayout[]> {
    // Implementation would get due payouts
    return [];
  }

  private async updateScheduleNextDates(payouts: VendorPayout[]): Promise<void> {
    // Implementation would update next payout dates
  }

  private async sendBatchNotification(batch: PayoutBatch): Promise<void> {
    // Implementation would send batch summary notification
  }

  private async processImmediatePayouts(): Promise<void> {
    // Implementation would process immediate payouts
  }

  private calculateSuccessRate(payouts: VendorPayout[]): number {
    if (payouts.length === 0) return 0;
    const successful = payouts.filter(p => p.status === 'completed').length;
    return (successful / payouts.length) * 100;
  }

  private calculateAverageProcessingTime(payouts: VendorPayout[]): number {
    const completedPayouts = payouts.filter(p => p.status === 'completed' && p.processedAt && p.completedAt);
    if (completedPayouts.length === 0) return 0;

    const totalProcessingTime = completedPayouts.reduce((sum, p) => {
      return sum + (p.completedAt!.getTime() - p.processedAt!.getTime());
    }, 0);

    return totalProcessingTime / completedPayouts.length / (1000 * 60); // Minutes
  }

  private getPayoutBreakdown(payouts: VendorPayout[]): any {
    // Implementation would create breakdown by method, status, etc.
    return {};
  }

  private async calculatePayoutTrends(filters: PayoutFilters): Promise<any> {
    // Implementation would calculate trends
    return {};
  }

  private async getNextScheduledPayouts(vendorId?: string): Promise<any[]> {
    // Implementation would get next scheduled payouts
    return [];
  }

  private async getVendorPayoutMetrics(vendorId: string, startDate: Date, endDate: Date): Promise<any> {
    // Implementation would get vendor-specific metrics
    return {};
  }

  private async getPayouts(filters: PayoutFilters): Promise<VendorPayout[]> {
    // Implementation would get filtered payouts
    return [];
  }

  private async getRecentPayouts(vendorId: string, limit: number): Promise<VendorPayout[]> {
    // Implementation would get recent payouts
    return [];
  }

  private async getNextPayout(vendorId: string): Promise<VendorPayout | null> {
    // Implementation would get next scheduled payout
    return null;
  }

  private async getMonthToDateTotals(vendorId: string): Promise<any> {
    // Implementation would calculate month-to-date totals
    return { amount: 0, count: 0 };
  }

  private async getYearToDateTotals(vendorId: string): Promise<any> {
    // Implementation would calculate year-to-date totals
    return { amount: 0, count: 0 };
  }

  private async getRetryableFailedPayouts(): Promise<VendorPayout[]> {
    // Implementation would get failed payouts eligible for retry
    return [];
  }

  private async analyzePayoutFailure(payout: VendorPayout): Promise<FailureAnalysis> {
    // Implementation would analyze payout failure
    return {
      reason: payout.failureReason || 'unknown',
      category: 'temporary',
      retryable: payout.retryCount < 3,
      recommendedAction: 'retry'
    };
  }

  private async resolvePayoutFailure(payout: VendorPayout, analysis: FailureAnalysis): Promise<FailureResolution> {
    // Implementation would attempt to resolve failure
    return {
      payoutId: payout.id,
      resolved: true,
      resolutionType: 'retry',
      message: 'Payout retry scheduled'
    };
  }

  private async schedulePayoutRetry(payout: VendorPayout): Promise<void> {
    // Implementation would schedule payout retry
    const retryDate = new Date(Date.now() + 60 * 60 * 1000); // Retry in 1 hour
    payout.scheduledFor = retryDate;
  }

  private async sendDailyPayoutSummary(): Promise<void> {
    // Implementation would send daily summary to finance team
  }
}

// Type definitions
interface PayoutScheduleConfig {
  vendorId: string;
  frequency: 'daily' | 'weekly' | 'biweekly' | 'monthly' | 'quarterly';
  dayOfWeek?: number; // 0-6 for weekly
  dayOfMonth?: number; // 1-31 for monthly
  minimumAmount: number;
  maximumAmount?: number;
  currency: string;
  method: PayoutMethod['type'];
  fees?: {
    processing: number; // percentage
    transfer: number; // fixed amount
  };
  autoProcess?: boolean;
  notifications?: boolean;
}

interface PayoutOptions {
  immediate?: boolean;
}

interface PayoutResult {
  success: boolean;
  externalId?: string;
  reference?: string;
  error?: string;
}

interface PayoutFilters {
  startDate: Date;
  endDate: Date;
  vendorId?: string;
  status?: string;
  method?: string;
}

interface VendorPayoutSummary {
  vendorId: string;
  currentBalance: number;
  pendingTransactions: number;
  lastPayout: VendorPayout | null;
  nextPayout: VendorPayout | null;
  schedule: PayoutSchedule | null;
  payoutMethod: string;
  monthToDate: any;
  yearToDate: any;
  averagePayoutAmount: number;
}

interface FailureAnalysis {
  reason: string;
  category: 'temporary' | 'permanent' | 'insufficient_funds';
  retryable: boolean;
  recommendedAction: string;
}

interface FailureResolution {
  payoutId: string;
  resolved: boolean;
  resolutionType: 'retry' | 'manual_intervention' | 'cancelled';
  message: string;
}

export const payoutAutomationService = new PayoutAutomationService();