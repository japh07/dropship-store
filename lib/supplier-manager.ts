import { auditLogger } from './audit-logger';
import { productRepository } from './product-repository';
import type { Supplier, Product, SupplierScore, RoutingCriteria, SupplierOrder } from '@/types';

export class SupplierManager {
  private supplierCache = new Map<string, SupplierCacheEntry>();
  private supplierScores = new Map<string, SupplierScore>();
  private routingRules = new Map<string, RoutingRule[]>();
  private fallbackChains = new Map<string, string[]>();

  /**
   * Initialize supplier management system
   */
  async initialize(): Promise<void> {
    await this.loadSuppliers();
    await this.loadSupplierScores();
    await this.loadRoutingRules();
    await this.initializeFallbackChains();

    console.log('Supplier management initialized');
  }

  /**
   * Select best supplier for a product based on multiple criteria
   */
  async selectBestSupplier(
    product: Product,
    quantity: number = 1,
    customCriteria?: Partial<RoutingCriteria>
  ): Promise<Supplier> {
    const criteria: RoutingCriteria = {
      stockAvailability: 0.4,
      price: 0.3,
      deliveryTime: 0.2,
      reliability: 0.1,
      ...customCriteria
    };

    // Get all suppliers that have this product
    const availableSuppliers = await this.getSuppliersForProduct(product.id);
    if (availableSuppliers.length === 0) {
      throw new Error(`No suppliers available for product ${product.id}`);
    }

    // Score each supplier
    const scoredSuppliers: ScoredSupplier[] = [];

    for (const supplier of availableSuppliers) {
      try {
        const score = await this.scoreSupplier(supplier, product, quantity, criteria);
        scoredSuppliers.push({
          supplier,
          totalScore: score.totalScore,
          breakdown: score.breakdown
        });
      } catch (error) {
        console.error(`Failed to score supplier ${supplier.name}:`, error);
        continue;
      }
    }

    if (scoredSuppliers.length === 0) {
      throw new Error(`No suppliers could be scored for product ${product.id}`);
    }

    // Sort by total score (highest first)
    scoredSuppliers.sort((a, b) => b.totalScore - a.totalScore);

    const bestSupplier = scoredSuppliers[0].supplier;

    // Log supplier selection
    await auditLogger.logSupplierEvent('supplier_selected', {
      productId: product.id,
      productSku: product.sku,
      selectedSupplier: bestSupplier.id,
      supplierName: bestSupplier.name,
      totalScore: scoredSuppliers[0].totalScore,
      alternativeSuppliers: scoredSuppliers.slice(1, 3).map(s => ({
        id: s.supplier.id,
        name: s.supplier.name,
        score: s.totalScore
      }))
    });

    return bestSupplier;
  }

  /**
   * Create order with supplier with fallback mechanism
   */
  async createOrder(supplierId: string, orderData: SupplierOrder): Promise<SupplierOrderResult> {
    const supplier = await this.getById(supplierId);
    if (!supplier) {
      throw new Error(`Supplier not found: ${supplierId}`);
    }

    try {
      // Validate order data
      await this.validateOrderData(supplier, orderData);

      // Create order with primary supplier
      const result = await this.createOrderWithSupplier(supplier, orderData);

      await auditLogger.logSupplierEvent('order_created', {
        supplierId,
        supplierName: supplier.name,
        orderId: result.data.order_id,
        totalAmount: result.data.total_cost,
        itemCount: orderData.items.length
      });

      return result;

    } catch (error) {
      console.error(`Failed to create order with supplier ${supplier.name}:`, error);

      // Try fallback suppliers
      const fallbackResult = await this.tryFallbackSuppliers(supplierId, orderData);

      if (fallbackResult.success) {
        await auditLogger.logSupplierEvent('fallback_order_succeeded', {
          originalSupplier: supplierId,
          fallbackSupplier: fallbackResult.supplierId,
          orderId: fallbackResult.data.order_id,
          originalError: error.message
        });

        return fallbackResult;
      }

      // All suppliers failed
      await auditLogger.logSupplierEvent('all_suppliers_failed', {
        productId: orderData.items[0]?.sku,
        originalSupplier: supplierId,
        attemptedSuppliers: fallbackResult.attemptedSuppliers,
        error: error.message
      });

      throw new Error(`All suppliers failed to process order. Last error: ${fallbackResult.error}`);
    }
  }

  /**
   * Get supplier product cost including all fees
   */
  async getProductCost(supplierId: string, sku: string, quantity: number = 1): Promise<SupplierCost> {
    const supplier = await this.getById(supplierId);
    if (!supplier) {
      throw new Error(`Supplier not found: ${supplierId}`);
    }

    try {
      // Get base cost from supplier API
      const baseCost = await this.fetchSupplierCost(supplier, sku, quantity);

      // Calculate total cost including shipping, fees, etc.
      const shippingCost = await this.calculateShippingCost(supplier, sku, quantity);
      const handlingFee = supplier.handlingFee || 0;
      const paymentFee = baseCost * (supplier.paymentFeePercentage || 0.03);

      const totalCost = baseCost + shippingCost + handlingFee + paymentFee;

      return {
        cost: baseCost,
        shippingCost,
        handlingFee,
        paymentFee,
        totalCost,
        currency: supplier.currency,
        estimatedDelivery: baseCost.estimatedDelivery,
        stockQuantity: baseCost.stockQuantity
      };

    } catch (error) {
      console.error(`Failed to get product cost from supplier ${supplier.name}:`, error);
      throw new Error(`Unable to fetch cost from supplier ${supplier.name}: ${error.message}`);
    }
  }

  /**
   * Get real-time stock information from supplier
   */
  async getProductStock(supplierId: string, sku: string): Promise<SupplierStockInfo> {
    const supplier = await this.getById(supplierId);
    if (!supplier) {
      throw new Error(`Supplier not found: ${supplierId}`);
    }

    try {
      // Check cache first
      const cacheKey = `${supplierId}-${sku}`;
      const cached = this.supplierCache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp.getTime()) < 5 * 60 * 1000) { // 5 minutes
        return cached.stockInfo;
      }

      // Fetch from supplier API
      const stockInfo = await this.fetchSupplierStock(supplier, sku);

      // Cache the result
      this.supplierCache.set(cacheKey, {
        supplierId,
        sku,
        stockInfo,
        timestamp: new Date()
      });

      return stockInfo;

    } catch (error) {
      console.error(`Failed to get stock from supplier ${supplier.name}:`, error);
      throw new Error(`Unable to fetch stock from supplier ${supplier.name}: ${error.message}`);
    }
  }

  /**
   * Update supplier performance scores
   */
  async updateSupplierScore(supplierId: string, metrics: SupplierMetrics): Promise<void> {
    const currentScore = this.supplierScores.get(supplierId) || await this.initializeSupplierScore(supplierId);

    // Calculate new score based on metrics
    const updatedScore = this.calculateUpdatedScore(currentScore, metrics);

    // Save updated score
    this.supplierScores.set(supplierId, updatedScore);

    // Persist to database
    await this.saveSupplierScore(supplierId, updatedScore);

    await auditLogger.logSupplierEvent('supplier_score_updated', {
      supplierId,
      previousScore: currentScore.overall,
      newScore: updatedScore.overall,
      metrics
    });
  }

  /**
   * Get all suppliers for a product
   */
  async getSuppliersForProduct(productId: string): Promise<Supplier[]> {
    const product = await productRepository.getById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Get suppliers that have this product in their catalog
    const allSuppliers = await this.getAllSuppliers();
    const productSuppliers: Supplier[] = [];

    for (const supplier of allSuppliers) {
      const hasProduct = await this.checkSupplierHasProduct(supplier, product.sku);
      if (hasProduct) {
        productSuppliers.push(supplier);
      }
    }

    return productSuppliers;
  }

  /**
   * Get supplier by ID
   */
  async getById(supplierId: string): Promise<Supplier | null> {
    // Implementation would fetch from database
    const allSuppliers = await this.getAllSuppliers();
    return allSuppliers.find(s => s.id === supplierId) || null;
  }

  /**
   * Score supplier based on multiple criteria
   */
  private async scoreSupplier(
    supplier: Supplier,
    product: Product,
    quantity: number,
    criteria: RoutingCriteria
  ): Promise<SupplierScoreBreakdown> {
    const breakdown: SupplierScoreBreakdown = {
      totalScore: 0,
      breakdown: {}
    };

    // Stock availability score (0-100)
    try {
      const stockInfo = await this.getProductStock(supplier.id, product.sku);
      const stockScore = this.calculateStockScore(stockInfo, quantity);
      breakdown.breakdown.stockAvailability = stockScore;
      breakdown.totalScore += stockScore * criteria.stockAvailability;
    } catch (error) {
      breakdown.breakdown.stockAvailability = 0;
    }

    // Price score (0-100, lower is better)
    try {
      const costInfo = await this.getProductCost(supplier.id, product.sku, quantity);
      const priceScore = this.calculatePriceScore(costInfo.totalCost);
      breakdown.breakdown.price = priceScore;
      breakdown.totalScore += priceScore * criteria.price;
    } catch (error) {
      breakdown.breakdown.price = 0;
    }

    // Delivery time score (0-100, lower is better)
    try {
      const costInfo = await this.getProductCost(supplier.id, product.sku, quantity);
      const deliveryScore = this.calculateDeliveryScore(costInfo.estimatedDelivery);
      breakdown.breakdown.deliveryTime = deliveryScore;
      breakdown.totalScore += deliveryScore * criteria.deliveryTime;
    } catch (error) {
      breakdown.breakdown.deliveryTime = 0;
    }

    // Reliability score (0-100)
    const supplierScore = this.supplierScores.get(supplier.id);
    const reliabilityScore = supplierScore ? supplierScore.reliability * 100 : 50; // Default 50%
    breakdown.breakdown.reliability = reliabilityScore;
    breakdown.totalScore += reliabilityScore * criteria.reliability;

    return breakdown;
  }

  /**
   * Try fallback suppliers if primary fails
   */
  private async tryFallbackSuppliers(
    failedSupplierId: string,
    orderData: SupplierOrder
  ): Promise<FallbackOrderResult> {
    const fallbackChain = this.fallbackChains.get(failedSupplierId) || [];
    const attemptedSuppliers: string[] = [failedSupplierId];

    for (const fallbackSupplierId of fallbackChain) {
      try {
        const fallbackSupplier = await this.getById(fallbackSupplierId);
        if (!fallbackSupplier) continue;

        // Check if fallback supplier has the products
        const canFulfill = await this.canSupplierFulfillOrder(fallbackSupplier, orderData);
        if (!canFulfill) continue;

        // Create order with fallback supplier
        const result = await this.createOrderWithSupplier(fallbackSupplier, orderData);

        return {
          success: true,
          supplierId: fallbackSupplierId,
          data: result.data,
          attemptedSuppliers
        };

      } catch (error) {
        console.error(`Fallback supplier ${fallbackSupplierId} also failed:`, error);
        attemptedSuppliers.push(fallbackSupplierId);
        continue;
      }
    }

    return {
      success: false,
      attemptedSuppliers,
      error: 'All fallback suppliers failed'
    };
  }

  /**
   * Create order with specific supplier
   */
  private async createOrderWithSupplier(supplier: Supplier, orderData: SupplierOrder): Promise<SupplierOrderResult> {
    // Implementation would call supplier's specific API
    const mockResponse = {
      success: true,
      data: {
        order_id: `SUP-${supplier.id}-${Date.now()}`,
        total_cost: 100,
        estimated_delivery: '7-14 days',
        tracking_available: true
      }
    };

    return mockResponse;
  }

  /**
   * Validate order data against supplier requirements
   */
  private async validateOrderData(supplier: Supplier, orderData: SupplierOrder): Promise<void> {
    // Check minimum order value
    if (supplier.minimumOrderValue) {
      const orderValue = orderData.items.reduce((sum, item) => sum + (item.price || 0) * item.quantity, 0);
      if (orderValue < supplier.minimumOrderValue) {
        throw new Error(`Order value ${orderValue} is below minimum ${supplier.minimumOrderValue}`);
      }
    }

    // Check shipping address restrictions
    if (supplier.supportedCountries && orderData.shipping_address?.country) {
      if (!supplier.supportedCountries.includes(orderData.shipping_address.country)) {
        throw new Error(`Supplier does not ship to ${orderData.shipping_address.country}`);
      }
    }

    // Validate product availability
    for (const item of orderData.items) {
      const stockInfo = await this.getProductStock(supplier.id, item.sku);
      if (stockInfo.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${item.sku}. Available: ${stockInfo.quantity}, Requested: ${item.quantity}`);
      }
    }
  }

  // Score calculation methods
  private calculateStockScore(stockInfo: SupplierStockInfo, requestedQuantity: number): number {
    if (stockInfo.quantity === 0) return 0;
    if (stockInfo.quantity < requestedQuantity) return 20; // Some penalty for insufficient stock
    if (stockInfo.quantity >= requestedQuantity * 2) return 100; // Bonus for good stock
    return 70; // Decent score for exact match
  }

  private calculatePriceScore(totalCost: number): number {
    // This would be based on market benchmarks
    // Lower cost = higher score
    const averageCost = 50; // Would be calculated from market data
    const ratio = averageCost / totalCost;
    return Math.min(100, Math.max(0, ratio * 100));
  }

  private calculateDeliveryScore(estimatedDelivery: string): number {
    // Parse delivery time and score (faster = higher score)
    const days = parseInt(estimatedDelivery) || 14;
    if (days <= 3) return 100;
    if (days <= 7) return 80;
    if (days <= 14) return 60;
    return 40;
  }

  // Helper methods (implementations would connect to actual systems)
  private async loadSuppliers(): Promise<void> {
    // Load suppliers from database
  }

  private async loadSupplierScores(): Promise<void> {
    // Load performance scores from database
  }

  private async loadRoutingRules(): Promise<void> {
    // Load routing rules from database
  }

  private async initializeFallbackChains(): Promise<void> {
    // Initialize fallback supplier chains
  }

  private async getAllSuppliers(): Promise<Supplier[]> {
    // Return all suppliers from database
    return [];
  }

  private async checkSupplierHasProduct(supplier: Supplier, sku: string): Promise<boolean> {
    // Check if supplier has product in catalog
    return true;
  }

  private async fetchSupplierCost(supplier: Supplier, sku: string, quantity: number): Promise<any> {
    // Fetch cost from supplier API
    return { cost: 50, estimatedDelivery: '7-14 days', stockQuantity: 100 };
  }

  private async fetchSupplierStock(supplier: Supplier, sku: string): Promise<SupplierStockInfo> {
    // Fetch stock from supplier API
    return {
      quantity: 100,
      lastUpdated: new Date(),
      available: true,
      price: 50,
      currency: 'USD'
    };
  }

  private async calculateShippingCost(supplier: Supplier, sku: string, quantity: number): Promise<number> {
    // Calculate shipping cost
    return supplier.baseShippingCost || 10;
  }

  private async canSupplierFulfillOrder(supplier: Supplier, orderData: SupplierOrder): Promise<boolean> {
    // Check if supplier can fulfill entire order
    return true;
  }

  private async initializeSupplierScore(supplierId: string): Promise<SupplierScore> {
    // Initialize default supplier score
    return {
      supplierId,
      overall: 50,
      reliability: 0.5,
      deliverySpeed: 0.5,
      priceCompetitiveness: 0.5,
      stockAvailability: 0.5,
      communication: 0.5,
      lastUpdated: new Date()
    };
  }

  private calculateUpdatedScore(currentScore: SupplierScore, metrics: SupplierMetrics): SupplierScore {
    // Calculate updated score based on new metrics
    return {
      ...currentScore,
      overall: 55, // Would be calculated properly
      lastUpdated: new Date()
    };
  }

  private async saveSupplierScore(supplierId: string, score: SupplierScore): Promise<void> {
    // Save score to database
  }

  private async confirmOrder(supplierId: string, orderId: string): Promise<any> {
    // Confirm order with supplier
    return {
      success: true,
      data: {
        status: 'confirmed',
        tracking_info: { tracking_number: 'TRACK123' }
      }
    };
  }
}

// Type definitions
interface SupplierCacheEntry {
  supplierId: string;
  sku: string;
  stockInfo: SupplierStockInfo;
  timestamp: Date;
}

interface SupplierScoreBreakdown {
  totalScore: number;
  breakdown: {
    stockAvailability?: number;
    price?: number;
    deliveryTime?: number;
    reliability?: number;
  };
}

interface ScoredSupplier {
  supplier: Supplier;
  totalScore: number;
  breakdown: SupplierScoreBreakdown;
}

interface FallbackOrderResult {
  success: boolean;
  supplierId?: string;
  data?: any;
  attemptedSuppliers: string[];
  error?: string;
}

interface SupplierStockInfo {
  quantity: number;
  lastUpdated: Date;
  available: boolean;
  price?: number;
  currency?: string;
}

interface SupplierCost {
  cost: number;
  shippingCost: number;
  handlingFee: number;
  paymentFee: number;
  totalCost: number;
  currency: string;
  estimatedDelivery: string;
  stockQuantity: number;
}

interface SupplierMetrics {
  successfulOrders?: number;
  failedOrders?: number;
  averageDeliveryTime?: number;
  onTimeDeliveryRate?: number;
  priceCompetitiveness?: number;
  stockAccuracy?: number;
}

interface RoutingRule {
  id: string;
  name: string;
  conditions: any;
  actions: any;
  priority: number;
}

export const supplierManager = new SupplierManager();