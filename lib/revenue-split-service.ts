import { auditLogger } from './audit-logger';
import { stripeClient } from './stripe-client';
import { currencyService } from './currency-service';
import { notificationService } from './notification-service';
import type {
  Vendor,
  RevenueSplit,
  SplitRule,
  Transaction,
  Payout,
  SplitCalculation
} from '@/types';

export class RevenueSplitService {
  private vendors = new Map<string, Vendor>();
  private splitRules = new Map<string, SplitRule>();
  private pendingSplits = new Map<string, PendingSplit>();

  /**
   * Initialize revenue split management
   */
  async initialize(): Promise<void> {
    await this.loadVendors();
    await this.loadSplitRules();
    await this.initializeStripeConnect();
    this.startPayoutProcessing();

    console.log('Revenue split service initialized');
  }

  /**
   * Register new vendor for revenue splits
   */
  async registerVendor(vendorData: VendorRegistrationData): Promise<Vendor> {
    try {
      // Create Stripe Connect account
      const stripeAccount = await this.createStripeConnectAccount(vendorData);

      const vendor: Vendor = {
        id: this.generateVendorId(),
        name: vendorData.name,
        email: vendorData.email,
        type: vendorData.type,
        stripeAccountId: stripeAccount.id,
        status: 'pending',
        splitRules: [],
        payoutSchedule: vendorData.payoutSchedule || 'weekly',
        minimumPayoutAmount: vendorData.minimumPayoutAmount || 10,
        currency: vendorData.currency || 'USD',
        taxInfo: vendorData.taxInfo,
        bankingInfo: vendorData.bankingInfo,
        createdAt: new Date(),
        verifiedAt: null
      };

      // Save vendor to database
      await this.saveVendor(vendor);
      this.vendors.set(vendor.id, vendor);

      // Send onboarding email
      await this.sendVendorOnboardingEmail(vendor);

      await auditLogger.logRevenueEvent('vendor_registered', {
        vendorId: vendor.id,
        vendorName: vendor.name,
        type: vendor.type,
        stripeAccountId: stripeAccount.id
      });

      return vendor;

    } catch (error) {
      console.error('Vendor registration failed:', error);
      throw new Error(`Vendor registration failed: ${error.message}`);
    }
  }

  /**
   * Create revenue split for transaction
   */
  async createRevenueSplit(transaction: Transaction): Promise<SplitCalculation> {
    try {
      // Get applicable split rules
      const applicableRules = await this.getApplicableSplitRules(transaction);

      if (applicableRules.length === 0) {
        throw new Error('No split rules found for this transaction');
      }

      // Calculate splits
      const splitCalculation = await this.calculateSplits(transaction, applicableRules);

      // Create pending splits
      for (const split of splitCalculation.splits) {
        await this.createPendingSplit(split, transaction);
      }

      // Process immediate splits if applicable
      await this.processImmediateSplits(splitCalculation.splits, transaction);

      await auditLogger.logRevenueEvent('revenue_split_created', {
        transactionId: transaction.id,
        totalAmount: transaction.amount,
        currency: transaction.currency,
        splitCount: splitCalculation.splits.length,
        platformFee: splitCalculation.platformFee
      });

      return splitCalculation;

    } catch (error) {
      console.error('Revenue split creation failed:', error);
      throw new Error(`Revenue split creation failed: ${error.message}`);
    }
  }

  /**
   * Process payment with revenue splits
   */
  async processPaymentWithSplits(paymentData: PaymentData): Promise<PaymentResult> {
    try {
      const splits = await this.calculatePaymentSplits(paymentData);

      // Create payment intent with transfers
      const paymentIntent = await this.createPaymentIntentWithTransfers(paymentData, splits);

      const result: PaymentResult = {
        success: true,
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        splits: splits.splits,
        totalAmount: paymentData.amount,
        currency: paymentData.currency,
        fees: splits.totalFees,
        netAmount: splits.netAmount
      };

      await auditLogger.logRevenueEvent('payment_with_splits_processed', {
        paymentIntentId: paymentIntent.id,
        totalAmount: paymentData.amount,
        splitCount: splits.splits.length,
        totalFees: splits.totalFees
      });

      return result;

    } catch (error) {
      console.error('Payment processing with splits failed:', error);
      throw new Error(`Payment processing failed: ${error.message}`);
    }
  }

  /**
   * Calculate and create scheduled payouts
   */
  async processScheduledPayouts(): Promise<PayoutBatchResult> {
    const results: PayoutBatchResult = {
      totalPayouts: 0,
      successfulPayouts: 0,
      failedPayouts: 0,
      totalAmount: 0,
      payouts: []
    };

    try {
      // Get vendors with pending payouts
      const vendors = await this.getVendorsWithPendingPayouts();

      for (const vendor of vendors) {
        try {
          const payout = await this.createVendorPayout(vendor);
          if (payout) {
            results.payouts.push(payout);
            results.totalPayouts++;
            results.totalAmount += payout.amount;

            if (payout.status === 'completed') {
              results.successfulPayouts++;
            } else {
              results.failedPayouts++;
            }
          }
        } catch (error) {
          console.error(`Failed to create payout for vendor ${vendor.id}:`, error);
          results.failedPayouts++;
        }
      }

      await auditLogger.logRevenueEvent('payout_batch_completed', {
        totalPayouts: results.totalPayouts,
        successfulPayouts: results.successfulPayouts,
        failedPayouts: results.failedPayouts,
        totalAmount: results.totalAmount
      });

      return results;

    } catch (error) {
      console.error('Scheduled payout processing failed:', error);
      throw error;
    }
  }

  /**
   * Get vendor revenue analytics
   */
  async getVendorRevenueAnalytics(
    vendorId: string,
    startDate: Date,
    endDate: Date
  ): Promise<VendorRevenueAnalytics> {
    try {
      const vendor = await this.getVendor(vendorId);
      if (!vendor) {
        throw new Error(`Vendor not found: ${vendorId}`);
      }

      const analytics = await this.calculateVendorAnalytics(vendorId, startDate, endDate);

      return {
        vendorId,
        vendorName: vendor.name,
        period: { startDate, endDate },
        totalRevenue: analytics.totalRevenue,
        totalFees: analytics.totalFees,
        netRevenue: analytics.netRevenue,
        transactionCount: analytics.transactionCount,
        averageTransactionValue: analytics.averageTransactionValue,
        topProducts: analytics.topProducts,
        revenueByMonth: analytics.revenueByMonth,
        payoutHistory: analytics.payoutHistory,
        pendingPayouts: analytics.pendingPayouts,
        performanceMetrics: analytics.performanceMetrics
      };

    } catch (error) {
      console.error('Failed to get vendor analytics:', error);
      throw error;
    }
  }

  /**
   * Update vendor split rules
   */
  async updateSplitRules(vendorId: string, rules: SplitRuleUpdate[]): Promise<void> {
    try {
      const vendor = await this.getVendor(vendorId);
      if (!vendor) {
        throw new Error(`Vendor not found: ${vendorId}`);
      }

      // Validate rules
      await this.validateSplitRules(rules);

      // Update vendor rules
      for (const ruleUpdate of rules) {
        if (ruleUpdate.id) {
          // Update existing rule
          await this.updateSplitRule(ruleUpdate);
        } else {
          // Create new rule
          const rule = await this.createSplitRule(vendorId, ruleUpdate);
          vendor.splitRules.push(rule.id);
        }
      }

      await this.saveVendor(vendor);

      await auditLogger.logRevenueEvent('split_rules_updated', {
        vendorId,
        rulesUpdated: rules.length,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('Failed to update split rules:', error);
      throw error;
    }
  }

  /**
   * Get platform revenue overview
   */
  async getPlatformRevenueOverview(
    startDate: Date,
    endDate: Date
  ): Promise<PlatformRevenueOverview> {
    try {
      const overview = await this.calculatePlatformRevenue(startDate, endDate);

      return {
        period: { startDate, endDate },
        totalGrossRevenue: overview.totalGrossRevenue,
        totalPlatformFees: overview.totalPlatformFees,
        totalNetRevenue: overview.totalNetRevenue,
        transactionMetrics: overview.transactionMetrics,
        vendorMetrics: overview.vendorMetrics,
        topPerformingVendors: overview.topPerformingVendors,
        revenueByCategory: overview.revenueByCategory,
        revenueByCurrency: overview.revenueByCurrency,
        growthMetrics: overview.growthMetrics
      };

    } catch (error) {
      console.error('Failed to get platform revenue overview:', error);
      throw error;
    }
  }

  // Private methods

  /**
   * Initialize Stripe Connect
   */
  private async initializeStripeConnect(): Promise<void> {
    // Implementation would set up Stripe Connect webhook endpoints
    console.log('Stripe Connect initialized');
  }

  /**
   * Create Stripe Connect account
   */
  private async createStripeConnectAccount(vendorData: VendorRegistrationData): Promise<any> {
    try {
      const account = await stripeClient.accounts.create({
        type: 'express',
        country: vendorData.country || 'US',
        email: vendorData.email,
        business_type: 'individual',
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true }
        },
        business_profile: {
          name: vendorData.name,
          url: vendorData.website
        }
      });

      // Create account link for onboarding
      const accountLink = await stripeClient.accountLinks.create({
        account: account.id,
        refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/reconnect`,
        return_url: `${process.env.NEXT_PUBLIC_APP_URL}/vendor/connected`,
        type: 'account_onboarding'
      });

      return {
        ...account,
        onboardingUrl: accountLink.url
      };

    } catch (error) {
      console.error('Failed to create Stripe Connect account:', error);
      throw error;
    }
  }

  /**
   * Load vendors from database
   */
  private async loadVendors(): Promise<void> {
    // Implementation would load vendors from database
    const mockVendors: Vendor[] = [
      {
        id: 'vendor_1',
        name: 'Tech Supplies Inc',
        email: 'billing@techsupplies.com',
        type: 'supplier',
        stripeAccountId: 'acct_1',
        status: 'active',
        splitRules: [],
        payoutSchedule: 'weekly',
        minimumPayoutAmount: 50,
        currency: 'USD',
        createdAt: new Date()
      }
    ];

    for (const vendor of mockVendors) {
      this.vendors.set(vendor.id, vendor);
    }
  }

  /**
   * Load split rules from database
   */
  private async loadSplitRules(): Promise<void> {
    // Implementation would load split rules from database
  }

  /**
   * Start payout processing scheduler
   */
  private startPayoutProcessing(): void {
    // Process daily payouts at 2 AM UTC
    setInterval(async () => {
      const now = new Date();
      if (now.getUTCHours() === 2 && now.getUTCMinutes() < 5) {
        await this.processScheduledPayouts().catch(console.error);
      }
    }, 60 * 60 * 1000); // Check every hour
  }

  /**
   * Get applicable split rules for transaction
   */
  private async getApplicableSplitRules(transaction: Transaction): Promise<SplitRule[]> {
    // Implementation would find rules based on transaction criteria
    return [];
  }

  /**
   * Calculate revenue splits
   */
  private async calculateSplits(
    transaction: Transaction,
    rules: SplitRule[]
  ): Promise<SplitCalculation> {
    let platformFee = 0;
    const splits: RevenueSplit[] = [];
    let remainingAmount = transaction.amount;

    // Calculate platform fee first
    const platformFeeRate = 0.05; // 5% platform fee
    platformFee = transaction.amount * platformFeeRate;
    remainingAmount -= platformFee;

    // Apply split rules
    for (const rule of rules) {
      if (rule.type === 'percentage') {
        const splitAmount = remainingAmount * (rule.percentage / 100);
        splits.push({
          recipientId: rule.recipientId,
          recipientType: rule.recipientType,
          amount: splitAmount,
          percentage: rule.percentage,
          type: 'revenue_share',
          status: 'pending',
          createdAt: new Date()
        });
      } else if (rule.type === 'fixed') {
        splits.push({
          recipientId: rule.recipientId,
          recipientType: rule.recipientType,
          amount: rule.amount,
          percentage: 0,
          type: 'fixed_fee',
          status: 'pending',
          createdAt: new Date()
        });
        remainingAmount -= rule.amount;
      }
    }

    return {
      transactionId: transaction.id,
      totalAmount: transaction.amount,
      platformFee,
      splits,
      netAmount: remainingAmount,
      currency: transaction.currency
    };
  }

  /**
   * Create pending split
   */
  private async createPendingSplit(split: RevenueSplit, transaction: Transaction): Promise<void> {
    const pendingSplit: PendingSplit = {
      id: this.generateSplitId(),
      splitId: split.id,
      transactionId: transaction.id,
      recipientId: split.recipientId,
      amount: split.amount,
      currency: transaction.currency,
      status: 'pending',
      createdAt: new Date(),
      scheduledFor: this.calculatePayoutDate(split.recipientId)
    };

    this.pendingSplits.set(pendingSplit.id, pendingSplit);
    // Save to database
  }

  /**
   * Process immediate splits
   */
  private async processImmediateSplits(splits: RevenueSplit[], transaction: Transaction): Promise<void> {
    const immediateSplits = splits.filter(s => s.immediate);

    for (const split of immediateSplits) {
      try {
        await this.processSplitPayment(split, transaction);
      } catch (error) {
        console.error(`Failed to process immediate split ${split.id}:`, error);
      }
    }
  }

  /**
   * Calculate payment splits
   */
  private async calculatePaymentSplits(paymentData: PaymentData): Promise<SplitCalculation> {
    // Implementation would calculate splits based on products/vendors in payment
    const mockTransaction: Transaction = {
      id: this.generateTransactionId(),
      amount: paymentData.amount,
      currency: paymentData.currency,
      items: paymentData.items,
      createdAt: new Date()
    };

    const rules = await this.getApplicableSplitRules(mockTransaction);
    return await this.calculateSplits(mockTransaction, rules);
  }

  /**
   * Create payment intent with transfers
   */
  private async createPaymentIntentWithTransfers(
    paymentData: PaymentData,
    splitCalculation: SplitCalculation
  ): Promise<any> {
    const transferData = splitCalculation.splits.map(split => ({
      amount: Math.round(split.amount * 100), // Convert to cents
      destination: this.getVendorStripeAccount(split.recipientId),
      transfer_group: `order_${paymentData.orderId}`
    }));

    return await stripeClient.paymentIntents.create({
      amount: Math.round(paymentData.amount * 100),
      currency: paymentData.currency.toLowerCase(),
      transfer_group: `order_${paymentData.orderId}`,
      payment_method: paymentData.paymentMethodId,
      confirm: true,
      transfer_data: {
        destination: this.getPlatformStripeAccount()
      }
    });
  }

  // Helper methods
  private generateVendorId(): string {
    return `vendor_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSplitId(): string {
    return `split_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateTransactionId(): string {
    return `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async saveVendor(vendor: Vendor): Promise<void> {
    // Implementation would save to database
  }

  private async sendVendorOnboardingEmail(vendor: Vendor): Promise<void> {
    // Implementation would send onboarding email
  }

  private async getVendor(vendorId: string): Promise<Vendor | null> {
    return this.vendors.get(vendorId) || null;
  }

  private async getVendorsWithPendingPayouts(): Promise<Vendor[]> {
    // Implementation would get vendors with pending payouts
    return Array.from(this.vendors.values());
  }

  private async createVendorPayout(vendor: Vendor): Promise<Payout | null> {
    // Implementation would create and process payout
    return null;
  }

  private async calculateVendorAnalytics(vendorId: string, startDate: Date, endDate: Date): Promise<any> {
    // Implementation would calculate vendor analytics
    return {};
  }

  private async validateSplitRules(rules: SplitRuleUpdate[]): Promise<void> {
    // Implementation would validate split rules
  }

  private async updateSplitRule(ruleUpdate: SplitRuleUpdate): Promise<void> {
    // Implementation would update split rule
  }

  private async createSplitRule(vendorId: string, ruleUpdate: SplitRuleUpdate): Promise<SplitRule> {
    // Implementation would create new split rule
    return {} as SplitRule;
  }

  private async calculatePlatformRevenue(startDate: Date, endDate: Date): Promise<any> {
    // Implementation would calculate platform revenue
    return {};
  }

  private calculatePayoutDate(vendorId: string): Date {
    // Implementation would calculate next payout date based on vendor schedule
    const vendor = this.vendors.get(vendorId);
    if (!vendor) return new Date();

    const now = new Date();
    switch (vendor.payoutSchedule) {
      case 'daily':
        return new Date(now.getTime() + 24 * 60 * 60 * 1000);
      case 'weekly':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    }
  }

  private async processSplitPayment(split: RevenueSplit, transaction: Transaction): Promise<void> {
    // Implementation would process immediate split payment
  }

  private getVendorStripeAccount(vendorId: string): string {
    const vendor = this.vendors.get(vendorId);
    return vendor?.stripeAccountId || '';
  }

  private getPlatformStripeAccount(): string {
    return process.env.STRIPE_PLATFORM_ACCOUNT || '';
  }
}

// Type definitions
interface VendorRegistrationData {
  name: string;
  email: string;
  type: 'supplier' | 'affiliate' | 'partner';
  country?: string;
  website?: string;
  payoutSchedule?: 'daily' | 'weekly' | 'monthly';
  minimumPayoutAmount?: number;
  currency?: string;
  taxInfo?: any;
  bankingInfo?: any;
}

interface PaymentData {
  orderId: string;
  amount: number;
  currency: string;
  paymentMethodId: string;
  items: Array<{
    productId: string;
    vendorId: string;
    amount: number;
  }>;
}

interface PaymentResult {
  success: boolean;
  paymentIntentId: string;
  clientSecret?: string;
  splits: RevenueSplit[];
  totalAmount: number;
  currency: string;
  fees: number;
  netAmount: number;
}

interface PendingSplit {
  id: string;
  splitId: string;
  transactionId: string;
  recipientId: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  scheduledFor: Date;
}

interface PayoutBatchResult {
  totalPayouts: number;
  successfulPayouts: number;
  failedPayouts: number;
  totalAmount: number;
  payouts: Payout[];
}

interface VendorRevenueAnalytics {
  vendorId: string;
  vendorName: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalRevenue: number;
  totalFees: number;
  netRevenue: number;
  transactionCount: number;
  averageTransactionValue: number;
  topProducts: Array<{
    productId: string;
    productName: string;
    revenue: number;
    units: number;
  }>;
  revenueByMonth: Array<{
    month: string;
    revenue: number;
    transactions: number;
  }>;
  payoutHistory: Payout[];
  pendingPayouts: PendingSplit[];
  performanceMetrics: {
    growthRate: number;
    retentionRate: number;
    averageRating: number;
  };
}

interface PlatformRevenueOverview {
  period: {
    startDate: Date;
    endDate: Date;
  };
  totalGrossRevenue: number;
  totalPlatformFees: number;
  totalNetRevenue: number;
  transactionMetrics: {
    totalTransactions: number;
    averageTransactionValue: number;
    conversionRate: number;
  };
  vendorMetrics: {
    totalVendors: number;
    activeVendors: number;
    averageVendorRevenue: number;
  };
  topPerformingVendors: Array<{
    vendorId: string;
    vendorName: string;
    revenue: number;
    growth: number;
  }>;
  revenueByCategory: Array<{
    category: string;
    revenue: number;
    percentage: number;
  }>;
  revenueByCurrency: Array<{
    currency: string;
    revenue: number;
    percentage: number;
  }>;
  growthMetrics: {
    revenueGrowth: number;
    transactionGrowth: number;
    vendorGrowth: number;
  };
}

export const revenueSplitService = new RevenueSplitService();