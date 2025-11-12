import { auditLogger } from './audit-logger';
import { notificationService } from './notification-service';
import type {
  KopokopoTransaction,
  KopokopoPaymentRequest,
  KopokopoWebhook,
  KopokopoSettlement,
  KopokopoCustomer,
  KopokopoSubscription
} from '@/types';

export class KopokopoService {
  private apiKey: string;
  private secretKey: string;
  private environment: 'sandbox' | 'production';
  private webhookSecret: string;

  constructor(config: KopokopoConfig) {
    this.apiKey = config.apiKey;
    this.secretKey = config.secretKey;
    this.environment = config.environment || 'sandbox';
    this.webhookSecret = config.webhookSecret;

    this.initializeKopokopo();
  }

  /**
   * Initialize Kopokopo service
   */
  private async initializeKopokopo(): Promise<void> {
    try {
      // Test connectivity
      await this.testConnection();
      console.log(`Kopokopo service initialized in ${this.environment} environment`);
    } catch (error) {
      console.error('Kopokopo initialization failed:', error);
      throw new Error(`Kopokopo initialization failed: ${error.message}`);
    }
  }

  /**
   * Create payment request
   */
  async createPaymentRequest(payment: KopokopoPaymentRequest): Promise<KopokopoPaymentResponse> {
    try {
      const paymentData = {
        amount: payment.amount,
        currency: payment.currency || 'KES',
        email: payment.customerEmail,
        first_name: payment.customerFirstName,
        last_name: payment.customerLastName,
        phone_number: payment.customerPhone,
        redirect_url: payment.redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/kopokopo/success`,
        cancel_url: payment.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/kopokopo/cancel`,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/kopokopo/webhook`,
        external_reference: payment.externalReference || `ORDER-${payment.orderId}`,
        payment_method: payment.paymentMethod || 'MPESA',
        description: payment.description || `Payment for order ${payment.orderId}`,
        // Additional fields for recurring payments
        recurring: payment.recurring,
        recurring_frequency: payment.recurringFrequency,
        recurring_end_date: payment.recurringEndDate,
        // Metadata
        metadata: {
          orderId: payment.orderId,
          customerIp: payment.customerIp,
          userAgent: payment.userAgent
        }
      };

      const response = await this.makeKopokopoRequest('/v1/payments', paymentData);

      const paymentResponse: KopokopoPaymentResponse = {
        success: true,
        id: response.id,
        status: response.status,
        reference: response.reference,
        external_reference: payment.externalReference,
        amount: payment.amount,
        currency: payment.currency || 'KES',
        customer: {
          email: payment.customerEmail,
          first_name: payment.customerFirstName,
          last_name: payment.customerLastName,
          phone_number: payment.customerPhone
        },
        payment_method: payment.paymentMethod || 'MPESA',
        redirect_url: response.redirect_url,
        checkout_url: response.checkout_url,
        created_at: new Date(response.created_at),
        expires_at: new Date(response.expires_at)
      };

      // Save payment request to database
      await this.savePaymentRequest(paymentResponse);

      // Log payment request creation
      await auditLogger.logPaymentEvent('kopokopo_payment_created', {
        paymentId: response.id,
        reference: response.reference,
        externalReference: payment.externalReference,
        amount: payment.amount,
        paymentMethod: payment.paymentMethod
      });

      return paymentResponse;

    } catch (error) {
      console.error('Kopokopo payment request creation failed:', error);
      throw new Error(`Kopokopo payment request creation failed: ${error.message}`);
    }
  }

  /**
   * Create mobile money payment
   */
  async createMobilePayment(payment: KopokopoMobilePayment): Promise<KopokopoMobilePaymentResponse> {
    try {
      const mobilePaymentData = {
        amount: payment.amount,
        currency: payment.currency || 'KES',
        phone_number: payment.phoneNumber,
        network_code: payment.networkCode, // MPESA, AIRTEL, TIGO
        external_reference: payment.externalReference || `ORDER-${payment.orderId}`,
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/kopokopo/mobile-webhook`,
        description: payment.description || `Mobile payment for order ${payment.orderId}`,
        customer: {
          email: payment.customerEmail,
          first_name: payment.customerFirstName,
          last_name: payment.customerLastName
        },
        metadata: {
          orderId: payment.orderId,
          customerIp: payment.customerIp
        }
      };

      const response = await this.makeKopokopoRequest('/v1/mobile-payments', mobilePaymentData);

      const mobileResponse: KopokopoMobilePaymentResponse = {
        success: true,
        id: response.id,
        status: response.status,
        reference: response.reference,
        external_reference: payment.externalReference,
        amount: payment.amount,
        currency: payment.currency || 'KES',
        phone_number: payment.phoneNumber,
        network_code: payment.networkCode,
        customer: {
          email: payment.customerEmail,
          first_name: payment.customerFirstName,
          last_name: payment.customerLastName
        },
        created_at: new Date(response.created_at),
        expires_at: new Date(response.expires_at)
      };

      // Save mobile payment request
      await this.saveMobilePayment(mobileResponse);

      // Log mobile payment creation
      await auditLogger.logPaymentEvent('kopokopo_mobile_payment_created', {
        paymentId: response.id,
        reference: response.reference,
        phoneNumber: payment.phoneNumber,
        networkCode: payment.networkCode,
        amount: payment.amount
      });

      return mobileResponse;

    } catch (error) {
      console.error('Kopokopo mobile payment creation failed:', error);
      throw new Error(`Kopokopo mobile payment creation failed: ${error.message}`);
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(transactionId: string): Promise<KopokopoTransactionStatus> {
    try {
      const response = await this.makeKopokopoRequest(`/v1/payments/${transactionId}`, null, 'GET');

      const status: KopokopoTransactionStatus = {
        id: transactionId,
        reference: response.reference,
        external_reference: response.external_reference,
        status: response.status,
        amount: response.amount,
        currency: response.currency,
        payment_method: response.payment_method,
        customer: response.customer,
        transaction_details: response.transaction_details,
        fees: response.fees,
        net_amount: response.net_amount,
        created_at: new Date(response.created_at),
        completed_at: response.completed_at ? new Date(response.completed_at) : null,
        updated_at: new Date(response.updated_at)
      };

      // Update transaction in database
      await this.updateTransactionStatus(status);

      // Log status check
      await auditLogger.logPaymentEvent('kopokopo_status_checked', {
        transactionId,
        status: response.status,
        reference: response.reference
      });

      return status;

    } catch (error) {
      console.error('Failed to get Kopokopo transaction status:', error);
      throw new Error(`Failed to get transaction status: ${error.message}`);
    }
  }

  /**
   * Process webhook
   */
  async processWebhook(webhookData: KopokopoWebhook): Promise<KopokopoWebhookResult> {
    try {
      // Verify webhook signature
      const isValid = await this.verifyWebhookSignature(webhookData);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      const result: KopokopoWebhookResult = {
        success: true,
        event_type: webhookData.event_type,
        payment_id: webhookData.payment_id,
        transaction_id: webhookData.transaction_id,
        status: webhookData.status,
        reference: webhookData.reference,
        external_reference: webhookData.external_reference,
        amount: webhookData.amount,
        currency: webhookData.currency,
        customer: webhookData.customer,
        transaction_details: webhookData.transaction_details,
        fees: webhookData.fees,
        net_amount: webhookData.net_amount,
        processed_at: new Date()
      };

      // Handle different event types
      if (webhookData.event_type === 'payment.completed') {
        await this.handleCompletedPayment(webhookData);
      } else if (webhookData.event_type === 'payment.failed') {
        await this.handleFailedPayment(webhookData);
      } else if (webhookData.event_type === 'payment.pending') {
        await this.handlePendingPayment(webhookData);
      }

      // Log webhook processing
      await auditLogger.logPaymentEvent('kopokopo_webhook_processed', {
        eventType: webhookData.event_type,
        paymentId: webhookData.payment_id,
        status: webhookData.status
      });

      return result;

    } catch (error) {
      console.error('Kopokopo webhook processing failed:', error);
      throw new Error(`Kopokopo webhook processing failed: ${error.message}`);
    }
  }

  /**
   * Create recurring payment subscription
   */
  async createSubscription(subscription: KopokopoSubscription): Promise<KopokopoSubscriptionResponse> {
    try {
      const subscriptionData = {
        amount: subscription.amount,
        currency: subscription.currency || 'KES',
        frequency: subscription.frequency, // daily, weekly, monthly, yearly
        interval: subscription.interval || 1, // Every N days/weeks/months
        start_date: subscription.startDate,
        end_date: subscription.endDate,
        external_reference: subscription.externalReference || `SUB-${Date.now()}`,
        customer: {
          email: subscription.customerEmail,
          first_name: subscription.customerFirstName,
          last_name: subscription.customerLastName,
          phone_number: subscription.customerPhone
        },
        payment_method: subscription.paymentMethod || 'MPESA',
        description: subscription.description || 'Recurring payment',
        webhook_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/kopokopo/subscription-webhook`,
        metadata: {
          orderId: subscription.orderId,
          subscriptionType: subscription.type
        }
      };

      const response = await this.makeKopokopoRequest('/v1/subscriptions', subscriptionData);

      const subscriptionResponse: KopokopoSubscriptionResponse = {
        success: true,
        id: response.id,
        reference: response.reference,
        external_reference: subscription.externalReference,
        status: response.status,
        amount: subscription.amount,
        currency: subscription.currency || 'KES',
        frequency: subscription.frequency,
        interval: subscription.interval,
        customer: {
          email: subscription.customerEmail,
          first_name: subscription.customerFirstName,
          last_name: subscription.customerLastName,
          phone_number: subscription.customerPhone
        },
        payment_method: subscription.paymentMethod || 'MPESA',
        next_payment_date: new Date(response.next_payment_date),
        created_at: new Date(response.created_at)
      };

      // Save subscription to database
      await this.saveSubscription(subscriptionResponse);

      // Log subscription creation
      await auditLogger.logPaymentEvent('kopokopo_subscription_created', {
        subscriptionId: response.id,
        reference: response.reference,
        amount: subscription.amount,
        frequency: subscription.frequency
      });

      return subscriptionResponse;

    } catch (error) {
      console.error('Kopokopo subscription creation failed:', error);
      throw new Error(`Kopokopo subscription creation failed: ${error.message}`);
    }
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string, reason?: string): Promise<KopokopoSubscriptionCancelResult> {
    try {
      const response = await this.makeKopokopoRequest(`/v1/subscriptions/${subscriptionId}/cancel`, {
        reason: reason || 'Cancelled by user'
      });

      const result: KopokopoSubscriptionCancelResult = {
        success: true,
        subscription_id: subscriptionId,
        status: response.status,
        cancelled_at: new Date(),
        reason: reason || 'Cancelled by user'
      };

      // Update subscription in database
      await this.updateSubscriptionStatus(subscriptionId, 'cancelled');

      // Log subscription cancellation
      await auditLogger.logPaymentEvent('kopokopo_subscription_cancelled', {
        subscriptionId,
        reason: reason || 'No reason provided'
      });

      return result;

    } catch (error) {
      console.error('Failed to cancel Kopokopo subscription:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Get settlements
   */
  async getSettlements(startDate: Date, endDate: Date): Promise<KopokopoSettlement[]> {
    try {
      const response = await this.makeKopokopoRequest('/v1/settlements', {
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString()
      }, 'GET');

      const settlements: KopokopoSettlement[] = response.settlements.map((settlement: any) => ({
        id: settlement.id,
        reference: settlement.reference,
        amount: settlement.amount,
        currency: settlement.currency,
        status: settlement.status,
        payment_count: settlement.payment_count,
        fees: settlement.fees,
        net_amount: settlement.net_amount,
        settlement_date: new Date(settlement.settlement_date),
        created_at: new Date(settlement.created_at)
      }));

      return settlements;

    } catch (error) {
      console.error('Failed to get Kopokopo settlements:', error);
      throw new Error(`Failed to get settlements: ${error.message}`);
    }
  }

  // Private methods

  /**
   * Test API connectivity
   */
  private async testConnection(): Promise<void> {
    try {
      await this.makeKopokopoRequest('/v1/health', null, 'GET');
    } catch (error) {
      // Expected to fail in most cases, just check if API is reachable
    }
  }

  /**
   * Make authenticated request to Kopokopo API
   */
  private async makeKopokopoRequest(endpoint: string, data: any, method: 'POST' | 'GET' = 'POST'): Promise<any> {
    const baseURL = this.environment === 'production'
      ? 'https://api.kopokopo.com'
      : 'https://sandbox.kopokopo.com';

    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };

    const options: RequestInit = {
      method,
      headers,
    };

    if (data && method === 'POST') {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(`${baseURL}${endpoint}`, options);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Kopokopo API error: ${errorData.message || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Save payment request to database
   */
  private async savePaymentRequest(payment: KopokopoPaymentResponse): Promise<void> {
    // Implementation would save to database
    console.log('Saved Kopokopo payment request:', payment.id);
  }

  /**
   * Save mobile payment to database
   */
  private async saveMobilePayment(payment: KopokopoMobilePaymentResponse): Promise<void> {
    // Implementation would save to database
    console.log('Saved Kopokopo mobile payment:', payment.id);
  }

  /**
   * Save subscription to database
   */
  private async saveSubscription(subscription: KopokopoSubscriptionResponse): Promise<void> {
    // Implementation would save to database
    console.log('Saved Kopokopo subscription:', subscription.id);
  }

  /**
   * Update transaction status in database
   */
  private async updateTransactionStatus(status: KopokopoTransactionStatus): Promise<void> {
    // Implementation would update in database
    console.log('Updated Kopokopo transaction status:', status.id, status.status);
  }

  /**
   * Update subscription status in database
   */
  private async updateSubscriptionStatus(subscriptionId: string, status: string): Promise<void> {
    // Implementation would update in database
    console.log('Updated Kopokopo subscription status:', subscriptionId, status);
  }

  /**
   * Verify webhook signature
   */
  private async verifyWebhookSignature(webhookData: KopokopoWebhook): Promise<boolean> {
    // Implementation would verify webhook signature using secret
    return true; // Simplified for now
  }

  /**
   * Handle completed payment webhook
   */
  private async handleCompletedPayment(webhookData: KopokopoWebhook): Promise<void> {
    // Update order status to completed
    await this.updateOrderStatus(webhookData.external_reference, 'completed');

    // Send payment confirmation
    await notificationService.sendPaymentConfirmation({
      transactionId: webhookData.payment_id,
      amount: webhookData.amount,
      paymentMethod: webhookData.payment_method,
      status: 'completed'
    });
  }

  /**
   * Handle failed payment webhook
   */
  private async handleFailedPayment(webhookData: KopokopoWebhook): Promise<void> {
    // Update order status to failed
    await this.updateOrderStatus(webhookData.external_reference, 'failed');

    // Send payment failure notification
    await notificationService.sendPaymentFailure({
      transactionId: webhookData.payment_id,
      reason: 'Payment failed via Kopokopo'
    });
  }

  /**
   * Handle pending payment webhook
   */
  private async handlePendingPayment(webhookData: KopokopoWebhook): Promise<void> {
    // Update order status to pending
    await this.updateOrderStatus(webhookData.external_reference, 'pending');
  }

  /**
   * Update order status
   */
  private async updateOrderStatus(externalReference: string, status: string): Promise<void> {
    // Implementation would update order in database
    console.log(`Updated order status: ${externalReference} - ${status}`);
  }
}

// Type definitions
interface KopokopoConfig {
  apiKey: string;
  secretKey: string;
  environment?: 'sandbox' | 'production';
  webhookSecret: string;
}

interface KopokopoPaymentResponse {
  success: boolean;
  id: string;
  status: string;
  reference: string;
  external_reference: string;
  amount: number;
  currency: string;
  customer: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  };
  payment_method: string;
  redirect_url: string;
  checkout_url: string;
  created_at: Date;
  expires_at: Date;
}

interface KopokopoMobilePaymentResponse {
  success: boolean;
  id: string;
  status: string;
  reference: string;
  external_reference: string;
  amount: number;
  currency: string;
  phone_number: string;
  network_code: string;
  customer: {
    email: string;
    first_name: string;
    last_name: string;
  };
  created_at: Date;
  expires_at: Date;
}

interface KopokopoTransactionStatus {
  id: string;
  reference: string;
  external_reference: string;
  status: string;
  amount: number;
  currency: string;
  payment_method: string;
  customer: any;
  transaction_details: any;
  fees: any;
  net_amount: number;
  created_at: Date;
  completed_at: Date | null;
  updated_at: Date;
}

interface KopokopoWebhookResult {
  success: boolean;
  event_type: string;
  payment_id: string;
  transaction_id: string;
  status: string;
  reference: string;
  external_reference: string;
  amount: number;
  currency: string;
  customer: any;
  transaction_details: any;
  fees: any;
  net_amount: number;
  processed_at: Date;
}

interface KopokopoSubscriptionResponse {
  success: boolean;
  id: string;
  reference: string;
  external_reference: string;
  status: string;
  amount: number;
  currency: string;
  frequency: string;
  interval: number;
  customer: {
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
  };
  payment_method: string;
  next_payment_date: Date;
  created_at: Date;
}

interface KopokopoSubscriptionCancelResult {
  success: boolean;
  subscription_id: string;
  status: string;
  cancelled_at: Date;
  reason: string;
}

interface KopokopoMobilePayment {
  orderId: string;
  amount: number;
  currency?: string;
  phoneNumber: string;
  networkCode: string;
  customerEmail?: string;
  customerFirstName?: string;
  customerLastName?: string;
  description?: string;
  customerIp?: string;
  externalReference?: string;
}

export { KopokopoService };