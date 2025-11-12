import { auditLogger } from './audit-logger';
import { productRepository } from './product-repository';
import { supplierManager } from './supplier-manager';
import { notificationService } from './notification-service';
import { queueManager } from './queue-manager';
import type { Product, InventorySyncResult, StockAlert, InventoryThreshold } from '@/types';

export class InventoryAutomationService {
  private syncCache = new Map<string, InventoryCacheEntry>();
  private activeAlerts = new Set<string>();
  private syncInProgress = new Set<string>();
  private thresholds = new Map<string, InventoryThreshold>();

  /**
   * Initialize inventory automation
   */
  async initialize(): Promise<void> {
    // Load inventory thresholds
    await this.loadInventoryThresholds();

    // Start continuous inventory monitoring
    this.startInventoryMonitoring();

    console.log('Inventory automation initialized');
  }

  /**
   * Sync inventory with all suppliers for specific products
   */
  async syncInventory(productIds?: string[]): Promise<BatchInventoryResult> {
    const targetProducts = productIds || await this.getAllTrackedProducts();
    const results: InventorySyncResult[] = [];

    for (const productId of targetProducts) {
      if (this.syncInProgress.has(productId)) {
        continue; // Skip if already syncing
      }

      const result = await this.syncProductInventory(productId);
      results.push(result);
    }

    // Generate summary
    const summary = this.generateSyncSummary(results);

    // Log batch sync
    await auditLogger.logInventoryEvent('batch_inventory_sync', summary);

    return summary;
  }

  /**
   * Sync inventory for a single product across all suppliers
   */
  async syncProductInventory(productId: string): Promise<InventorySyncResult> {
    if (this.syncInProgress.has(productId)) {
      throw new Error(`Inventory sync already in progress for product ${productId}`);
    }

    this.syncInProgress.add(productId);

    try {
      const product = await productRepository.getById(productId);
      if (!product) {
        throw new Error(`Product not found: ${productId}`);
      }

      // Get all suppliers that have this product
      const suppliers = await supplierManager.getSuppliersForProduct(productId);
      if (suppliers.length === 0) {
        throw new Error(`No suppliers found for product ${productId}`);
      }

      const supplierStock: SupplierStockInfo[] = [];
      let totalStock = 0;
      let hasErrors = false;

      // Check stock with each supplier
      for (const supplier of suppliers) {
        try {
          const stockInfo = await supplierManager.getProductStock(supplier.id, product.sku);

          supplierStock.push({
            supplierId: supplier.id,
            supplierName: supplier.name,
            stock: stockInfo.quantity,
            lastUpdated: stockInfo.lastUpdated,
            price: stockInfo.price,
            currency: stockInfo.currency,
            available: stockInfo.available
          });

          totalStock += stockInfo.quantity;

        } catch (error) {
          console.error(`Failed to sync stock with supplier ${supplier.name}:`, error);
          hasErrors = true;

          supplierStock.push({
            supplierId: supplier.id,
            supplierName: supplier.name,
            stock: 0,
            lastUpdated: new Date(),
            error: error.message,
            available: false
          });
        }
      }

      // Determine overall stock status
      const stockStatus = this.determineStockStatus(totalStock, product);

      // Update product inventory in database
      const updateSuccess = await productRepository.updateInventory(productId, {
        totalStock,
        availableStock: totalStock,
        stockStatus,
        lastInventorySync: new Date(),
        supplierStock: supplierStock
      });

      // Cache the sync result
      const cacheEntry: InventoryCacheEntry = {
        productId,
        totalStock,
        stockStatus,
        lastSync: new Date(),
        supplierStock
      };

      this.syncCache.set(productId, cacheEntry);

      // Check for stock alerts
      await this.checkStockAlerts(productId, totalStock, product);

      // Handle auto-pause/resume based on stock
      await this.handleStockActions(productId, stockStatus, product);

      // Log sync result
      await auditLogger.logInventoryEvent('product_inventory_synced', {
        productId,
        productSku: product.sku,
        totalStock,
        stockStatus,
        suppliersChecked: suppliers.length,
        syncErrors: hasErrors,
        updateSuccess
      });

      return {
        productId,
        success: updateSuccess,
        totalStock,
        stockStatus,
        suppliers: supplierStock,
        syncTime: new Date(),
        hasErrors
      };

    } finally {
      this.syncInProgress.delete(productId);
    }
  }

  /**
   * Real-time inventory monitoring for critical products
   */
  async startRealTimeMonitoring(productIds: string[]): Promise<void> {
    for (const productId of productIds) {
      // Schedule frequent sync for high-priority products
      await queueManager.scheduleJob('inventory-sync', {
        productId,
        priority: 'high',
        realTime: true
      }, {
        repeat: { interval: 5 * 60 * 1000 }, // Every 5 minutes
        priority: 15
      });
    }

    await auditLogger.logInventoryEvent('real_time_monitoring_started', {
      productCount: productIds.length,
      syncInterval: '5 minutes'
    });
  }

  /**
   * Set custom inventory thresholds for products
   */
  async setInventoryThreshold(productId: string, threshold: InventoryThreshold): Promise<void> {
    // Validate threshold
    if (threshold.lowStockThreshold >= threshold.outOfStockThreshold) {
      throw new Error('Low stock threshold must be less than out of stock threshold');
    }

    // Save threshold
    this.thresholds.set(productId, threshold);

    // Persist to database
    await productRepository.updateInventoryThreshold(productId, threshold);

    await auditLogger.logInventoryEvent('inventory_threshold_set', {
      productId,
      lowStockThreshold: threshold.lowStockThreshold,
      outOfStockThreshold: threshold.outOfStockThreshold,
      autoPauseThreshold: threshold.autoPauseThreshold
    });
  }

  /**
   * Get inventory status and alerts for dashboard
   */
  async getInventoryOverview(): Promise<InventoryOverview> {
    const allProducts = await productRepository.getAllTrackedProducts();

    const overview: InventoryOverview = {
      totalProducts: allProducts.length,
      inStock: 0,
      lowStock: 0,
      outOfStock: 0,
      paused: 0,
      criticalAlerts: 0,
      warnings: 0,
      lastSyncTime: new Date(),
      alerts: []
    };

    for (const product of allProducts) {
      const cacheEntry = this.syncCache.get(product.id);
      const currentStock = cacheEntry?.totalStock || 0;
      const isPaused = product.status === 'paused';

      // Categorize stock status
      if (currentStock === 0) {
        overview.outOfStock++;
      } else if (currentStock <= (this.thresholds.get(product.id)?.lowStockThreshold || 5)) {
        overview.lowStock++;
      } else {
        overview.inStock++;
      }

      if (isPaused) {
        overview.paused++;
      }

      // Check for alerts
      const alert = await this.generateStockAlert(product, currentStock);
      if (alert) {
        overview.alerts.push(alert);

        if (alert.severity === 'critical') {
          overview.criticalAlerts++;
        } else {
          overview.warnings++;
        }
      }
    }

    return overview;
  }

  /**
   * Force sync inventory for all products
   */
  async forceFullSync(): Promise<BatchInventoryResult> {
    console.log('Starting full inventory sync...');

    const result = await this.syncInventory();

    console.log(`Full inventory sync completed: ${result.successful}/${result.total} products updated`);

    return result;
  }

  /**
   * Get detailed inventory report for analysis
   */
  async generateInventoryReport(filters?: InventoryReportFilters): Promise<InventoryReport> {
    const products = await this.getFilteredProducts(filters);
    const report: InventoryReport = {
      generatedAt: new Date(),
      filters: filters || {},
      summary: {
        totalProducts: products.length,
        totalValue: 0,
        totalStock: 0,
        productsOutOfStock: 0,
        productsLowStock: 0,
        averageDaysOfStock: 0,
        suppliersWithIssues: new Set()
      },
      products: [],
      alerts: [],
      recommendations: []
    };

    for (const product of products) {
      const cacheEntry = this.syncCache.get(product.id);
      const currentStock = cacheEntry?.totalStock || 0;

      const productReport: ProductInventoryReport = {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        currentStock,
        status: this.determineStockStatus(currentStock, product),
        lastSync: cacheEntry?.lastSync,
        supplierStock: cacheEntry?.supplierStock || [],
        threshold: this.thresholds.get(product.id),
        daysOfStock: this.calculateDaysOfStock(product, currentStock),
        value: currentStock * (product.cost || 0),
        actionNeeded: this.determineRequiredAction(product, currentStock)
      };

      report.products.push(productReport);

      // Update summary
      report.summary.totalStock += currentStock;
      report.summary.totalValue += productReport.value;

      if (currentStock === 0) {
        report.summary.productsOutOfStock++;
      } else if (currentStock <= (this.thresholds.get(product.id)?.lowStockThreshold || 5)) {
        report.summary.productsLowStock++;
      }

      // Check for supplier issues
      if (cacheEntry?.supplierStock.some(s => s.error)) {
        cacheEntry.supplierStock.forEach(s => {
          if (s.error) {
            report.summary.suppliersWithIssues.add(s.supplierId);
          }
        });
      }

      // Generate alerts
      const alert = await this.generateStockAlert(product, currentStock);
      if (alert) {
        report.alerts.push(alert);
      }
    }

    // Calculate averages
    if (products.length > 0) {
      report.summary.averageDaysOfStock =
        report.products.reduce((sum, p) => sum + p.daysOfStock, 0) / products.length;
    }

    // Generate recommendations
    report.recommendations = this.generateInventoryRecommendations(report);

    return report;
  }

  /**
   * Handle stock-based actions (pause/resume listings)
   */
  private async handleStockActions(productId: string, stockStatus: string, product: Product): Promise<void> {
    const threshold = this.thresholds.get(productId);
    const cacheEntry = this.syncCache.get(productId);
    const currentStock = cacheEntry?.totalStock || 0;

    try {
      // Auto-pause if stock is critically low
      if (threshold?.autoPauseThreshold && currentStock <= threshold.autoPauseThreshold) {
        if (product.status !== 'paused') {
          await productRepository.updateStatus(productId, 'paused');

          await notificationService.sendStockAlert({
            productId,
            productName: product.name,
            type: 'auto_paused',
            currentStock,
            threshold: threshold.autoPauseThreshold
          });

          await auditLogger.logInventoryEvent('product_auto_paused', {
            productId,
            currentStock,
            threshold: threshold.autoPauseThreshold
          });
        }
      }
      // Auto-resume if stock is restored
      else if (product.status === 'paused' && currentStock > (threshold?.autoPauseThreshold || 0)) {
        await productRepository.updateStatus(productId, 'active');

        await notificationService.sendStockAlert({
          productId,
          productName: product.name,
          type: 'auto_resumed',
          currentStock
        });

        await auditLogger.logInventoryEvent('product_auto_resumed', {
          productId,
          currentStock
        });
      }

    } catch (error) {
      console.error(`Failed to handle stock actions for product ${productId}:`, error);
    }
  }

  /**
   * Check and generate stock alerts
   */
  private async checkStockAlerts(productId: string, currentStock: number, product: Product): Promise<void> {
    const threshold = this.thresholds.get(productId);
    const alertKey = `${productId}-${currentStock}`;

    // Avoid duplicate alerts
    if (this.activeAlerts.has(alertKey)) {
      return;
    }

    let alertType: StockAlert['type'] | null = null;
    let severity: 'warning' | 'critical' = 'warning';

    // Check alert conditions
    if (currentStock === 0) {
      alertType = 'out_of_stock';
      severity = 'critical';
    } else if (threshold && currentStock <= threshold.lowStockThreshold) {
      alertType = 'low_stock';
      severity = currentStock <= threshold.outOfStockThreshold ? 'critical' : 'warning';
    }

    if (alertType) {
      this.activeAlerts.add(alertKey);

      // Send notification
      await notificationService.sendStockAlert({
        productId,
        productName: product.name,
        sku: product.sku,
        type: alertType,
        currentStock,
        threshold: threshold?.lowStockThreshold,
        severity
      });

      // Log alert
      await auditLogger.logInventoryEvent('stock_alert_generated', {
        productId,
        alertType,
        currentStock,
        severity
      });

      // Remove from active alerts after 1 hour
      setTimeout(() => {
        this.activeAlerts.delete(alertKey);
      }, 60 * 60 * 1000);
    }
  }

  /**
   * Determine stock status based on quantity
   */
  private determineStockStatus(stock: number, product: Product): string {
    const threshold = this.thresholds.get(product.id);

    if (stock === 0) return 'out_of_stock';
    if (threshold && stock <= threshold.outOfStockThreshold) return 'critical';
    if (threshold && stock <= threshold.lowStockThreshold) return 'low_stock';
    return 'in_stock';
  }

  /**
   * Calculate days of stock based on sales velocity
   */
  private calculateDaysOfStock(product: Product, currentStock: number): number {
    // Implementation would use historical sales data
    const dailySalesVelocity = product.averageDailySales || 1;
    return dailySalesVelocity > 0 ? Math.floor(currentStock / dailySalesVelocity) : 999;
  }

  /**
   * Determine what action is needed for a product
   */
  private determineRequiredAction(product: Product, currentStock: number): string[] {
    const actions: string[] = [];
    const threshold = this.thresholds.get(product.id);

    if (currentStock === 0) {
      actions.push('RESTOCK_IMMEDIATELY');
      actions.push('PAUSE_LISTING');
    } else if (threshold && currentStock <= threshold.lowStockThreshold) {
      actions.push('RESTOCK_SOON');
      if (currentStock <= threshold.outOfStockThreshold) {
        actions.push('CONSIDER_PAUSING');
      }
    }

    return actions;
  }

  /**
   * Generate stock alert for reporting
   */
  private async generateStockAlert(product: Product, currentStock: number): Promise<StockAlert | null> {
    const threshold = this.thresholds.get(product.id);

    if (currentStock === 0) {
      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        type: 'out_of_stock',
        severity: 'critical',
        currentStock,
        threshold: 0,
        createdAt: new Date(),
        message: `Product ${product.name} is out of stock`
      };
    }

    if (threshold && currentStock <= threshold.lowStockThreshold) {
      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        type: 'low_stock',
        severity: currentStock <= threshold.outOfStockThreshold ? 'critical' : 'warning',
        currentStock,
        threshold: threshold.lowStockThreshold,
        createdAt: new Date(),
        message: `Product ${product.name} has low stock: ${currentStock} units`
      };
    }

    return null;
  }

  /**
   * Generate inventory recommendations
   */
  private generateInventoryRecommendations(report: InventoryReport): string[] {
    const recommendations: string[] = [];

    if (report.summary.productsOutOfStock > 0) {
      recommendations.push(`Restock ${report.summary.productsOutOfStock} out-of-stock products immediately`);
    }

    if (report.summary.productsLowStock > report.summary.totalProducts * 0.2) {
      recommendations.push('Review inventory thresholds - too many products are running low');
    }

    if (report.summary.averageDaysOfStock < 7) {
      recommendations.push('Increase safety stock levels - average inventory coverage is low');
    }

    if (report.summary.suppliersWithIssues.size > 0) {
      recommendations.push(`Address supplier sync issues with ${report.summary.suppliersWithIssues.size} suppliers`);
    }

    return recommendations;
  }

  /**
   * Generate sync summary
   */
  private generateSyncSummary(results: InventorySyncResult[]): BatchInventoryResult {
    const summary: BatchInventoryResult = {
      total: results.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      totalProducts: results.length,
      totalStock: results.reduce((sum, r) => sum + r.totalStock, 0),
      outOfStockCount: results.filter(r => r.stockStatus === 'out_of_stock').length,
      lowStockCount: results.filter(r => r.stockStatus === 'low_stock').length,
      syncTime: new Date(),
      results
    };

    return summary;
  }

  /**
   * Load inventory thresholds from database
   */
  private async loadInventoryThresholds(): Promise<void> {
    // Implementation would load from database
    const defaultThreshold: InventoryThreshold = {
      lowStockThreshold: 10,
      outOfStockThreshold: 0,
      autoPauseThreshold: 5
    };

    // Set default for all products initially
    const allProducts = await productRepository.getAllTrackedProducts();
    for (const product of allProducts) {
      this.thresholds.set(product.id, defaultThreshold);
    }
  }

  /**
   * Start continuous inventory monitoring
   */
  private startInventoryMonitoring(): void {
    // Regular inventory sync every 2 hours
    setInterval(() => {
      this.syncInventory().catch(console.error);
    }, 2 * 60 * 60 * 1000);

    // Critical stock check every 30 minutes
    setInterval(() => {
      this.checkCriticalStockLevels().catch(console.error);
    }, 30 * 60 * 1000);
  }

  /**
   * Check critical stock levels more frequently
   */
  private async checkCriticalStockLevels(): Promise<void> {
    const criticalProducts = Array.from(this.thresholds.entries())
      .filter(([_, threshold]) => threshold.autoPauseThreshold)
      .map(([productId, _]) => productId);

    if (criticalProducts.length > 0) {
      await this.syncInventory(criticalProducts);
    }
  }

  /**
   * Get all tracked products
   */
  private async getAllTrackedProducts(): Promise<string[]> {
    const products = await productRepository.getAllTrackedProducts();
    return products.map(p => p.id);
  }

  /**
   * Get filtered products for reporting
   */
  private async getFilteredProducts(filters?: InventoryReportFilters): Promise<Product[]> {
    // Implementation would apply filters
    return await productRepository.getAllTrackedProducts();
  }
}

// Type definitions
interface InventoryCacheEntry {
  productId: string;
  totalStock: number;
  stockStatus: string;
  lastSync: Date;
  supplierStock: SupplierStockInfo[];
}

interface SupplierStockInfo {
  supplierId: string;
  supplierName: string;
  stock: number;
  lastUpdated: Date;
  price?: number;
  currency?: string;
  available?: boolean;
  error?: string;
}

interface BatchInventoryResult {
  total: number;
  successful: number;
  failed: number;
  totalProducts: number;
  totalStock: number;
  outOfStockCount: number;
  lowStockCount: number;
  syncTime: Date;
  results: InventorySyncResult[];
}

interface InventoryOverview {
  totalProducts: number;
  inStock: number;
  lowStock: number;
  outOfStock: number;
  paused: number;
  criticalAlerts: number;
  warnings: number;
  lastSyncTime: Date;
  alerts: StockAlert[];
}

interface InventoryReport {
  generatedAt: Date;
  filters: InventoryReportFilters;
  summary: {
    totalProducts: number;
    totalValue: number;
    totalStock: number;
    productsOutOfStock: number;
    productsLowStock: number;
    averageDaysOfStock: number;
    suppliersWithIssues: Set<string>;
  };
  products: ProductInventoryReport[];
  alerts: StockAlert[];
  recommendations: string[];
}

interface ProductInventoryReport {
  productId: string;
  sku: string;
  name: string;
  currentStock: number;
  status: string;
  lastSync?: Date;
  supplierStock: SupplierStockInfo[];
  threshold?: InventoryThreshold;
  daysOfStock: number;
  value: number;
  actionNeeded: string[];
}

interface InventoryReportFilters {
  status?: string;
  supplier?: string;
  lowStockOnly?: boolean;
  outOfStockOnly?: boolean;
  categoryId?: string;
}

export const inventoryAutomationService = new InventoryAutomationService();