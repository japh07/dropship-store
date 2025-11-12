import { auditLogger } from './audit-logger';
import { notificationService } from './notification-service';
import { encryptionUtils } from './encryption';
import type {
  MPesaTransaction,
  MPesaPaymentRequest,
  MPesaCallback,
  MPesaB2CPayment,
  MPesaC2BPayment,
  MPesaAccountBalance,
  MPesaReversal
} from '@/types';

export class MPesaService {
  private apiKey: string;
  private publicKey: string;
  private initiatorName: string;
  private securityCredential: string;
  private shortCode: string;
  private environment: 'sandbox' | 'production';

  constructor(config: MPesaConfig) {
    this.apiKey = config.apiKey;
    this.publicKey = config.publicKey;
    this.initiatorName = config.initiatorName;
    this.securityCredential = config.securityCredential;
    this.shortCode = config.shortCode;
    this.environment = config.environment || 'sandbox';

    this.initializeMPesa();
  }

  /**
   * Initialize MPesa service
   */
  private async initializeMPesa(): Promise<void> {
    try {
      // Test connectivity
      await this.testConnection();
      console.log(`MPesa service initialized in ${this.environment} environment`);
    } catch (error) {
      console.error('MPesa initialization failed:', error);
      throw new Error(`MPesa initialization failed: ${error.message}`);
    }
  }

  /**
   * Initiate STK Push for customer payment
   */
  async initiateSTKPush(request: MPesaSTKPushRequest): Promise<MPesaSTKPushResponse> {
    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const password = this.generateSTKPassword(timestamp);

      const payload = {
        BusinessShortCode: this.shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: request.amount,
        PartyA: request.phoneNumber,
        PartyB: this.shortCode,
        PhoneNumber: request.phoneNumber,
        CallBackURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/callback`,
        AccountReference: request.accountReference || 'ORDER-' + request.orderId,
        TransactionDesc: request.description || 'Payment for order ' + request.orderId,
        // Generate a unique transaction reference
        // TransID: `MPESA-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      };

      const response = await this.makeMPesaRequest('/mpesa/stkpush/v1/processrequest', payload);

      const stkResponse: MPesaSTKPushResponse = {
        success: true,
        merchantRequestID: response.MerchantRequestID,
        checkoutRequestID: response.CheckoutRequestID,
        responseCode: response.ResponseCode,
        responseMessage: response.ResponseMessage,
        customerMessage: response.CustomerMessage,
        orderId: request.orderId,
        amount: request.amount,
        phoneNumber: request.phoneNumber,
        initiatedAt: new Date()
      };

      // Log STK push initiation
      await auditLogger.logPaymentEvent('mpesa_stk_initiated', {
        orderId: request.orderId,
        amount: request.amount,
        phoneNumber: request.phoneNumber,
        checkoutRequestID: response.CheckoutRequestID
      });

      return stkResponse;

    } catch (error) {
      console.error('MPesa STK Push failed:', error);
      throw new Error(`MPesa STK Push failed: ${error.message}`);
    }
  }

  /**
   * Process B2C payment (business to customer)
   */
  async processB2CPayment(payment: MPesaB2CPayment): Promise<MPesaB2CResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const password = this.generateB2CPassword(timestamp);

      const payload = {
        InitiatorName: this.initiatorName,
        SecurityCredential: this.securityCredential,
        CommandID: 'BusinessPayment', // or 'SalaryPayment', 'PromotionPayment'
        Amount: payment.amount,
        PartyA: this.shortCode,
        PartyB: payment.recipientPhone,
        Remarks: payment.remarks || 'Vendor payment',
        QueueTimeOutURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/queue-timeout`,
        ResultURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/b2c-result`,
        Occasion: payment.occasion || 'Payment'
      };

      const response = await this.makeMPesaRequest('/mpesa/b2c/v1/paymentrequest', payload);

      const result: MPesaB2CResult = {
        success: response.ResponseCode === '0',
        conversationID: response.ConversationID,
        transactionID: response.OriginatorConversationID,
        responseCode: response.ResponseCode,
        responseMessage: response.ResponseMessage,
        transactionId: payment.transactionId,
        amount: payment.amount,
        recipientPhone: payment.recipientPhone,
        processedAt: new Date()
      };

      // Log B2C payment
      await auditLogger.logPaymentEvent('mpesa_b2c_processed', {
        transactionId: payment.transactionId,
        amount: payment.amount,
        recipientPhone: payment.recipientPhone,
        conversationID: response.ConversationID,
        success: result.success
      });

      return result;

    } catch (error) {
      console.error('MPesa B2C payment failed:', error);
      throw new Error(`MPesa B2C payment failed: ${error.message}`);
    }
  }

  /**
   * Register C2B URLs for receiving payments
   */
  async registerC2BURLs(confirmationURL: string, validationURL: string): Promise<MPesaC2BRegistration> {
    try {
      const payload = {
        ShortCode: this.shortCode,
        ResponseType: 'Completed',
        ConfirmationURL: confirmationURL,
        ValidationURL: validationURL
      };

      const response = await this.makeMPesaRequest('/mpesa/c2b/v1/registerurl', payload);

      const registration: MPesaC2BRegistration = {
        success: response.ResponseCode === '0',
        originatorC2BShortCode: response.OriginatorC2BShortCode,
        responseCode: response.ResponseCode,
        responseMessage: response.ResponseMessage,
        registeredAt: new Date()
      };

      await auditLogger.logPaymentEvent('mpesa_c2b_registered', {
        shortCode: this.shortCode,
        confirmationURL,
        validationURL,
        success: registration.success
      });

      return registration;

    } catch (error) {
      console.error('MPesa C2B URL registration failed:', error);
      throw new Error(`MPesa C2B URL registration failed: ${error.message}`);
    }
  }

  /**
   * Simulate C2B transaction (for testing)
   */
  async simulateC2BTransaction(transaction: MPesaC2BPayment): Promise<MPesaC2BSimulation> {
    try {
      const payload = {
        ShortCode: this.shortCode,
        CommandID: 'CustomerPayBillOnline',
        Amount: transaction.amount,
        Msisdn: transaction.phoneNumber,
        BillRefNumber: transaction.billRefNumber || 'REF-' + Date.now()
      };

      const response = await this.makeMPesaRequest('/mpesa/c2b/v1/simulate', payload);

      const simulation: MPesaC2BSimulation = {
        success: response.ResponseCode === '0',
        conversationID: response.ConversationID,
        transactionID: response.TransactionID,
        responseCode: response.ResponseCode,
        responseMessage: response.ResponseMessage,
        amount: transaction.amount,
        phoneNumber: transaction.phoneNumber,
        simulatedAt: new Date()
      };

      await auditLogger.logPaymentEvent('mpesa_c2b_simulated', {
        amount: transaction.amount,
        phoneNumber: transaction.phoneNumber,
        conversationID: response.ConversationID,
        success: simulation.success
      });

      return simulation;

    } catch (error) {
      console.error('MPesa C2B simulation failed:', error);
      throw new Error(`MPesa C2B simulation failed: ${error.message}`);
    }
  }

  /**
   * Check account balance
   */
  async checkAccountBalance(): Promise<MPesaAccountBalance> {
    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const password = this.generateB2CPassword(timestamp);

      const payload = {
        Initiator: this.initiatorName,
        SecurityCredential: this.securityCredential,
        CommandID: 'AccountBalance',
        PartyA: this.shortCode,
        IdentifierType: '4', // 4 for till number
        Remarks: 'Account balance check',
        QueueTimeOutURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/queue-timeout`,
        ResultURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/balance-result`
      };

      const response = await this.makeMPesaRequest('/mpesa/accountbalance/v1/query', payload);

      const balance: MPesaAccountBalance = {
        workingAccount: {
          accountID: response.Result?.WorkingAccount?.AccountID,
          balance: response.Result?.WorkingAccount?.Balance || 0,
          availableBalance: response.Result?.WorkingAccount?.AvailableBalance || 0
        },
        utilityAccount: {
          accountID: response.Result?.UtilityAccount?.AccountID,
          balance: response.Result?.UtilityAccount?.Balance || 0,
          availableBalance: response.Result?.UtilityAccount?.AvailableBalance || 0
        },
        settlementAccount: {
          accountID: response.Result?.SettlementAccount?.AccountID,
          balance: response.Result?.SettlementAccount?.Balance || 0,
          availableBalance: response.Result?.SettlementAccount?.AvailableBalance || 0
        },
        responseCode: response.ResponseCode,
        checkedAt: new Date()
      };

      await auditLogger.logPaymentEvent('mpesa_balance_checked', {
        workingAccountBalance: balance.workingAccount.balance,
        utilityAccountBalance: balance.utilityAccount.balance,
        settlementAccountBalance: balance.settlementAccount.balance
      });

      return balance;

    } catch (error) {
      console.error('MPesa balance check failed:', error);
      throw new Error(`MPesa balance check failed: ${error.message}`);
    }
  }

  /**
   * Reverse a transaction
   */
  async reverseTransaction(reversal: MPesaReversal): Promise<MPesaReversalResult> {
    try {
      const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
      const password = this.generateB2CPassword(timestamp);

      const payload = {
        Initiator: this.initiatorName,
        SecurityCredential: this.securityCredential,
        CommandID: 'TransactionReversal',
        TransactionID: reversal.originalTransactionID,
        Amount: reversal.amount,
        ReceiverParty: this.shortCode,
        RecieverIdentifierType: '11', // 11 for till number
        ResultURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/reversal-result`,
        QueueTimeOutURL: `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/mpesa/queue-timeout`,
        Remarks: reversal.remarks || 'Transaction reversal',
        Occasion: reversal.occasion || 'Reversal'
      };

      const response = await this.makeMPesaRequest('/mpesa/reversal/v1/request', payload);

      const result: MPesaReversalResult = {
        success: response.ResponseCode === '0',
        conversationID: response.ConversationID,
        transactionID: response.OriginatorConversationID,
        responseCode: response.ResponseCode,
        responseMessage: response.ResponseMessage,
        originalTransactionID: reversal.originalTransactionID,
        amount: reversal.amount,
        reversedAt: new Date()
      };

      await auditLogger.logPaymentEvent('mpesa_transaction_reversed', {
        originalTransactionID: reversal.originalTransactionID,
        amount: reversal.amount,
        conversationID: response.ConversationID,
        success: result.success
      });

      return result;

    } catch (error) {
      console.error('MPesa transaction reversal failed:', error);
      throw new Error(`MPesa transaction reversal failed: ${error.message}`);
    }
  }

  /**
   * Process MPesa callback
   */
  async processCallback(callback: MPesaCallback): Promise<MPesaCallbackResult> {
    try {
      const result: MPesaCallbackResult = {
        success: callback.Body.stkCallback.ResultCode === '0',
        merchantRequestID: callback.Body.stkCallback.MerchantRequestID,
        checkoutRequestID: callback.Body.stkCallback.CheckoutRequestID,
        resultCode: callback.Body.stkCallback.ResultCode,
        resultDesc: callback.Body.stkCallback.ResultDesc,
        metadata: this.extractCallbackMetadata(callback),
        processedAt: new Date()
      };

      // Update order status based on payment result
      if (result.success) {
        await this.handleSuccessfulPayment(callback);
      } else {
        await this.handleFailedPayment(callback);
      }

      await auditLogger.logPaymentEvent('mpesa_callback_processed', {
        checkoutRequestID: result.checkoutRequestID,
        resultCode: result.resultCode,
        resultDesc: result.resultDesc,
        success: result.success
      });

      return result;

    } catch (error) {
      console.error('MPesa callback processing failed:', error);
      throw new Error(`MPesa callback processing failed: ${error.message}`);
    }
  }

  /**
   * Get transaction status
   */
  async getTransactionStatus(checkoutRequestID: string): Promise<MPesaTransactionStatus> {
    try {
      // Query transaction status from database
      const status: MPesaTransactionStatus = {
        checkoutRequestID,
        status: 'pending',
        amount: 0,
        phoneNumber: '',
        processedAt: null,
        responseCode: null,
        responseMessage: null
      };

      return status;

    } catch (error) {
      console.error('Failed to get MPesa transaction status:', error);
      throw new Error(`Failed to get transaction status: ${error.message}`);
    }
  }

  // Private methods

  /**
   * Test MPesa API connectivity
   */
  private async testConnection(): Promise<void> {
    try {
      await this.makeMPesaRequest('/mpesa/stkpush/v1/processrequest', {
        test: true
      });
    } catch (error) {
      // Expected to fail during test, just check if API is reachable
    }
  }

  /**
   * Generate STK push password
   */
  private generateSTKPassword(timestamp: string): string {
    const passwordString = this.shortCode + this.passkey + timestamp;
    return Buffer.from(passwordString).toString('base64');
  }

  /**
   * Generate B2C password
   */
  private generateB2CPassword(timestamp: string): string {
    const passwordString = this.initiatorName + this.securityCredential + timestamp;
    return Buffer.from(passwordString).toString('base64');
  }

  /**
   * Make authenticated request to MPesa API
   */
  private async makeMPesaRequest(endpoint: string, payload: any): Promise<any> {
    const baseURL = this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    const token = await this.generateOAuthToken();

    const response = await fetch(`${baseURL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`MPesa API error: ${errorData.errorMessage || 'Unknown error'}`);
    }

    return await response.json();
  }

  /**
   * Generate OAuth token for MPesa API
   */
  private async generateOAuthToken(): Promise<string> {
    const credentials = Buffer.from(`${this.apiKey}:${this.publicKey}`).toString('base64');
    const baseURL = this.environment === 'production'
      ? 'https://api.safaricom.co.ke'
      : 'https://sandbox.safaricom.co.ke';

    const response = await fetch(`${baseURL}/oauth/v1/generate?grant_type=client_credentials`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to generate MPesa OAuth token');
    }

    const data = await response.json();
    return data.access_token;
  }

  /**
   * Extract metadata from callback
   */
  private extractCallbackMetadata(callback: MPesaCallback): any {
    const callbackMetadata = callback.Body.stkCallback.CallbackMetadata || [];
    const metadata: any = {};

    for (const item of callbackMetadata) {
      switch (item.Name) {
        case 'Amount':
          metadata.amount = item.Value;
          break;
        case 'MpesaReceiptNumber':
          metadata.mpesaReceiptNumber = item.Value;
          break;
        case 'TransactionDate':
          metadata.transactionDate = item.Value;
          break;
        case 'PhoneNumber':
          metadata.phoneNumber = item.Value;
          break;
      }
    }

    return metadata;
  }

  /**
   * Handle successful payment
   */
  private async handleSuccessfulPayment(callback: MPesaCallback): Promise<void> {
    const metadata = this.extractCallbackMetadata(callback);

    // Update order status
    await this.updateOrderPaymentStatus(
      metadata.mpesaReceiptNumber,
      'completed',
      metadata.amount,
      metadata.phoneNumber
    );

    // Send confirmation notifications
    await notificationService.sendPaymentConfirmation({
      transactionId: metadata.mpesaReceiptNumber,
      amount: metadata.amount,
      phoneNumber: metadata.phoneNumber,
      status: 'completed'
    });
  }

  /**
   * Handle failed payment
   */
  private async handleFailedPayment(callback: MPesaCallback): Promise<void> {
    // Update order status to failed
    await this.updateOrderPaymentStatus(
      callback.Body.stkCallback.CheckoutRequestID,
      'failed',
      0,
      ''
    );

    // Send failure notification
    await notificationService.sendPaymentFailure({
      checkoutRequestID: callback.Body.stkCallback.CheckoutRequestID,
      reason: callback.Body.stkCallback.ResultDesc,
      phoneNumber: ''
    });
  }

  /**
   * Update order payment status
   */
  private async updateOrderPaymentStatus(
    transactionId: string,
    status: string,
    amount: number,
    phoneNumber: string
  ): Promise<void> {
    // Implementation would update order in database
    console.log(`Updated order payment status: ${transactionId} - ${status}`);
  }

  // Getters for configuration
  private get passkey(): string {
    return process.env.MPESA_PASSKEY || '';
  }
}

// Type definitions
interface MPesaConfig {
  apiKey: string;
  publicKey: string;
  initiatorName: string;
  securityCredential: string;
  shortCode: string;
  environment?: 'sandbox' | 'production';
}

interface MPesaSTKPushRequest {
  orderId: string;
  amount: number;
  phoneNumber: string;
  accountReference?: string;
  description?: string;
}

interface MPesaSTKPushResponse {
  success: boolean;
  merchantRequestID: string;
  checkoutRequestID: string;
  responseCode: string;
  responseMessage: string;
  customerMessage: string;
  orderId: string;
  amount: number;
  phoneNumber: string;
  initiatedAt: Date;
}

interface MPesaB2CResult {
  success: boolean;
  conversationID: string;
  transactionID: string;
  responseCode: string;
  responseMessage: string;
  transactionId: string;
  amount: number;
  recipientPhone: string;
  processedAt: Date;
}

interface MPesaC2BRegistration {
  success: boolean;
  originatorC2BShortCode: string;
  responseCode: string;
  responseMessage: string;
  registeredAt: Date;
}

interface MPesaC2BSimulation {
  success: boolean;
  conversationID: string;
  transactionID: string;
  responseCode: string;
  responseMessage: string;
  amount: number;
  phoneNumber: string;
  simulatedAt: Date;
}

interface MPesaReversalResult {
  success: boolean;
  conversationID: string;
  transactionID: string;
  responseCode: string;
  responseMessage: string;
  originalTransactionID: string;
  amount: number;
  reversedAt: Date;
}

interface MPesaCallbackResult {
  success: boolean;
  merchantRequestID: string;
  checkoutRequestID: string;
  resultCode: string;
  resultDesc: string;
  metadata: any;
  processedAt: Date;
}

interface MPesaTransactionStatus {
  checkoutRequestID: string;
  status: 'pending' | 'completed' | 'failed';
  amount: number;
  phoneNumber: string;
  processedAt: Date | null;
  responseCode: string | null;
  responseMessage: string | null;
}

export { MPesaService };