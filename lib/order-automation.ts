import { auditLogger } from './audit-logger';
import { emailService } from './email-service';
import { smsService } from './sms-service';
import { supplierManager } from './supplier-manager';
import { productRepository } from './product-repository';
import { queueManager } from './queue-manager';
import { encryptionUtils } from './encryption';
import type { Order, Supplier, Product, AutomationContext, OrderProcessingResult } from '@/types';

export class OrderAutomationService {
  private retryQueue = new Map<string, RetryData>();
  private processingOrders = new Set<string>();

  /**
   * Process order through complete automation pipeline
   */
  async processOrder(order: Order, context: AutomationContext): Promise<OrderProcessingResult> {
    const startTime = Date.now();

    // Check if order is already being processed
    if (this.processingOrders.has(order.id)) {
      throw new Error(`Order ${order.id} is already being processed`);
    }

    this.processingOrders.add(order.id);

    try {
      // Step 1: Validate and parse order data
      const validatedOrder = await this.validateOrder(order);

      // Step 2: Route each line item to appropriate supplier
      const supplierGroups = await this.routeItemsToSuppliers(validatedOrder);

      // Step 3: Create orders with each supplier
      const supplierOrders = await this.createSupplierOrders(supplierGroups, context);

      // Step 4: Handle payment processing and confirm orders
      const confirmedOrders = await this.confirmSupplierOrders(supplierOrders, context);

      // Step 5: Track order confirmation and send notifications
      await this.handleOrderConfirmation(confirmedOrders, validatedOrder, context);

      // Step 6: Calculate profit margins
      const profitData = await this.calculateProfit(validatedOrder, confirmedOrders);

      // Step 7: Schedule tracking monitoring
      await this.scheduleTrackingMonitoring(confirmedOrders);

      const processingTime = Date.now() - startTime;

      return {
        supplierOrderId: confirmedOrders[0]?.supplierOrderId || '',
        supplierName: confirmedOrders[0]?.supplierName || '',
        totalCost: profitData.totalCost,
        profit: profitData.profit,
        estimatedDelivery: confirmedOrders[0]?.estimatedDelivery,
        trackingAvailable: confirmedOrders.some(order => order.trackingAvailable),
        automationTime: processingTime,
        supplierOrders: confirmedOrders
      };

    } finally {
      this.processingOrders.delete(order.id);
    }
  }

  /**
   * Validate order data and decrypt sensitive information
   */
  private async validateOrder(order: Order): Promise<Order> {
    // Validate required fields
    if (!order.line_items || order.line_items.length === 0) {
      throw new Error('Order has no line items');
    }

    if (!order.shipping_address) {
      throw new Error('Order has no shipping address');
    }

    // Decrypt sensitive data if needed
    const decryptedOrder = { ...order };

    if (order.shipping_address?.encrypted_data) {
      decryptedOrder.shipping_address = await encryptionUtils.decrypt(
        order.shipping_address.encrypted_data
      );
    }

    return decryptedOrder;
  }

  /**
   * Route line items to suppliers based on SKU source and availability
   */
  private async routeItemsToSuppliers(order: Order): Promise<SupplierOrderGroup[]> {
    const supplierGroups: SupplierOrderGroup[] = [];
    const itemsBySupplier = new Map<string, Order['line_items']>();

    // Group items by preferred supplier
    for (const item of order.line_items) {
      const product = await productRepository.getBySku(item.sku);
      if (!product) {
        throw new Error(`Product not found for SKU: ${item.sku}`);
      }

      // Check supplier routing logic
      const bestSupplier = await supplierManager.selectBestSupplier(product, item.quantity);

      if (!itemsBySupplier.has(bestSupplier.id)) {
        itemsBySupplier.set(bestSupplier.id, []);
      }

      itemsBySupplier.get(bestSupplier.id)!.push({
        ...item,
        supplierInfo: bestSupplier
      });
    }

    // Convert to supplier order groups
    for (const [supplierId, items] of itemsBySupplier) {
      const supplier = await supplierManager.getById(supplierId);
      if (!supplier) continue;

      supplierGroups.push({
        supplier,
        items,
        totalAmount: items.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      });
    }

    return supplierGroups;
  }

  /**
   * Create orders with each supplier
   */
  private async createSupplierOrders(
    supplierGroups: SupplierOrderGroup[],
    context: AutomationContext
  ): Promise<SupplierOrderResult[]> {
    const results: SupplierOrderResult[] = [];

    for (const group of supplierGroups) {
      try {
        const orderResult = await this.createSingleSupplierOrder(group, context);
        results.push(orderResult);

        await auditLogger.logOrderEvent('supplier_order_created', {
          supplierId: group.supplier.id,
          supplierName: group.supplier.name,
          itemCount: group.items.length,
          totalAmount: group.totalAmount,
          supplierOrderId: orderResult.supplierOrderId
        });

      } catch (error) {
        console.error(`Failed to create order with supplier ${group.supplier.name}:`, error);

        // Add to retry queue
        await this.addToRetryQueue(group, context, error);

        results.push({
          supplierId: group.supplier.id,
          supplierName: group.supplier.name,
          success: false,
          error: error.message,
          items: group.items
        });

        await auditLogger.logOrderEvent('supplier_order_failed', {
          supplierId: group.supplier.id,
          supplierName: group.supplier.name,
          error: error.message,
          retryScheduled: true
        });
      }
    }

    return results;
  }

  /**
   * Create order with single supplier
   */
  private async createSingleSupplierOrder(
    group: SupplierOrderGroup,
    context: AutomationContext
  ): Promise<SupplierOrderResult> {
    const { supplier, items } = group;

    // Prepare order data for supplier API
    const supplierOrderData = {
      customer_info: {
        name: context.customerName || 'Customer',
        email: context.userEmail,
        phone: context.customerPhone
      },
      shipping_address: context.shippingAddress,
      items: items.map(item => ({
        sku: item.sku,
        quantity: item.quantity,
        variant_id: item.variant_id
      })),
      order_reference: `DROP-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      shipping_method: 'standard'
    };

    // Call supplier API
    const response = await supplierManager.createOrder(supplier.id, supplierOrderData);

    if (!response.success) {
      throw new Error(`Supplier API error: ${response.error}`);
    }

    return {
      supplierId: supplier.id,
      supplierName: supplier.name,
      success: true,
      supplierOrderId: response.data.order_id,
      totalCost: response.data.total_cost,
      estimatedDelivery: response.data.estimated_delivery,
      trackingAvailable: response.data.tracking_available,
      items
    };
  }

  /**
   * Confirm supplier orders and handle payments
   */
  private async confirmSupplierOrders(
    orders: SupplierOrderResult[],
    context: AutomationContext
  ): Promise<SupplierOrderResult[]> {
    const confirmedOrders: SupplierOrderResult[] = [];

    for (const order of orders) {
      if (!order.success) {
        confirmedOrders.push(order);
        continue;
      }

      try {
        // Confirm order with supplier
        const confirmation = await supplierManager.confirmOrder(
          order.supplierId,
          order.supplierOrderId
        );

        confirmedOrders.push({
          ...order,
          status: confirmation.data.status,
          confirmedAt: new Date().toISOString(),
          trackingInfo: confirmation.data.tracking_info
        });

      } catch (error) {
        console.error(`Failed to confirm order ${order.supplierOrderId}:`, error);

        // Keep as success but note confirmation failure
        confirmedOrders.push({
          ...order,
          status: 'confirmation_failed',
          confirmationError: error.message
        });
      }
    }

    return confirmedOrders;
  }

  /**
   * Send notifications and log confirmations
   */
  private async handleOrderConfirmation(
    orders: SupplierOrderResult[],
    originalOrder: Order,
    context: AutomationContext
  ): Promise<void> {
    const successfulOrders = orders.filter(order => order.success);

    if (successfulOrders.length === 0) {
      throw new Error('No orders were successfully created with suppliers');
    }

    // Send confirmation email
    await emailService.sendOrderConfirmation({
      customerEmail: originalOrder.email,
      customerName: originalOrder.shipping_address?.name || 'Customer',
      orderId: originalOrder.id,
      supplierOrders: successfulOrders,
      estimatedDelivery: successfulOrders[0]?.estimatedDelivery
    });

    // Send SMS confirmation if requested
    if (context.customerPhone) {
      await smsService.sendOrderConfirmation({
        phoneNumber: context.customerPhone,
        orderId: originalOrder.id,
        itemCount: originalOrder.line_items.length,
        estimatedDelivery: successfulOrders[0]?.estimatedDelivery
      });
    }

    // Update original order status (if integrated with platform)
    await this.updateOriginalOrderStatus(originalOrder.id, 'processing');
  }

  /**
   * Calculate profit margins
   */
  private async calculateProfit(
    originalOrder: Order,
    supplierOrders: SupplierOrderResult[]
  ): Promise<ProfitData> {
    const revenue = parseFloat(originalOrder.total_price || '0');
    const totalCost = supplierOrders
      .filter(order => order.success)
      .reduce((sum, order) => sum + (order.totalCost || 0), 0);

    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    return {
      revenue,
      totalCost,
      profit,
      profitMargin
    };
  }

  /**
   * Schedule monitoring for tracking numbers
   */
  private async scheduleTrackingMonitoring(orders: SupplierOrderResult[]): Promise<void> {
    for (const order of orders) {
      if (order.success && order.trackingAvailable) {
        // Schedule tracking check in 30 minutes
        await queueManager.scheduleJob(
          'tracking-check',
          {
            supplierOrderId: order.supplierOrderId,
            supplierId: order.supplierId,
            checkAt: new Date(Date.now() + 30 * 60 * 1000)
          }
        );
      }
    }
  }

  /**
   * Add failed order to retry queue
   */
  private async addToRetryQueue(
    group: SupplierOrderGroup,
    context: AutomationContext,
    error: Error
  ): Promise<void> {
    const retryData: RetryData = {
      group,
      context,
      attempt: 1,
      maxAttempts: 3,
      nextRetryAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
      lastError: error.message
    };

    this.retryQueue.set(`retry-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`, retryData);

    // Schedule retry job
    await queueManager.scheduleJob('order-retry', retryData, {
      delay: 5 * 60 * 1000, // 5 minutes
      attempts: 3
    });
  }

  /**
   * Update original order status in e-commerce platform
   */
  private async updateOriginalOrderStatus(orderId: string, status: string): Promise<void> {
    try {
      // This would integrate with Shopify, Amazon, etc.
      // Implementation depends on the platform being used
      console.log(`Updating order ${orderId} status to ${status}`);
    } catch (error) {
      console.error(`Failed to update order ${orderId} status:`, error);
    }
  }

  /**
   * Get order processing status
   */
  async getOrderStatus(params: {
    orderId?: string;
    status?: string;
    userId: string;
  }): Promise<any> {
    // Implementation for fetching order status
    return {
      orders: [],
      total: 0,
      page: 1,
      limit: 20
    };
  }
}

interface SupplierOrderGroup {
  supplier: Supplier;
  items: Order['line_items'];
  totalAmount: number;
}

interface SupplierOrderResult {
  supplierId: string;
  supplierName: string;
  success: boolean;
  supplierOrderId?: string;
  totalCost?: number;
  estimatedDelivery?: string;
  trackingAvailable?: boolean;
  status?: string;
  confirmedAt?: string;
  trackingInfo?: any;
  items: Order['line_items'];
  error?: string;
  confirmationError?: string;
}

interface ProfitData {
  revenue: number;
  totalCost: number;
  profit: number;
  profitMargin: number;
}

interface RetryData {
  group: SupplierOrderGroup;
  context: AutomationContext;
  attempt: number;
  maxAttempts: number;
  nextRetryAt: Date;
  lastError: string;
}

export const orderAutomationService = new OrderAutomationService();