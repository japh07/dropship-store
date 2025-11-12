import { auditLogger } from './audit-logger';
import { queueManager } from './queue-manager';
import { encryptionUtils } from './encryption';
import type {
  Notification,
  NotificationChannel,
  NotificationTemplate,
  NotificationPreferences,
  RealTimeAlert
} from '@/types';

export class NotificationService {
  private notificationQueue: NotificationJob[] = [];
  private templates = new Map<string, NotificationTemplate>();
  private userPreferences = new Map<string, NotificationPreferences>();
  private activeAlerts = new Set<string>();
  private rateLimits = new Map<string, RateLimitInfo>();

  /**
   * Initialize notification system
   */
  async initialize(): Promise<void> {
    await this.loadNotificationTemplates();
    await this.initializeRealTimeConnections();
    this.startNotificationProcessor();

    console.log('Notification service initialized');
  }

  /**
   * Send real-time push notification
   */
  async sendRealTimeNotification(notification: RealTimeNotification): Promise<NotificationResult> {
    try {
      // Validate notification data
      await this.validateNotification(notification);

      // Check user preferences
      const preferences = await this.getUserPreferences(notification.userId);
      if (!this.isNotificationEnabled(notification.type, preferences)) {
        return { success: true, skipped: true, reason: 'User disabled this notification type' };
      }

      // Check rate limits
      if (this.isRateLimited(notification.userId, notification.type)) {
        return { success: false, skipped: true, reason: 'Rate limit exceeded' };
      }

      // Apply template
      const formattedNotification = await this.applyNotificationTemplate(notification);

      // Send through enabled channels
      const results: ChannelResult[] = [];
      const channels = this.getEnabledChannels(notification.type, preferences);

      for (const channel of channels) {
        const result = await this.sendThroughChannel(formattedNotification, channel);
        results.push(result);
      }

      // Track notification
      await this.trackNotification(notification, results);

      return {
        success: results.some(r => r.success),
        channels: results,
        notificationId: formattedNotification.id
      };

    } catch (error) {
      console.error('Failed to send real-time notification:', error);

      await auditLogger.logNotificationEvent('notification_failed', {
        userId: notification.userId,
        type: notification.type,
        error: error.message
      });

      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send stock alert
   */
  async sendStockAlert(alert: StockAlert): Promise<NotificationResult> {
    const notification: RealTimeNotification = {
      userId: 'admin', // Would be specific users in real implementation
      type: 'stock_alert',
      title: `Stock Alert: ${alert.productName}`,
      message: this.formatStockAlertMessage(alert),
      priority: alert.severity === 'critical' ? 'high' : 'medium',
      data: alert,
      channels: ['email', 'push', 'webhook']
    };

    // Send to operations team
    await this.sendToOperationsTeam(notification);

    // Also send to product manager if critical
    if (alert.severity === 'critical') {
      await this.sendToProductManagers(notification);
    }

    return await this.sendRealTimeNotification(notification);
  }

  /**
   * Send order status update
   */
  async sendOrderStatusUpdate(orderData: OrderStatusUpdate): Promise<NotificationResult> {
    const notification: RealTimeNotification = {
      userId: orderData.customerId,
      type: 'order_status_update',
      title: `Order #${orderData.orderNumber} Update`,
      message: `Your order status has changed to: ${orderData.newStatus}`,
      priority: 'medium',
      data: orderData,
      channels: ['email', 'sms', 'push']
    };

    return await this.sendRealTimeNotification(notification);
  }

  /**
   * Send pricing alert
   */
  async sendPricingAlert(alert: PricingAlert): Promise<NotificationResult> {
    const notification: RealTimeNotification = {
      userId: 'admin',
      type: 'pricing_alert',
      title: `Pricing Alert: ${alert.productName}`,
      message: this.formatPricingAlertMessage(alert),
      priority: alert.isCritical ? 'high' : 'medium',
      data: alert,
      channels: ['email', 'webhook']
    };

    return await this.sendToPricingTeam(notification);
  }

  /**
   * Send shipping exception alert
   */
  async sendShippingException(exception: ShippingException): Promise<NotificationResult> {
    const customerNotification: RealTimeNotification = {
      userId: exception.customerId,
      type: 'shipping_exception',
      title: `Shipping Update for Order #${exception.orderNumber}`,
      message: exception.customerMessage,
      priority: 'high',
      data: exception,
      channels: ['email', 'sms']
    };

    const opsNotification: RealTimeNotification = {
      userId: 'admin',
      type: 'operations_alert',
      title: `Shipping Exception: Order #${exception.orderNumber}`,
      message: exception.operationsMessage,
      priority: 'high',
      data: exception,
      channels: ['email', 'slack', 'webhook']
    };

    // Send to both customer and operations
    await Promise.all([
      this.sendRealTimeNotification(customerNotification),
      this.sendToOperationsTeam(opsNotification)
    ]);

    return { success: true, channels: [] };
  }

  /**
   * Send operations alert
   */
  async sendOperationsAlert(alert: OperationsAlert): Promise<NotificationResult> {
    const notification: RealTimeNotification = {
      userId: 'admin',
      type: 'operations_alert',
      title: `Operations Alert: ${alert.system}`,
      message: alert.message,
      priority: alert.severity,
      data: alert,
      channels: this.getOperationsChannels(alert.severity)
    };

    return await this.sendToOperationsTeam(notification);
  }

  /**
   * Get real-time alert stream
   */
  async getRealTimeAlerts(userId: string, filters?: AlertFilters): Promise<RealTimeAlert[]> {
    // Implementation would get real-time alerts from WebSocket or SSE
    const alerts: RealTimeAlert[] = [];

    // Filter alerts based on user preferences
    const preferences = await this.getUserPreferences(userId);

    return alerts.filter(alert =>
      this.isNotificationEnabled(alert.type, preferences) &&
      this.matchesFilters(alert, filters)
    );
  }

  /**
   * Update user notification preferences
   */
  async updateNotificationPreferences(
    userId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<void> {
    const currentPrefs = await this.getUserPreferences(userId);
    const updatedPrefs = { ...currentPrefs, ...preferences };

    this.userPreferences.set(userId, updatedPrefs);

    // Persist to database
    await this.saveUserPreferences(userId, updatedPrefs);

    await auditLogger.logNotificationEvent('preferences_updated', {
      userId,
      updatedFields: Object.keys(preferences)
    });
  }

  /**
   * Send bulk notifications
   */
  async sendBulkNotifications(
    notifications: RealTimeNotification[],
    options?: BulkNotificationOptions
  ): Promise<BulkNotificationResult> {
    const results: NotificationResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    // Process in batches to avoid overwhelming systems
    const batchSize = options?.batchSize || 50;

    for (let i = 0; i < notifications.length; i += batchSize) {
      const batch = notifications.slice(i, i + batchSize);

      const batchResults = await Promise.allSettled(
        batch.map(notification => this.sendRealTimeNotification(notification))
      );

      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
          if (result.value.success) successCount++;
          else errorCount++;
        } else {
          results.push({
            success: false,
            error: result.reason.message
          });
          errorCount++;
        }
      }

      // Add delay between batches
      if (i + batchSize < notifications.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    return {
      total: notifications.length,
      successful: successCount,
      failed: errorCount,
      results
    };
  }

  /**
   * Process notification queue
   */
  private startNotificationProcessor(): void {
    setInterval(async () => {
      if (this.notificationQueue.length > 0) {
        const jobs = this.notificationQueue.splice(0, 10); // Process 10 at a time

        for (const job of jobs) {
          try {
            await this.processNotificationJob(job);
          } catch (error) {
            console.error('Failed to process notification job:', error);
          }
        }
      }
    }, 5000); // Process every 5 seconds
  }

  /**
   * Process individual notification job
   */
  private async processNotificationJob(job: NotificationJob): Promise<void> {
    switch (job.type) {
      case 'real_time':
        await this.sendRealTimeNotification(job.notification);
        break;
      case 'scheduled':
        await this.sendScheduledNotification(job);
        break;
      case 'bulk':
        await this.sendBulkNotifications(job.notifications);
        break;
    }
  }

  /**
   * Send notification through specific channel
   */
  private async sendThroughChannel(
    notification: RealTimeNotification,
    channel: NotificationChannel
  ): Promise<ChannelResult> {
    try {
      let result: any;

      switch (channel) {
        case 'email':
          result = await this.sendEmailNotification(notification);
          break;
        case 'sms':
          result = await this.sendSMSNotification(notification);
          break;
        case 'push':
          result = await this.sendPushNotification(notification);
          break;
        case 'slack':
          result = await this.sendSlackNotification(notification);
          break;
        case 'webhook':
          result = await this.sendWebhookNotification(notification);
          break;
        default:
          throw new Error(`Unsupported channel: ${channel}`);
      }

      return {
        channel,
        success: true,
        result
      };

    } catch (error) {
      console.error(`Failed to send ${channel} notification:`, error);

      return {
        channel,
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(notification: RealTimeNotification): Promise<any> {
    const emailData = {
      to: await this.getUserEmail(notification.userId),
      subject: notification.title,
      text: notification.message,
      html: this.generateEmailHTML(notification),
      priority: notification.priority
    };

    // Implementation would use actual email service
    console.log('Sending email:', emailData);
    return { messageId: `email-${Date.now()}` };
  }

  /**
   * Send SMS notification
   */
  private async sendSMSNotification(notification: RealTimeNotification): Promise<any> {
    const phoneNumber = await this.getUserPhone(notification.userId);
    if (!phoneNumber) {
      throw new Error('User has no phone number');
    }

    const smsData = {
      to: phoneNumber,
      message: notification.message,
      priority: notification.priority
    };

    // Implementation would use actual SMS service
    console.log('Sending SMS:', smsData);
    return { messageId: `sms-${Date.now()}` };
  }

  /**
   * Send push notification
   */
  private async sendPushNotification(notification: RealTimeNotification): Promise<any> {
    const devices = await this.getUserDevices(notification.userId);
    if (devices.length === 0) {
      throw new Error('User has no registered devices');
    }

    const pushData = {
      devices,
      title: notification.title,
      body: notification.message,
      data: notification.data,
      priority: notification.priority
    };

    // Implementation would use push notification service
    console.log('Sending push notification:', pushData);
    return { messageId: `push-${Date.now()}` };
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(notification: RealTimeNotification): Promise<any> {
    const slackData = {
      channel: this.getSlackChannel(notification.type),
      text: notification.title,
      blocks: this.generateSlackBlocks(notification),
      priority: notification.priority
    };

    // Implementation would use Slack API
    console.log('Sending Slack notification:', slackData);
    return { messageId: `slack-${Date.now()}` };
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(notification: RealTimeNotification): Promise<any> {
    const webhookUrl = this.getWebhookUrl(notification.type);
    if (!webhookUrl) {
      throw new Error(`No webhook configured for type: ${notification.type}`);
    }

    const webhookData = {
      type: notification.type,
      title: notification.title,
      message: notification.message,
      data: notification.data,
      timestamp: new Date().toISOString(),
      priority: notification.priority
    };

    // Implementation would make HTTP request to webhook
    console.log('Sending webhook:', webhookUrl, webhookData);
    return { messageId: `webhook-${Date.now()}` };
  }

  // Helper methods
  private async loadNotificationTemplates(): Promise<void> {
    // Load notification templates from database or files
  }

  private async initializeRealTimeConnections(): Promise<void> {
    // Initialize WebSocket or SSE connections for real-time notifications
  }

  private async validateNotification(notification: RealTimeNotification): Promise<void> {
    if (!notification.userId || !notification.title || !notification.message) {
      throw new Error('Missing required notification fields');
    }
  }

  private async getUserPreferences(userId: string): Promise<NotificationPreferences> {
    if (!this.userPreferences.has(userId)) {
      // Load from database
      const defaultPrefs: NotificationPreferences = {
        email: true,
        sms: true,
        push: true,
        slack: false,
        webhook: false,
        quietHours: { start: '22:00', end: '08:00' },
        categories: {
          orders: true,
          shipping: true,
          pricing: false,
          inventory: true,
          system: true
        }
      };
      this.userPreferences.set(userId, defaultPrefs);
    }
    return this.userPreferences.get(userId)!;
  }

  private isNotificationEnabled(type: string, preferences: NotificationPreferences): boolean {
    // Check if notification type is enabled in user preferences
    return true; // Simplified for now
  }

  private getEnabledChannels(type: string, preferences: NotificationPreferences): NotificationChannel[] {
    const channels: NotificationChannel[] = [];

    if (preferences.email) channels.push('email');
    if (preferences.sms && type === 'order_status_update') channels.push('sms');
    if (preferences.push) channels.push('push');
    if (preferences.slack && type.includes('alert')) channels.push('slack');

    return channels;
  }

  private isRateLimited(userId: string, type: string): boolean {
    const key = `${userId}-${type}`;
    const rateLimit = this.rateLimits.get(key);

    if (!rateLimit || Date.now() > rateLimit.resetTime) {
      this.rateLimits.set(key, {
        count: 1,
        resetTime: Date.now() + 60 * 1000 // 1 minute window
      });
      return false;
    }

    if (rateLimit.count >= 5) { // Max 5 per minute
      return true;
    }

    rateLimit.count++;
    return false;
  }

  private async applyNotificationTemplate(notification: RealTimeNotification): Promise<RealTimeNotification> {
    // Apply notification template to format message
    return {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date()
    };
  }

  private formatStockAlertMessage(alert: StockAlert): string {
    switch (alert.type) {
      case 'out_of_stock':
        return `${alert.productName} (SKU: ${alert.sku}) is out of stock`;
      case 'low_stock':
        return `${alert.productName} (SKU: ${alert.sku}) has low stock: ${alert.currentStock} units`;
      case 'auto_paused':
        return `${alert.productName} has been automatically paused due to low stock`;
      case 'auto_resumed':
        return `${alert.productName} has been automatically resumed`;
      default:
        return `Stock alert for ${alert.productName}`;
    }
  }

  private formatPricingAlertMessage(alert: PricingAlert): string {
    return `Price update for ${alert.productName}: ${alert.oldPrice} → ${alert.newPrice} (${alert.changePercent}%)`;
  }

  private getOperationsChannels(severity: string): NotificationChannel[] {
    const channels: NotificationChannel[] = ['email'];
    if (severity === 'high') {
      channels.push('slack', 'webhook');
    }
    return channels;
  }

  private async sendToOperationsTeam(notification: RealTimeNotification): Promise<void> {
    const opsUsers = await this.getOperationsTeamUsers();

    for (const userId of opsUsers) {
      const opsNotification = { ...notification, userId };
      await this.sendRealTimeNotification(opsNotification);
    }
  }

  private async sendToProductManagers(notification: RealTimeNotification): Promise<void> {
    const productManagers = await this.getProductManagers();

    for (const userId of productManagers) {
      const managerNotification = { ...notification, userId };
      await this.sendRealTimeNotification(managerNotification);
    }
  }

  private async sendToPricingTeam(notification: RealTimeNotification): Promise<void> {
    const pricingTeam = await this.getPricingTeam();

    for (const userId of pricingTeam) {
      const teamNotification = { ...notification, userId };
      await this.sendRealTimeNotification(teamNotification);
    }
  }

  private async trackNotification(
    notification: RealTimeNotification,
    results: ChannelResult[]
  ): Promise<void> {
    // Track notification delivery and analytics
    await auditLogger.logNotificationEvent('notification_sent', {
      userId: notification.userId,
      type: notification.type,
      channels: results.map(r => r.channel),
      successfulChannels: results.filter(r => r.success).map(r => r.channel)
    });
  }

  private generateEmailHTML(notification: RealTimeNotification): string {
    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">
          ${notification.title}
        </h2>
        <p style="color: #666; line-height: 1.6;">
          ${notification.message}
        </p>
        <div style="margin-top: 20px; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <small style="color: #999;">
            Sent at ${new Date().toLocaleString()}
          </small>
        </div>
      </div>
    `;
  }

  private generateSlackBlocks(notification: RealTimeNotification): any[] {
    return [
      {
        type: 'header',
        text: { type: 'plain_text', text: notification.title }
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: notification.message }
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `Priority: ${notification.priority}` },
          { type: 'mrkdwn', text: `Time: ${new Date().toISOString()}` }
        ]
      }
    ];
  }

  // Placeholder methods for actual implementation
  private async getUserEmail(userId: string): Promise<string> {
    return 'user@example.com';
  }

  private async getUserPhone(userId: string): Promise<string> {
    return '+1234567890';
  }

  private async getUserDevices(userId: string): Promise<any[]> {
    return [{ deviceId: 'device1', token: 'token1' }];
  }

  private getSlackChannel(type: string): string {
    return '#notifications';
  }

  private getWebhookUrl(type: string): string {
    return 'https://example.com/webhook';
  }

  private async saveUserPreferences(userId: string, preferences: NotificationPreferences): Promise<void> {
    // Save to database
  }

  private matchesFilters(alert: RealTimeAlert, filters?: AlertFilters): boolean {
    return true; // Simplified
  }

  private async sendScheduledNotification(job: NotificationJob): Promise<void> {
    // Implementation for scheduled notifications
  }

  private async getOperationsTeamUsers(): Promise<string[]> {
    return ['ops1', 'ops2'];
  }

  private async getProductManagers(): Promise<string[]> {
    return ['pm1', 'pm2'];
  }

  private async getPricingTeam(): Promise<string[]> {
    return ['pricing1', 'pricing2'];
  }
}

// Type definitions
interface RateLimitInfo {
  count: number;
  resetTime: number;
}

interface ChannelResult {
  channel: NotificationChannel;
  success: boolean;
  result?: any;
  error?: string;
}

interface NotificationResult {
  success: boolean;
  channels?: ChannelResult[];
  notificationId?: string;
  skipped?: boolean;
  reason?: string;
  error?: string;
}

interface NotificationJob {
  type: 'real_time' | 'scheduled' | 'bulk';
  notification?: RealTimeNotification;
  notifications?: RealTimeNotification[];
  scheduledAt?: Date;
}

interface BulkNotificationOptions {
  batchSize?: number;
  delayMs?: number;
}

interface BulkNotificationResult {
  total: number;
  successful: number;
  failed: number;
  results: NotificationResult[];
}

interface RealTimeNotification {
  userId: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high';
  data?: any;
  channels?: NotificationChannel[];
  id?: string;
  timestamp?: Date;
}

interface AlertFilters {
  type?: string;
  priority?: string;
  dateFrom?: Date;
  dateTo?: Date;
}

interface StockAlert {
  productId: string;
  productName: string;
  sku: string;
  type: 'out_of_stock' | 'low_stock' | 'auto_paused' | 'auto_resumed';
  currentStock: number;
  threshold?: number;
  severity: 'warning' | 'critical';
}

interface PricingAlert {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  changePercent: number;
  isCritical: boolean;
}

interface OrderStatusUpdate {
  customerId: string;
  orderNumber: string;
  newStatus: string;
  previousStatus: string;
  timestamp: Date;
}

interface ShippingException {
  customerId: string;
  orderNumber: string;
  customerMessage: string;
  operationsMessage: string;
  trackingNumber: string;
  carrier: string;
}

interface OperationsAlert {
  system: string;
  message: string;
  severity: 'low' | 'medium' | 'high';
  data?: any;
}

export const notificationService = new NotificationService();