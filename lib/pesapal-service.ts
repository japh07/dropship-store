import { auditLogger } from './audit-logger';
import { notificationService } from './notification-service';
import { encryptionUtils } from './encryption';
import type {
  PesapalTransaction,
  PesapalPaymentRequest,
  PesapalIPN,
  PesapalMobilePayment,
  PesapalRefund,
  PesapalMerchantStatus
} from '@/types';

export class PesapalService {
  private consumerKey: string;
  private consumerSecret: string;
  private environment: 'sandbox' | 'production';
  private privateMerchantKey: string;

  constructor(config: PesapalConfig) {
    this.consumerKey = config.consumerKey;
    this.consumerSecret = config.consumerSecret;
    this.environment = config.environment || 'sandbox';
    this.privateMerchantKey = config.privateMerchantKey;

    this.initializePesapal();
  }

  /**
   * Initialize Pesapal service
   */
  private async initializePesapal(): Promise<void> {
    try {
      // Test authentication
      await this.authenticate();
      console.log(`Pesapal service initialized in ${this.environment} environment`);
    } catch (error) {
      console.error('Pesapal initialization failed:', error);
      throw new Error(`Pesapal initialization failed: ${error.message}`);
    }
  }

  /**
   * Initiate payment
   */
  async initiatePayment(payment: PesapalPaymentRequest): Promise<PesapalPaymentResponse> {
    try {
      // Generate unique order tracking ID
      const orderTrackingId = this.generateOrderTrackingId();

      // Prepare payment data
      const paymentData = {
        order_tracking_id: orderTrackingId,
        order_id: payment.orderId,
        order_amount: payment.amount,
        order_currency: payment.currency || 'KES',
        order_description: payment.description || `Payment for order ${payment.orderId}`,
        customer_first_name: payment.customerFirstName || 'Customer',
        customer_last_name: payment.customerLastName || '',
        customer_email: payment.customerEmail || '',
        customer_phone: payment.customerPhone || '',
        redirect_url: payment.redirectUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/pesapal/success`,
        cancel_url: payment.cancelUrl || `${process.env.NEXT_PUBLIC_APP_URL}/payment/pesapal/cancel`,
        notification_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/pesapal/ipn`,
        source: payment.source || 'WEB',
        currency: payment.currency || 'KES',
        // Pesapal 3.0 specific fields
        payment_method: payment.paymentMethod || 'MOBILE_MONEY',
        phone_number: payment.phoneNumber || '',
        network_code: payment.networkCode || '',
        merchant_reference: payment.merchantReference || ''
      };

      // Get access token
      const token = await this.authenticate();

      // Submit order
      const response = await this.makePesapalRequest('/Transact/SubmitOrderRequest', {
        order_details: paymentData
      }, token);

      const paymentResponse: PesapalPaymentResponse = {
        success: response.success,
        order_tracking_id: orderTrackingId,
        merchant_reference: response.merchant_reference,
        order_id: payment.orderId,
        amount: payment.amount,
        currency: payment.currency || 'KES',
        redirect_url: response.redirect_url,
        payment_method: payment.paymentMethod || 'WEB',
        created_at: new Date(),
        expires_at: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes expiry
        status: 'pending'
      };

      // Save transaction to database
      await this.saveTransaction(paymentResponse);

      // Log payment initiation
      await auditLogger.logPaymentEvent('pesapal_payment_initiated', {
        orderId: payment.orderId,
        orderTrackingId,
        amount: payment.amount,
        currency: payment.currency,
        paymentMethod: payment.paymentMethod
      });

      return paymentResponse;

    } catch (error) {
      console.error('Pesapal payment initiation failed:', error);
      throw new Error(`Pesapal payment initiation failed: ${error.message}`);
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(orderTrackingId: string): Promise<PesapalTransactionStatus> {
    try {
      const token = await this.authenticate();

      const response = await this.makePesapalRequest('/Transact/GetOrderStatus', {
        order_tracking_id: orderTrackingId
      }, token);

      const status: PesapalTransactionStatus = {
        order_tracking_id: orderTrackingId,
        status: response.status,
        payment_method: response.payment_method,
        merchant_reference: response.merchant_reference,
        order_amount: response.order_amount,
        order_currency: response.order_currency,
        order_id: response.order_id,
        payment_confirmation_code: response.payment_confirmation_code,
        created_at: new Date(response.created_at),
        completed_at: response.completed_at ? new Date(response.completed_at) : null,
        updated_at: new Date(response.updated_at),
        customer_info: response.customer_info
      };

      // Update transaction in database
      await this.updateTransactionStatus(status);

      // Log status check
      await auditLogger.logPaymentEvent('pesapal_status_checked', {
        orderTrackingId,
        status: response.status,
        paymentConfirmationCode: response.payment_confirmation_code
      });

      return status;

    } catch (error) {
      console.error('Failed to get Pesapal transaction status:', error);
      throw new Error(`Failed to get transaction status: ${error.message}`);
    }
  }

  /**
   * Process IPN (Instant Payment Notification)
   */
  async processIPN(ipnData: PesapalIPN): Promise<PesapalIPNResult> {
    try {
      // Verify IPN signature
      const isValid = await this.verifyIPNSignature(ipnData);
      if (!isValid) {
        throw new Error('Invalid IPN signature');
      }

      const result: PesapalIPNResult = {
        success: true,
        order_tracking_id: ipnData.order_tracking_id,
        merchant_reference: ipnData.merchant_reference,
        order_id: ipnData.order_id,
        status: ipnData.status,
        payment_method: ipnData.payment_method,
        amount: ipnData.amount,
        currency: ipnData.currency,
        payment_confirmation_code: ipnData.payment_confirmation_code,
        customer_info: ipnData.customer_info,
        created_at: new Date(ipnData.created_at),
        processed_at: new Date()
      };

      // Update order status based on IPN
      if (ipnData.status === 'COMPLETED') {
        await this.handleSuccessfulIPN(ipnData);
      } else if (ipnData.status === 'FAILED') {
        await this.handleFailedIPN(ipnData);
      }

      // Log IPN processing
      await auditLogger.logPaymentEvent('pesapal_ipn_processed', {
        orderTrackingId: ipnData.order_tracking_id,
        status: ipnData.status,
        paymentConfirmationCode: ipnData.payment_confirmation_code
      });

      return result;

    } catch (error) {
      console.error('Pesapal IPN processing failed:', error);
      throw new Error(`Pesapal IPN processing failed: ${error.message}`);
    }
  }

  // Private methods

  /**
   * Authenticate with Pesapal API
   */
  private async authenticate(): Promise<string> {
    try {
      const authString = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
      const baseURL = this.environment === 'production'
        ? 'https://www.pesapal.com'
        : 'https://cybqa.pesapal.com';

      const response = await fetch(`${baseURL}/api/AuthenticateRequest`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authString}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to authenticate with Pesapal');
      }

      const data = await response.json();
      return data.token;
    } catch (error) {
      console.error('Pesapal authentication failed:', error);
      throw error;
    }
  }

  /**
   * Make authenticated request to Pesapal API
   */
  private async makePesapalRequest(endpoint: string, data: any, token: string): Promise<any> {
    const baseURL = this.environment === 'production'
      ? 'https://www.pesapal.com'
      : 'https://cybqa.pesapal.com';

    const response = await fetch(`${baseURL}/api${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Pesapal API error: ${errorData.error || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Generate unique order tracking ID
   */
  private generateOrderTrackingId(): string {
    return 'PSPL-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Save transaction to database
   */
  private async saveTransaction(transaction: PesapalPaymentResponse): Promise<void> {
    // Implementation would save to database
    console.log('Saved Pesapal transaction:', transaction.order_tracking_id);
  }

  /**
   * Update transaction status in database
   */
  private async updateTransactionStatus(status: PesapalTransactionStatus): Promise<void> {
    // Implementation would update in database
    console.log('Updated Pesapal transaction status:', status.order_tracking_id, status.status);
  }

  /**
   * Verify IPN signature
   */
  private async verifyIPNSignature(ipnData: PesapalIPN): Promise<boolean> {
    // Implementation would verify IPN signature using private key
    return true; // Simplified for now
  }

  /**
   * Handle successful IPN
   */
  private async handleSuccessfulIPN(ipnData: PesapalIPN): Promise<void> {
    // Update order status to completed
    await this.updateOrderStatus(ipnData.order_id, 'completed');

    // Send payment confirmation
    await notificationService.sendPaymentConfirmation({
      transactionId: ipnData.order_tracking_id,
      amount: ipnData.amount,
      paymentMethod: ipnData.payment_method,
      status: 'completed'
    });
  }

  /**
   * Handle failed IPN
   */
  private async handleFailedIPN(ipnData: PesapalIPN): Promise<void> {
    // Update order status to failed
    await this.updateOrderStatus(ipnData.order_id, 'failed');

    // Send payment failure notification
    await notificationService.sendPaymentFailure({
      transactionId: ipnData.order_tracking_id,
      reason: 'Payment failed via Pesapal'
    });
  }

  /**
   * Update order status
   */
  private async updateOrderStatus(orderId: string, status: string): Promise<void> {
    // Implementation would update order in database
    console.log(`Updated order status: ${orderId} - ${status}`);
  }
}

// Type definitions
interface PesapalConfig {
  consumerKey: string;
  consumerSecret: string;
  environment?: 'sandbox' | 'production';
  privateMerchantKey: string;
}

interface PesapalPaymentResponse {
  success: boolean;
  order_tracking_id: string;
  merchant_reference: string;
  order_id: string;
  amount: number;
  currency: string;
  redirect_url: string;
  payment_method: string;
  created_at: Date;
  expires_at: Date;
  status: string;
}

interface PesapalTransactionStatus {
  order_tracking_id: string;
  status: string;
  payment_method: string;
  merchant_reference: string;
  order_amount: number;
  order_currency: string;
  order_id: string;
  payment_confirmation_code: string;
  created_at: Date;
  completed_at: Date | null;
  updated_at: Date;
  customer_info?: any;
}

interface PesapalIPNResult {
  success: boolean;
  order_tracking_id: string;
  merchant_reference: string;
  order_id: string;
  status: string;
  payment_method: string;
  amount: number;
  currency: string;
  payment_confirmation_code: string;
  customer_info?: any;
  created_at: Date;
  processed_at: Date;
}

export { PesapalService };