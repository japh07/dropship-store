import {
  Vendor,
  VendorScorecard,
  VendorIssue,
  SupplierAlert,
  PurchaseOrder,
  Address
} from '@/types';

export interface VRMConfig {
  autoScoring: boolean;
  alertEnabled: boolean;
  performanceTracking: boolean;
  dataRetentionDays: number;
  scorecardReviewPeriod: number; // days
  alertThresholds: {
    performanceDrop: number;
    deliveryDelay: number; // hours
    qualityScore: number;
    communicationDelay: number; // hours
  };
}

export interface VendorMetrics {
  totalVendors: number;
  activeVendors: number;
  averageRating: number;
  totalOrders: number;
  onTimeDeliveryRate: number;
  averageLeadTime: number;
  totalIssues: number;
  criticalIssues: number;
}

export interface PerformanceData {
  vendorId: string;
  date: Date;
  onTimeDelivery: boolean;
  qualityScore: number;
  leadTime: number; // days
  communicationScore: number;
  pricingCompetitiveness: number;
  issueCount: number;
}

export interface AlertRule {
  id: string;
  name: string;
  type: SupplierAlert['type'];
  condition: {
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number;
  };
  enabled: boolean;
  severity: SupplierAlert['severity'];
}

class VRMMemoryStore {
  private vendors: Map<string, Vendor> = new Map();
  private scorecards: Map<string, VendorScorecard> = new Map();
  private issues: Map<string, VendorIssue[]> = new Map();
  private alerts: Map<string, SupplierAlert[]> = new Map();
  private purchaseOrders: Map<string, PurchaseOrder[]> = new Map();
  private performanceData: Map<string, PerformanceData[]> = new Map();

  // Vendor operations
  async getVendor(id: string): Promise<Vendor | null> {
    return this.vendors.get(id) || null;
  }

  async saveVendor(vendor: Vendor): Promise<void> {
    this.vendors.set(vendor.id, vendor);
  }

  async getAllVendors(filters?: {
    status?: string;
    category?: string;
  }): Promise<Vendor[]> {
    let vendors = Array.from(this.vendors.values());

    if (filters) {
      if (filters.status) {
        vendors = vendors.filter(v => v.status === filters.status);
      }
      if (filters.category) {
        vendors = vendors.filter(v =>
          v.products.some(p => p.category === filters.category)
        );
      }
    }

    return vendors;
  }

  async deleteVendor(id: string): Promise<void> {
    this.vendors.delete(id);
    this.scorecards.delete(id);
    this.issues.delete(id);
    this.alerts.delete(id);
    this.purchaseOrders.delete(id);
    this.performanceData.delete(id);
  }

  // Scorecard operations
  async getScorecard(vendorId: string): Promise<VendorScorecard | null> {
    return this.scorecards.get(vendorId) || null;
  }

  async saveScorecard(scorecard: VendorScorecard): Promise<void> {
    this.scorecards.set(scorecard.vendorId, scorecard);
  }

  // Issue operations
  async getIssues(vendorId: string): Promise<VendorIssue[]> {
    return this.issues.get(vendorId) || [];
  }

  async addIssue(vendorId: string, issue: VendorIssue): Promise<void> {
    const issues = this.issues.get(vendorId) || [];
    issues.push(issue);
    this.issues.set(vendorId, issues);
  }

  async updateIssue(vendorId: string, issueId: string, updates: Partial<VendorIssue>): Promise<void> {
    const issues = this.issues.get(vendorId) || [];
    const issueIndex = issues.findIndex(i => i.id === issueId);
    if (issueIndex !== -1) {
      issues[issueIndex] = { ...issues[issueIndex], ...updates };
      this.issues.set(vendorId, issues);
    }
  }

  // Alert operations
  async getAlerts(vendorId?: string): Promise<SupplierAlert[]> {
    if (vendorId) {
      return this.alerts.get(vendorId) || [];
    }

    // Return all alerts
    const allAlerts: SupplierAlert[] = [];
    this.alerts.forEach(alerts => allAlerts.push(...alerts));
    return allAlerts;
  }

  async addAlert(alert: SupplierAlert): Promise<void> {
    const alerts = this.alerts.get(alert.vendorId) || [];
    alerts.push(alert);
    this.alerts.set(alert.vendorId, alerts);
  }

  async acknowledgeAlert(vendorId: string, alertId: string): Promise<void> {
    const alerts = this.alerts.get(vendorId) || [];
    const alertIndex = alerts.findIndex(a => a.id === alertId);
    if (alertIndex !== -1) {
      alerts[alertIndex].acknowledged = true;
      alerts[alertIndex].acknowledgedAt = new Date();
      this.alerts.set(vendorId, alerts);
    }
  }

  // Purchase order operations
  async getPurchaseOrders(vendorId: string): Promise<PurchaseOrder[]> {
    return this.purchaseOrders.get(vendorId) || [];
  }

  async addPurchaseOrder(vendorId: string, order: PurchaseOrder): Promise<void> {
    const orders = this.purchaseOrders.get(vendorId) || [];
    orders.push(order);
    this.purchaseOrders.set(vendorId, orders);
  }

  async updatePurchaseOrder(vendorId: string, orderId: string, updates: Partial<PurchaseOrder>): Promise<void> {
    const orders = this.purchaseOrders.get(vendorId) || [];
    const orderIndex = orders.findIndex(o => o.id === orderId);
    if (orderIndex !== -1) {
      orders[orderIndex] = { ...orders[orderIndex], ...updates };
      this.purchaseOrders.set(vendorId, orders);
    }
  }

  // Performance data operations
  async getPerformanceData(vendorId: string, dateRange?: { start: Date; end: Date }): Promise<PerformanceData[]> {
    let data = this.performanceData.get(vendorId) || [];

    if (dateRange) {
      data = data.filter(d => d.date >= dateRange.start && d.date <= dateRange.end);
    }

    return data;
  }

  async addPerformanceData(vendorId: string, data: PerformanceData): Promise<void> {
    const existingData = this.performanceData.get(vendorId) || [];
    existingData.push(data);

    // Keep only last 365 days of data
    const cutoffDate = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const filteredData = existingData.filter(d => d.date >= cutoffDate);

    this.performanceData.set(vendorId, filteredData);
  }
}

export class VRMEngine {
  private config: VRMConfig;
  private store: VRMMemoryStore;
  private alertRules: Map<string, AlertRule> = new Map();

  constructor(config: VRMConfig) {
    this.config = config;
    this.store = new VRMMemoryStore();

    // Initialize default alert rules
    this.initializeDefaultAlertRules();

    // Start periodic tasks
    this.startPeriodicTasks();
  }

  // Vendor Management
  async createVendor(data: {
    name: string;
    contact: {
      email: string;
      phone: string;
      address: Address;
      primaryContact: string;
    };
    products: any[];
    initialMetrics?: {
      pricingCompetitiveness: number;
      averageLeadTime: number;
    };
  }): Promise<Vendor> {
    const vendorId = this.generateId();

    const vendor: Vendor = {
      id: vendorId,
      name: data.name,
      contact: data.contact,
      performance: await this.initializeScorecard(vendorId),
      products: data.products,
      metrics: {
        totalOrders: 0,
        onTimeDeliveryRate: 0,
        qualityScore: 0,
        averageLeadTime: data.initialMetrics?.averageLeadTime || 0,
        pricingCompetitiveness: data.initialMetrics?.pricingCompetitiveness || 0
      },
      reliability: {
        monthsTracked: 0,
        averageRating: 0,
        issueHistory: []
      },
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.store.saveVendor(vendor);
    await this.store.saveScorecard(vendor.performance);

    return vendor;
  }

  async updateVendor(vendorId: string, updates: Partial<Vendor>): Promise<Vendor> {
    const vendor = await this.store.getVendor(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const updatedVendor = {
      ...vendor,
      ...updates,
      updatedAt: new Date()
    };

    await this.store.saveVendor(updatedVendor);
    return updatedVendor;
  }

  async getVendor(vendorId: string): Promise<Vendor | null> {
    return await this.store.getVendor(vendorId);
  }

  async getAllVendors(filters?: {
    status?: string;
    category?: string;
    minRating?: number;
  }): Promise<Vendor[]> {
    let vendors = await this.store.getAllVendors(filters);

    if (filters?.minRating) {
      vendors = vendors.filter(v => v.reliability.averageRating >= filters.minRating!);
    }

    return vendors.sort((a, b) => b.reliability.averageRating - a.reliability.averageRating);
  }

  // Performance Tracking
  async recordPurchaseOrder(order: {
    vendorId: string;
    items: {
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
    expectedDeliveryDate?: Date;
  }): Promise<PurchaseOrder> {
    const vendor = await this.store.getVendor(order.vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const purchaseOrder: PurchaseOrder = {
      id: this.generateId(),
      vendorId: order.vendorId,
      orderNumber: this.generateOrderNumber(),
      items: order.items,
      totalAmount: order.items.reduce((sum, item) => sum + item.totalPrice, 0),
      status: 'pending',
      orderDate: new Date(),
      expectedDeliveryDate: order.expectedDeliveryDate
    };

    await this.store.addPurchaseOrder(order.vendorId, purchaseOrder);

    // Update vendor metrics
    await this.updateVendorMetrics(order.vendorId);

    return purchaseOrder;
  }

  async updateOrderStatus(
    vendorId: string,
    orderId: string,
    status: PurchaseOrder['status'],
    actualDeliveryDate?: Date,
    trackingNumber?: string
  ): Promise<void> {
    const vendor = await this.store.getVendor(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Update purchase order
    await this.store.updatePurchaseOrder(vendorId, orderId, {
      status,
      actualDeliveryDate,
      trackingNumber
    });

    // Record performance data
    if (status === 'delivered' || status === 'shipped') {
      await this.recordPerformanceData(vendorId, {
        vendorId,
        date: new Date(),
        onTimeDelivery: actualDeliveryDate ? (
          !vendor.performance.metrics.averageLeadTime ||
          actualDeliveryDate <= new Date(Date.now() + vendor.performance.metrics.averageLeadTime * 24 * 60 * 60 * 1000)
        ) : true,
        qualityScore: 5, // Default score, would be based on actual quality assessment
        leadTime: actualDeliveryDate ?
          Math.ceil((actualDeliveryDate.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) :
          vendor.performance.metrics.averageLeadTime,
        communicationScore: 4, // Default score
        pricingCompetitiveness: vendor.metrics.pricingCompetitiveness,
        issueCount: 0
      });

      // Update scorecard
      await this.updateScorecard(vendorId);
    }

    // Update vendor metrics
    await this.updateVendorMetrics(vendorId);

    // Check for alerts
    await this.checkAlerts(vendorId);
  }

  // Scorecard Management
  async generateScorecard(vendorId: string): Promise<VendorScorecard> {
    const vendor = await this.store.getVendor(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const performanceData = await this.store.getPerformanceData(vendorId);
    const issues = await this.store.getIssues(vendorId);

    // Calculate scores based on recent performance data (last 90 days)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const recentData = performanceData.filter(d => d.date >= ninetyDaysAgo);

    const pricingScore = this.calculatePricingScore(vendor);
    const deliveryScore = this.calculateDeliveryScore(recentData);
    const qualityScore = this.calculateQualityScore(recentData);
    const communicationScore = this.calculateCommunicationScore(recentData);
    const reliabilityScore = this.calculateReliabilityScore(vendor, issues);

    const weights = { pricing: 0.3, delivery: 0.25, quality: 0.2, communication: 0.15, reliability: 0.1 };
    const overallScore = Math.round(
      pricingScore * weights.pricing +
      deliveryScore * weights.delivery +
      qualityScore * weights.quality +
      communicationScore * weights.communication +
      reliabilityScore * weights.reliability
    );

    const scorecard: VendorScorecard = {
      vendorId,
      overallScore,
      metrics: {
        pricing: {
          score: pricingScore,
          weight: weights.pricing * 100,
          trend: this.calculateTrend(recentData, 'pricingCompetitiveness')
        },
        delivery: {
          score: deliveryScore,
          weight: weights.delivery * 100,
          trend: this.calculateTrend(recentData, 'onTimeDelivery')
        },
        quality: {
          score: qualityScore,
          weight: weights.quality * 100,
          trend: this.calculateTrend(recentData, 'qualityScore')
        },
        communication: {
          score: communicationScore,
          weight: weights.communication * 100,
          trend: this.calculateTrend(recentData, 'communicationScore')
        },
        reliability: {
          score: reliabilityScore,
          weight: weights.reliability * 100,
          trend: 'stable'
        }
      },
      lastUpdated: new Date(),
      reviewPeriod: `${this.config.scorecardReviewPeriod} days`
    };

    await this.store.saveScorecard(scorecard);
    await this.store.saveVendor({
      ...vendor,
      performance: scorecard
    });

    return scorecard;
  }

  async updateScorecard(vendorId: string): Promise<VendorScorecard> {
    return await this.generateScorecard(vendorId);
  }

  // Issue Management
  async createIssue(vendorId: string, issue: {
    type: VendorIssue['type'];
    severity: VendorIssue['severity'];
    description: string;
  }): Promise<VendorIssue> {
    const vendor = await this.store.getVendor(vendorId);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    const vendorIssue: VendorIssue = {
      id: this.generateId(),
      ...issue,
      status: 'open',
      createdAt: new Date()
    };

    await this.store.addIssue(vendorId, vendorIssue);

    // Update vendor reliability
    await this.updateVendorReliability(vendorId);

    // Check for alerts
    await this.checkAlerts(vendorId);

    return vendorIssue;
  }

  async resolveIssue(vendorId: string, issueId: string, resolution: string): Promise<void> {
    await this.store.updateIssue(vendorId, issueId, {
      status: 'resolved',
      resolution,
      resolvedAt: new Date()
    });

    // Update vendor reliability
    await this.updateVendorReliability(vendorId);
  }

  // Alert Management
  async createAlert(alert: {
    vendorId: string;
    type: SupplierAlert['type'];
    severity: SupplierAlert['severity'];
    title: string;
    message: string;
    recommendations?: string[];
  }): Promise<SupplierAlert> {
    const supplierAlert: SupplierAlert = {
      id: this.generateId(),
      ...alert,
      acknowledged: false,
      createdAt: new Date()
    };

    await this.store.addAlert(supplierAlert);
    return supplierAlert;
  }

  async acknowledgeAlert(vendorId: string, alertId: string): Promise<void> {
    await this.store.acknowledgeAlert(vendorId, alertId);
  }

  async getAlerts(vendorId?: string, unacknowledgedOnly?: boolean): Promise<SupplierAlert[]> {
    let alerts = await this.store.getAlerts(vendorId);

    if (unacknowledgedOnly) {
      alerts = alerts.filter(a => !a.acknowledged);
    }

    return alerts.sort((a, b) => {
      const severityOrder = { 'critical': 4, 'error': 3, 'warning': 2, 'info': 1 };
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
      if (severityDiff !== 0) return severityDiff;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  }

  // Analytics
  async getMetrics(): Promise<VendorMetrics> {
    const vendors = await this.store.getAllVendors();
    const allOrders: PurchaseOrder[] = [];
    const allIssues: VendorIssue[] = [];

    for (const vendor of vendors) {
      const orders = await this.store.getPurchaseOrders(vendor.id);
      const issues = await this.store.getIssues(vendor.id);
      allOrders.push(...orders);
      allIssues.push(...issues);
    }

    const deliveredOrders = allOrders.filter(o => o.status === 'delivered');
    const onTimeDeliveries = deliveredOrders.filter(o => {
      if (!o.expectedDeliveryDate || !o.actualDeliveryDate) return true;
      return o.actualDeliveryDate <= o.expectedDeliveryDate;
    });

    const totalIssues = allIssues.length;
    const criticalIssues = allIssues.filter(i => i.severity === 'critical').length;

    return {
      totalVendors: vendors.length,
      activeVendors: vendors.filter(v => v.status === 'active').length,
      averageRating: vendors.length > 0 ?
        vendors.reduce((sum, v) => sum + v.reliability.averageRating, 0) / vendors.length : 0,
      totalOrders: allOrders.length,
      onTimeDeliveryRate: deliveredOrders.length > 0 ?
        (onTimeDeliveries.length / deliveredOrders.length) * 100 : 0,
      averageLeadTime: vendors.length > 0 ?
        vendors.reduce((sum, v) => sum + v.metrics.averageLeadTime, 0) / vendors.length : 0,
      totalIssues,
      criticalIssues
    };
  }

  // Private helper methods
  private async initializeScorecard(vendorId: string): Promise<VendorScorecard> {
    return {
      vendorId,
      overallScore: 0,
      metrics: {
        pricing: { score: 0, weight: 30, trend: 'stable' },
        delivery: { score: 0, weight: 25, trend: 'stable' },
        quality: { score: 0, weight: 20, trend: 'stable' },
        communication: { score: 0, weight: 15, trend: 'stable' },
        reliability: { score: 0, weight: 10, trend: 'stable' }
      },
      lastUpdated: new Date(),
      reviewPeriod: `${this.config.scorecardReviewPeriod} days`
    };
  }

  private async updateVendorMetrics(vendorId: string): Promise<void> {
    const vendor = await this.store.getVendor(vendorId);
    if (!vendor) return;

    const orders = await this.store.getPurchaseOrders(vendorId);
    const performanceData = await this.store.getPerformanceData(vendorId);

    const totalOrders = orders.length;
    const deliveredOrders = orders.filter(o => o.status === 'delivered');
    const onTimeDeliveries = deliveredOrders.filter(o => {
      if (!o.expectedDeliveryDate || !o.actualDeliveryDate) return true;
      return o.actualDeliveryDate <= o.expectedDeliveryDate;
    });

    const onTimeDeliveryRate = deliveredOrders.length > 0 ?
      (onTimeDeliveries.length / deliveredOrders.length) * 100 : 0;

    const averageLeadTime = performanceData.length > 0 ?
      performanceData.reduce((sum, d) => sum + d.leadTime, 0) / performanceData.length : 0;

    const qualityScore = performanceData.length > 0 ?
      performanceData.reduce((sum, d) => sum + d.qualityScore, 0) / performanceData.length : 0;

    const updatedVendor = {
      ...vendor,
      metrics: {
        ...vendor.metrics,
        totalOrders,
        onTimeDeliveryRate,
        qualityScore,
        averageLeadTime
      }
    };

    await this.store.saveVendor(updatedVendor);
  }

  private async updateVendorReliability(vendorId: string): Promise<void> {
    const vendor = await this.store.getVendor(vendorId);
    if (!vendor) return;

    const issues = await this.store.getIssues(vendorId);
    const resolvedIssues = issues.filter(i => i.status === 'resolved');
    const criticalIssues = issues.filter(i => i.severity === 'critical');

    // Calculate average rating based on scorecard and issues
    const scorecard = await this.store.getScorecard(vendorId);
    const baseRating = scorecard?.overallScore || 0;

    // Deduct points for unresolved issues
    const issuePenalty = Math.min(20, issues.filter(i => i.status === 'open').length * 5);
    const criticalPenalty = Math.min(30, criticalIssues.length * 10);

    const averageRating = Math.max(0, baseRating - issuePenalty - criticalPenalty);

    const updatedVendor = {
      ...vendor,
      reliability: {
        ...vendor.reliability,
        averageRating,
        issueHistory: issues
      }
    };

    await this.store.saveVendor(updatedVendor);
  }

  private async recordPerformanceData(vendorId: string, data: PerformanceData): Promise<void> {
    await this.store.addPerformanceData(vendorId, data);
  }

  private async checkAlerts(vendorId: string): Promise<void> {
    if (!this.config.alertEnabled) return;

    const vendor = await this.store.getVendor(vendorId);
    if (!vendor) return;

    const performanceData = await this.store.getPerformanceData(vendorId);
    const issues = await this.store.getIssues(vendorId);

    // Check performance drop
    if (performanceData.length >= 2) {
      const recent = performanceData.slice(-5);
      const older = performanceData.slice(-10, -5);

      if (older.length > 0) {
        const recentAvg = recent.reduce((sum, d) => sum + d.qualityScore, 0) / recent.length;
        const olderAvg = older.reduce((sum, d) => sum + d.qualityScore, 0) / older.length;

        if (recentAvg < olderAvg - this.config.alertThresholds.performanceDrop) {
          await this.createAlert({
            vendorId,
            type: 'performance_drop',
            severity: 'warning',
            title: 'Performance Decline Detected',
            message: `Vendor quality score has dropped from ${olderAvg.toFixed(1)} to ${recentAvg.toFixed(1)}`,
            recommendations: [
              'Review recent quality issues',
              'Contact vendor for explanation',
              'Consider increased inspection'
            ]
          });
        }
      }
    }

    // Check for high number of issues
    const recentIssues = issues.filter(i =>
      i.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    );

    if (recentIssues.length >= 3) {
      await this.createAlert({
        vendorId,
        type: 'quality_problem',
        severity: recentIssues.filter(i => i.severity === 'critical').length > 0 ? 'critical' : 'error',
        title: 'Multiple Quality Issues',
        message: `${recentIssues.length} issues reported in the last 30 days`,
        recommendations: [
          'Review all recent issues',
          'Schedule vendor meeting',
          'Consider temporary suspension'
        ]
      });
    }

    // Check delivery performance
    if (vendor.metrics.onTimeDeliveryRate < 80) {
      await this.createAlert({
        vendorId,
        type: 'delivery_issue',
        severity: vendor.metrics.onTimeDeliveryRate < 60 ? 'critical' : 'warning',
        title: 'Poor Delivery Performance',
        message: `On-time delivery rate is ${vendor.metrics.onTimeDeliveryRate.toFixed(1)}%`,
        recommendations: [
          'Review delivery delays',
          'Adjust lead time expectations',
          'Consider backup suppliers'
        ]
      });
    }
  }

  private calculatePricingScore(vendor: Vendor): number {
    // In a real implementation, this would compare vendor pricing to market rates
    return Math.min(100, Math.max(0, vendor.metrics.pricingCompetitiveness * 20));
  }

  private calculateDeliveryScore(performanceData: PerformanceData[]): number {
    if (performanceData.length === 0) return 0;

    const onTimeDeliveries = performanceData.filter(d => d.onTimeDelivery).length;
    return (onTimeDeliveries / performanceData.length) * 100;
  }

  private calculateQualityScore(performanceData: PerformanceData[]): number {
    if (performanceData.length === 0) return 0;

    const totalQuality = performanceData.reduce((sum, d) => sum + d.qualityScore, 0);
    return (totalQuality / performanceData.length) * 20; // Scale to 0-100
  }

  private calculateCommunicationScore(performanceData: PerformanceData[]): number {
    if (performanceData.length === 0) return 0;

    const totalCommunication = performanceData.reduce((sum, d) => sum + d.communicationScore, 0);
    return (totalCommunication / performanceData.length) * 20; // Scale to 0-100
  }

  private calculateReliabilityScore(vendor: Vendor, issues: VendorIssue[]): number {
    const baseScore = 100;
    const openIssues = issues.filter(i => i.status === 'open');
    const criticalIssues = openIssues.filter(i => i.severity === 'critical');

    // Deduct points for issues
    const issuePenalty = Math.min(50, openIssues.length * 10);
    const criticalPenalty = Math.min(70, criticalIssues.length * 20);

    return Math.max(0, baseScore - issuePenalty - criticalPenalty);
  }

  private calculateTrend(performanceData: PerformanceData[], field: keyof PerformanceData): 'up' | 'down' | 'stable' {
    if (performanceData.length < 6) return 'stable';

    const recent = performanceData.slice(-3);
    const older = performanceData.slice(-6, -3);

    const recentAvg = recent.reduce((sum, d) => sum + (d[field] as number), 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + (d[field] as number), 0) / older.length;

    const difference = recentAvg - olderAvg;
    const threshold = olderAvg * 0.05; // 5% threshold

    if (difference > threshold) return 'up';
    if (difference < -threshold) return 'down';
    return 'stable';
  }

  private initializeDefaultAlertRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'performance-drop',
        name: 'Performance Drop',
        type: 'performance_drop',
        condition: { field: 'qualityScore', operator: 'lt', value: 70 },
        enabled: true,
        severity: 'warning'
      },
      {
        id: 'delivery-delay',
        name: 'Delivery Delay',
        type: 'delivery_issue',
        condition: { field: 'onTimeDeliveryRate', operator: 'lt', value: 80 },
        enabled: true,
        severity: 'warning'
      },
      {
        id: 'quality-issue',
        name: 'Quality Issue',
        type: 'quality_problem',
        condition: { field: 'issueCount', operator: 'gte', value: 3 },
        enabled: true,
        severity: 'error'
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  private startPeriodicTasks(): void {
    // Update scorecards periodically
    if (this.config.autoScoring) {
      setInterval(async () => {
        const vendors = await this.store.getAllVendors();
        for (const vendor of vendors) {
          try {
            await this.updateScorecard(vendor.id);
          } catch (error) {
            console.error(`Failed to update scorecard for vendor ${vendor.id}:`, error);
          }
        }
      }, this.config.scorecardReviewPeriod * 24 * 60 * 60 * 1000); // Convert days to milliseconds
    }

    // Check alerts periodically
    if (this.config.alertEnabled) {
      setInterval(async () => {
        const vendors = await this.store.getAllVendors();
        for (const vendor of vendors) {
          try {
            await this.checkAlerts(vendor.id);
          } catch (error) {
            console.error(`Failed to check alerts for vendor ${vendor.id}:`, error);
          }
        }
      }, 60 * 60 * 1000); // Check every hour
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateOrderNumber(): string {
    const date = new Date();
    const dateStr = date.getFullYear().toString() +
                   (date.getMonth() + 1).toString().padStart(2, '0') +
                   date.getDate().toString().padStart(2, '0');
    const random = Math.random().toString(36).substr(2, 6).toUpperCase();
    return `PO-${dateStr}-${random}`;
  }
}

// Default VRM configuration
export const defaultVRMConfig: VRMConfig = {
  autoScoring: true,
  alertEnabled: true,
  performanceTracking: true,
  dataRetentionDays: 730, // 2 years
  scorecardReviewPeriod: 30, // 30 days
  alertThresholds: {
    performanceDrop: 15,
    deliveryDelay: 48, // 48 hours
    qualityScore: 70,
    communicationDelay: 24 // 24 hours
  }
};

// Export singleton instance
export const vrmEngine = new VRMEngine(defaultVRMConfig);