import { auditLogger } from './audit-logger';
import { productRepository } from './product-repository';
import { supplierManager } from './supplier-manager';
import { marketAnalysisService } from './market-analysis-service';
import { queueManager } from './queue-manager';
import type { Product, PricingRule, PricingStrategy, CostData, MarketData } from '@/types';

export class PricingAutomationService {
  private pricingCache = new Map<string, PricingCacheEntry>();
  private activeRules = new Map<string, PricingRule>();
  private updateQueue: PriceUpdateJob[] = [];

  /**
   * Initialize pricing automation with default rules
   */
  async initialize(): Promise<void> {
    // Load default pricing rules
    await this.loadDefaultPricingRules();

    // Start background price monitoring
    this.startPriceMonitoring();

    console.log('Pricing automation initialized');
  }

  /**
   * Apply pricing strategy to a product
   */
  async applyPricingStrategy(
    productId: string,
    strategy: PricingStrategy,
    customizations?: Partial<PricingRule>
  ): Promise<PricingResult> {
    const product = await productRepository.getById(productId);
    if (!product) {
      throw new Error(`Product not found: ${productId}`);
    }

    // Get current cost data from suppliers
    const costData = await this.getCostData(product);

    // Get market data if AI-based pricing
    let marketData: MarketData | undefined;
    if (strategy === 'ai_dynamic' || strategy === 'competitive') {
      marketData = await this.getMarketData(product);
    }

    // Apply pricing rule
    const pricingRule = this.createPricingRule(strategy, costData, marketData, customizations);

    // Calculate new price
    const newPrice = await this.calculatePrice(product, pricingRule, costData, marketData);

    // Check price boundaries and constraints
    const validatedPrice = await this.validatePrice(newPrice, product, costData);

    // Cache the result
    const cacheEntry: PricingCacheEntry = {
      productId,
      price: validatedPrice.finalPrice,
      cost: validatedPrice.totalCost,
      profit: validatedPrice.profit,
      margin: validatedPrice.margin,
      strategy,
      timestamp: new Date(),
      marketData,
      costData
    };

    this.pricingCache.set(productId, cacheEntry);

    // Log pricing update
    await auditLogger.logPricingEvent('price_calculated', {
      productId,
      strategy,
      oldPrice: product.price,
      newPrice: validatedPrice.finalPrice,
      profit: validatedPrice.profit,
      margin: validatedPrice.margin
    });

    return validatedPrice;
  }

  /**
   * Update prices for multiple products
   */
  async updateProductPrices(productIds: string[], strategy?: PricingStrategy): Promise<BatchUpdateResult> {
    const results: ProductUpdateResult[] = [];
    let successCount = 0;
    let errorCount = 0;

    for (const productId of productIds) {
      try {
        const product = await productRepository.getById(productId);
        if (!product) {
          results.push({
            productId,
            success: false,
            error: 'Product not found'
          });
          errorCount++;
          continue;
        }

        const currentStrategy = strategy || product.pricingStrategy || 'cost_plus_fixed';
        const pricingResult = await this.applyPricingStrategy(productId, currentStrategy);

        // Update product price in database
        const updateSuccess = await productRepository.updatePrice(productId, {
          price: pricingResult.finalPrice,
          cost: pricingResult.totalCost,
          pricingStrategy: currentStrategy,
          lastPriceUpdate: new Date(),
          profitMargin: pricingResult.margin
        });

        if (updateSuccess) {
          results.push({
            productId,
            success: true,
            oldPrice: product.price,
            newPrice: pricingResult.finalPrice,
            profit: pricingResult.profit,
            margin: pricingResult.margin
          });
          successCount++;
        } else {
          results.push({
            productId,
            success: false,
            error: 'Failed to update price in database'
          });
          errorCount++;
        }

      } catch (error) {
        results.push({
          productId,
          success: false,
          error: error.message
        });
        errorCount++;
      }
    }

    // Log batch update
    await auditLogger.logPricingEvent('batch_price_update', {
      totalProducts: productIds.length,
      successCount,
      errorCount,
      strategy
    });

    return {
      total: productIds.length,
      successful: successCount,
      failed: errorCount,
      results
    };
  }

  /**
   * Monitor supplier cost changes and update prices automatically
   */
  async monitorCostChanges(): Promise<void> {
    try {
      // Get all products with automatic pricing enabled
      const products = await productRepository.getProductsAutoPricingEnabled();

      for (const product of products) {
        const currentCostData = await this.getCostData(product);
        const cachedCost = this.pricingCache.get(product.id)?.cost;

        // Check if cost has changed significantly (>5%)
        if (cachedCost && this.hasSignificantCostChange(cachedCost, currentCostData.totalCost)) {

          // Schedule price update
          await this.schedulePriceUpdate({
            productId: product.id,
            reason: 'cost_change',
            priority: 'high',
            oldCost: cachedCost,
            newCost: currentCostData.totalCost
          });
        }
      }
    } catch (error) {
      console.error('Error monitoring cost changes:', error);
      await auditLogger.logPricingEvent('cost_monitoring_error', { error: error.message });
    }
  }

  /**
   * AI-based price optimization based on market trends
   */
  async optimizePricesWithAI(productIds?: string[]): Promise<AIOptimizationResult> {
    const targetProducts = productIds || await this.getOptimizationCandidates();
    const optimizations: PriceOptimization[] = [];

    for (const productId of targetProducts) {
      try {
        const product = await productRepository.getById(productId);
        if (!product) continue;

        const marketData = await this.getMarketData(product);
        const currentPerformance = await this.getProductPerformance(productId);

        // AI optimization logic
        const optimization = await this.calculateAIOptimization(
          product,
          marketData,
          currentPerformance
        );

        if (optimization.recommendedAction !== 'no_change') {
          optimizations.push(optimization);

          // Apply optimization if confidence is high
          if (optimization.confidence > 0.8) {
            await this.applyPricingStrategy(productId, 'ai_dynamic', {
              targetMargin: optimization.recommendedMargin,
              minMargin: optimization.minMargin,
              maxMargin: optimization.maxMargin
            });
          }
        }
      } catch (error) {
        console.error(`AI optimization failed for product ${productId}:`, error);
      }
    }

    return {
      totalProducts: targetProducts.length,
      optimizationsRecommneded: optimizations.length,
      optimizationsApplied: optimizations.filter(opt => opt.confidence > 0.8).length,
      optimizations
    };
  }

  /**
   * Create pricing rule based on strategy
   */
  private createPricingRule(
    strategy: PricingStrategy,
    costData: CostData,
    marketData?: MarketData,
    customizations?: Partial<PricingRule>
  ): PricingRule {
    const baseRule: PricingRule = {
      strategy,
      currency: 'USD',
      minMargin: 10,
      maxMargin: 100
    };

    switch (strategy) {
      case 'cost_plus_fixed':
        return {
          ...baseRule,
          fixedMargin: customizations?.fixedMargin || 15,
          ...customizations
        };

      case 'cost_plus_multiplier':
        return {
          ...baseRule,
          multiplier: customizations?.multiplier || 1.5,
          ...customizations
        };

      case 'dynamic_margin':
        return {
          ...baseRule,
          targetMargin: customizations?.targetMargin || 25,
          minMargin: customizations?.minMargin || 10,
          maxMargin: customizations?.maxMargin || 50,
          ...customizations
        };

      case 'competitive':
        return {
          ...baseRule,
          competitiveAdjustment: customizations?.competitiveAdjustment || true,
          targetPosition: customizations?.targetPosition || 'middle', // 'low', 'middle', 'high'
          ...customizations
        };

      case 'ai_dynamic':
        return {
          ...baseRule,
          aiOptimization: true,
          targetMargin: customizations?.targetMargin || 30,
          minMargin: customizations?.minMargin || 15,
          maxMargin: customizations?.maxMargin || 60,
          ...customizations
        };

      default:
        return baseRule;
    }
  }

  /**
   * Calculate price based on rule and data
   */
  private async calculatePrice(
    product: Product,
    rule: PricingRule,
    costData: CostData,
    marketData?: MarketData
  ): Promise<number> {
    let basePrice: number;

    switch (rule.strategy) {
      case 'cost_plus_fixed':
        basePrice = costData.totalCost + rule.fixedMargin!;
        break;

      case 'cost_plus_multiplier':
        basePrice = costData.totalCost * (rule.multiplier || 1.5);
        break;

      case 'dynamic_margin':
        basePrice = this.calculateDynamicPrice(costData.totalCost, rule, marketData);
        break;

      case 'competitive':
        basePrice = this.calculateCompetitivePrice(costData.totalCost, rule, marketData);
        break;

      case 'ai_dynamic':
        basePrice = await this.calculateAIBasedPrice(product, costData, rule, marketData);
        break;

      default:
        basePrice = costData.totalCost * 1.3; // Default 30% margin
    }

    // Apply price formatting and rounding
    return this.formatPrice(basePrice);
  }

  /**
   * Calculate dynamic price based on margin and market factors
   */
  private calculateDynamicPrice(
    cost: number,
    rule: PricingRule,
    marketData?: MarketData
  ): number {
    let margin = rule.targetMargin || 25;

    // Adjust margin based on market demand
    if (marketData) {
      const demandMultiplier = marketData.demandScore / 100; // 0-2 range
      margin = margin * (0.8 + demandMultiplier * 0.4); // ±20% adjustment
    }

    // Apply margin boundaries
    margin = Math.max(rule.minMargin || 10, Math.min(rule.maxMargin || 100, margin));

    return cost * (1 + margin / 100);
  }

  /**
   * Calculate competitive price based on market data
   */
  private calculateCompetitivePrice(
    cost: number,
    rule: PricingRule,
    marketData?: MarketData
  ): number {
    if (!marketData || !marketData.competitorPrices.length) {
      return cost * 1.3; // Default if no market data
    }

    const { targetPosition = 'middle' } = rule;
    const prices = marketData.competitorPrices.sort((a, b) => a - b);

    let targetPrice: number;
    const priceCount = prices.length;

    switch (targetPosition) {
      case 'low':
        targetPrice = prices[Math.floor(priceCount * 0.2)]; // 20th percentile
        break;
      case 'high':
        targetPrice = prices[Math.floor(priceCount * 0.8)]; // 80th percentile
        break;
      case 'middle':
      default:
        targetPrice = prices[Math.floor(priceCount * 0.5)]; // Median
        break;
    }

    // Ensure minimum margin
    const minPrice = cost * (1 + (rule.minMargin || 10) / 100);
    return Math.max(targetPrice, minPrice);
  }

  /**
   * Calculate AI-based price optimization
   */
  private async calculateAIBasedPrice(
    product: Product,
    costData: CostData,
    rule: PricingRule,
    marketData?: MarketData
  ): Promise<number> {
    // Get product performance data
    const performance = await this.getProductPerformance(product.id);

    // Calculate optimal price based on multiple factors
    let optimalPrice = costData.totalCost * 1.3; // Starting point

    // Factor 1: Historical sales performance
    const salesFactor = this.calculateSalesFactor(performance);

    // Factor 2: Market competitiveness
    const marketFactor = marketData ? this.calculateMarketFactor(marketData) : 1;

    // Factor 3: Seasonal trends
    const seasonalFactor = await this.calculateSeasonalFactor(product.id);

    // Combine factors
    const combinedFactor = salesFactor * marketFactor * seasonalFactor;
    optimalPrice *= combinedFactor;

    // Ensure margin constraints
    const minPrice = costData.totalCost * (1 + (rule.minMargin || 15) / 100);
    const maxPrice = costData.totalCost * (1 + (rule.maxMargin || 60) / 100);

    return Math.max(minPrice, Math.min(maxPrice, optimalPrice));
  }

  /**
   * Validate calculated price against business rules
   */
  private async validatePrice(
    calculatedPrice: number,
    product: Product,
    costData: CostData
  ): Promise<PricingResult> {
    const profit = calculatedPrice - costData.totalCost;
    const margin = costData.totalCost > 0 ? (profit / costData.totalCost) * 100 : 0;

    // Check minimum margin
    if (margin < 5) {
      throw new Error('Price would result in margin below 5%');
    }

    // Check price boundaries
    const finalPrice = this.formatPrice(calculatedPrice);

    return {
      finalPrice,
      totalCost: costData.totalCost,
      profit,
      margin,
      validatedAt: new Date()
    };
  }

  /**
   * Get cost data from best supplier
   */
  private async getCostData(product: Product): Promise<CostData> {
    const bestSupplier = await supplierManager.selectBestSupplier(product, 1);

    if (!bestSupplier) {
      throw new Error(`No supplier available for product ${product.id}`);
    }

    const supplierCost = await supplierManager.getProductCost(bestSupplier.id, product.sku);

    // Add shipping, fees, etc.
    const shippingCost = supplierCost.estimatedShipping || 0;
    const platformFees = supplierCost.cost * 0.03; // 3% platform fees
    const totalCost = supplierCost.cost + shippingCost + platformFees;

    return {
      baseCost: supplierCost.cost,
      shippingCost,
      platformFees,
      totalCost,
      supplierId: bestSupplier.id,
      currency: supplierCost.currency
    };
  }

  /**
   * Get market data for competitive analysis
   */
  private async getMarketData(product: Product): Promise<MarketData> {
    return await marketAnalysisService.getMarketData(product);
  }

  /**
   * Schedule price update for background processing
   */
  private async schedulePriceUpdate(job: PriceUpdateJob): Promise<void> {
    await queueManager.scheduleJob('price-update', job, {
      priority: job.priority === 'high' ? 10 : 5,
      delay: job.priority === 'high' ? 0 : 5 * 60 * 1000 // 5 minutes delay for low priority
    });
  }

  /**
   * Check if cost change is significant (>5%)
   */
  private hasSignificantCostChange(oldCost: number, newCost: number): boolean {
    const changePercentage = Math.abs((newCost - oldCost) / oldCost) * 100;
    return changePercentage > 5;
  }

  /**
   * Format price to 2 decimal places and apply psychological pricing
   */
  private formatPrice(price: number): number {
    // Round to 2 decimal places
    let formattedPrice = Math.round(price * 100) / 100;

    // Apply psychological pricing (e.g., $19.99 instead of $20.00)
    if (formattedPrice > 10) {
      formattedPrice = Math.floor(formattedPrice) - 0.01;
    }

    return formattedPrice;
  }

  /**
   * Load default pricing rules
   */
  private async loadDefaultPricingRules(): Promise<void> {
    const defaultRules: PricingRule[] = [
      {
        id: 'default-cost-plus',
        name: 'Cost + Fixed Margin',
        strategy: 'cost_plus_fixed',
        fixedMargin: 15,
        minMargin: 10,
        maxMargin: 50,
        currency: 'USD'
      },
      {
        id: 'default-multiplier',
        name: 'Cost × Multiplier',
        strategy: 'cost_plus_multiplier',
        multiplier: 1.5,
        minMargin: 20,
        maxMargin: 100,
        currency: 'USD'
      }
    ];

    for (const rule of defaultRules) {
      this.activeRules.set(rule.id, rule);
    }
  }

  /**
   * Start background price monitoring
   */
  private startPriceMonitoring(): void {
    // Monitor cost changes every 30 minutes
    setInterval(() => {
      this.monitorCostChanges().catch(console.error);
    }, 30 * 60 * 1000);

    // AI optimization every 24 hours
    setInterval(() => {
      this.optimizePricesWithAI().catch(console.error);
    }, 24 * 60 * 60 * 1000);
  }

  // Helper methods for AI calculations
  private calculateSalesFactor(performance: any): number {
    // Implementation based on sales velocity, conversion rate, etc.
    return 1.0; // Placeholder
  }

  private calculateMarketFactor(marketData: MarketData): number {
    // Implementation based on competitor pricing and demand
    return 1.0; // Placeholder
  }

  private async calculateSeasonalFactor(productId: string): Promise<number> {
    // Implementation based on historical seasonal data
    return 1.0; // Placeholder
  }

  private async getProductPerformance(productId: string): Promise<any> {
    // Implementation to fetch sales performance data
    return {}; // Placeholder
  }

  private async getOptimizationCandidates(): Promise<string[]> {
    // Implementation to get products that need optimization
    return []; // Placeholder
  }

  private async calculateAIOptimization(
    product: Product,
    marketData: MarketData,
    currentPerformance: any
  ): Promise<PriceOptimization> {
    // AI optimization logic
    return {
      productId: product.id,
      recommendedAction: 'no_change',
      recommendedMargin: 25,
      minMargin: 15,
      maxMargin: 50,
      confidence: 0.5,
      reasoning: 'AI analysis complete'
    };
  }
}

interface PricingCacheEntry {
  productId: string;
  price: number;
  cost: number;
  profit: number;
  margin: number;
  strategy: PricingStrategy;
  timestamp: Date;
  marketData?: MarketData;
  costData: CostData;
}

interface PriceUpdateJob {
  productId: string;
  reason: string;
  priority: 'low' | 'medium' | 'high';
  oldCost?: number;
  newCost?: number;
}

interface PricingResult {
  finalPrice: number;
  totalCost: number;
  profit: number;
  margin: number;
  validatedAt: Date;
}

interface BatchUpdateResult {
  total: number;
  successful: number;
  failed: number;
  results: ProductUpdateResult[];
}

interface ProductUpdateResult {
  productId: string;
  success: boolean;
  oldPrice?: number;
  newPrice?: number;
  profit?: number;
  margin?: number;
  error?: string;
}

interface AIOptimizationResult {
  totalProducts: number;
  optimizationsRecommneded: number;
  optimizationsApplied: number;
  optimizations: PriceOptimization[];
}

interface PriceOptimization {
  productId: string;
  recommendedAction: 'increase' | 'decrease' | 'no_change';
  recommendedMargin: number;
  minMargin: number;
  maxMargin: number;
  confidence: number; // 0-1
  reasoning: string;
}

export const pricingAutomationService = new PricingAutomationService();