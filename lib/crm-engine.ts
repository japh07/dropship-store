import {
  Customer,
  CustomerSegment,
  LoyaltyStatus,
  Referral,
  AbandonedCart,
  CustomerSegment as CustomerSegmentType
} from '@/types';

export interface CRMConfig {
  autoSegmentation: boolean;
  loyaltyEnabled: boolean;
  abandonedCartEnabled: boolean;
  referralEnabled: boolean;
  recommendationEnabled: boolean;
  emailServiceEnabled: boolean;
  dataRetentionDays: number;
}

export interface CustomerMetrics {
  totalCustomers: number;
  activeCustomers: number;
  newCustomersThisMonth: number;
  customerRetentionRate: number;
  averageLifetimeValue: number;
  averageOrderValue: number;
  churnRate: number;
}

export interface SegmentCriteria {
  field: string;
  operator: 'eq' | 'gt' | 'lt' | 'in' | 'contains' | 'between';
  value: any;
}

export interface RecommendationEngine {
  generateRecommendations(customerId: string, limit?: number): Promise<string[]>;
  updateCustomerPreferences(customerId: string, preferences: any): Promise<void>;
  getSimilarProducts(productId: string, limit?: number): Promise<string[]>;
}

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
}

export interface CampaignConfig {
  id: string;
  name: string;
  type: 'abandoned_cart' | 'loyalty' | 'referral' | 'promotion' | 'newsletter';
  triggers: string[];
  template: EmailTemplate;
  enabled: boolean;
  schedule: {
    frequency: 'immediate' | 'daily' | 'weekly' | 'monthly';
    time?: string;
    days?: number[];
  };
}

class CRMMemoryStore {
  private customers: Map<string, Customer> = new Map();
  private segments: Map<string, CustomerSegment> = new Map();
  private loyaltyStatuses: Map<string, LoyaltyStatus> = new Map();
  private referrals: Map<string, Referral[]> = new Map();
  private abandonedCarts: Map<string, AbandonedCart[]> = new Map();
  private customerBehavior: Map<string, any> = new Map();

  // Customer operations
  async getCustomer(id: string): Promise<Customer | null> {
    return this.customers.get(id) || null;
  }

  async saveCustomer(customer: Customer): Promise<void> {
    this.customers.set(customer.id, customer);
  }

  async getAllCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async deleteCustomer(id: string): Promise<void> {
    this.customers.delete(id);
    this.loyaltyStatuses.delete(id);
    this.referrals.delete(id);
    this.abandonedCarts.delete(id);
    this.customerBehavior.delete(id);
  }

  // Segment operations
  async getSegment(id: string): Promise<CustomerSegment | null> {
    return this.segments.get(id) || null;
  }

  async saveSegment(segment: CustomerSegment): Promise<void> {
    this.segments.set(segment.id, segment);
  }

  async getAllSegments(): Promise<CustomerSegment[]> {
    return Array.from(this.segments.values());
  }

  async deleteSegment(id: string): Promise<void> {
    this.segments.delete(id);
  }

  // Loyalty operations
  async getLoyaltyStatus(customerId: string): Promise<LoyaltyStatus | null> {
    return this.loyaltyStatuses.get(customerId) || null;
  }

  async saveLoyaltyStatus(customerId: string, status: LoyaltyStatus): Promise<void> {
    this.loyaltyStatuses.set(customerId, status);
  }

  // Referral operations
  async getReferrals(customerId: string): Promise<Referral[]> {
    return this.referrals.get(customerId) || [];
  }

  async addReferral(customerId: string, referral: Referral): Promise<void> {
    const referrals = this.referrals.get(customerId) || [];
    referrals.push(referral);
    this.referrals.set(customerId, referrals);
  }

  // Abandoned cart operations
  async getAbandonedCarts(customerId: string): Promise<AbandonedCart[]> {
    return this.abandonedCarts.get(customerId) || [];
  }

  async addAbandonedCart(customerId: string, cart: AbandonedCart): Promise<void> {
    const carts = this.abandonedCarts.get(customerId) || [];
    carts.push(cart);
    this.abandonedCarts.set(customerId, carts);
  }

  // Behavior tracking
  async trackBehavior(customerId: string, behavior: any): Promise<void> {
    const existing = this.customerBehavior.get(customerId) || {
      viewedProducts: [],
      searchHistory: [],
      lastActivity: new Date()
    };

    // Merge behavior data
    if (behavior.viewedProducts) {
      existing.viewedProducts = [...new Set([...existing.viewedProducts, ...behavior.viewedProducts])];
    }
    if (behavior.searchHistory) {
      existing.searchHistory = [...new Set([...existing.searchHistory, ...behavior.searchHistory])];
    }
    if (behavior.lastActivity) {
      existing.lastActivity = behavior.lastActivity;
    }

    this.customerBehavior.set(customerId, existing);
  }

  async getCustomerBehavior(customerId: string): Promise<any> {
    return this.customerBehavior.get(customerId) || null;
  }
}

class RecommendationEngineImpl implements RecommendationEngine {
  private crmStore: CRMMemoryStore;

  constructor(crmStore: CRMMemoryStore) {
    this.crmStore = crmStore;
  }

  async generateRecommendations(customerId: string, limit: number = 10): Promise<string[]> {
    const customer = await this.crmStore.getCustomer(customerId);
    if (!customer) return [];

    const behavior = await this.crmStore.getCustomerBehavior(customerId) || {};

    // Collaborative filtering - find similar customers
    const similarCustomers = await this.findSimilarCustomers(customerId);
    const recommendedProducts = new Set<string>();

    // Add products from similar customers
    for (const similarCustomer of similarCustomers.slice(0, 5)) {
      const similarBehavior = await this.crmStore.getCustomerBehavior(similarCustomer);
      if (similarBehavior?.viewedProducts) {
        similarBehavior.viewedProducts.forEach((productId: string) => {
          if (!behavior.viewedProducts?.includes(productId)) {
            recommendedProducts.add(productId);
          }
        });
      }
    }

    // Content-based filtering - based on preferences
    if (customer.profile?.preferences) {
      const { categories, brands } = customer.profile.preferences;
      // In a real implementation, this would query products matching these preferences
      console.log('Adding recommendations based on preferences:', { categories, brands });
    }

    // Return top recommendations
    return Array.from(recommendedProducts).slice(0, limit);
  }

  async updateCustomerPreferences(customerId: string, preferences: any): Promise<void> {
    const customer = await this.crmStore.getCustomer(customerId);
    if (!customer) return;

    customer.profile = {
      ...customer.profile,
      preferences: {
        ...customer.profile?.preferences,
        ...preferences
      }
    };

    await this.crmStore.saveCustomer(customer);
  }

  async getSimilarProducts(productId: string, limit: number = 5): Promise<string[]> {
    // In a real implementation, this would analyze product attributes
    // and find products with similar characteristics
    console.log(`Finding similar products for ${productId}`);
    return [];
  }

  private async findSimilarCustomers(customerId: string): Promise<string[]> {
    const customer = await this.crmStore.getCustomer(customerId);
    if (!customer) return [];

    const allCustomers = await this.crmStore.getAllCustomers();
    const similarities: { customerId: string; score: number }[] = [];

    for (const otherCustomer of allCustomers) {
      if (otherCustomer.id === customerId) continue;

      const score = this.calculateCustomerSimilarity(customer, otherCustomer);
      if (score > 0.3) { // Threshold for similarity
        similarities.push({ customerId: otherCustomer.id, score });
      }
    }

    // Sort by similarity score and return customer IDs
    return similarities
      .sort((a, b) => b.score - a.score)
      .map(sim => sim.customerId);
  }

  private calculateCustomerSimilarity(customer1: Customer, customer2: Customer): number {
    let score = 0;
    let factors = 0;

    // Segment similarity
    if (customer1.segment.id === customer2.segment.id) {
      score += 0.3;
    }
    factors++;

    // Loyalty tier similarity
    if (customer1.loyalty.tier === customer2.loyalty.tier) {
      score += 0.2;
    }
    factors++;

    // Spending level similarity
    const avgSpent1 = customer1.metrics.totalSpent / Math.max(customer1.metrics.totalOrders, 1);
    const avgSpent2 = customer2.metrics.totalSpent / Math.max(customer2.metrics.totalOrders, 1);
    const spendingDiff = Math.abs(avgSpent1 - avgSpent2) / Math.max(avgSpent1, avgSpent2);
    score += Math.max(0, 1 - spendingDiff) * 0.3;
    factors++;

    // Order frequency similarity
    const freq1 = customer1.metrics.totalOrders / Math.max(customer1.metrics.daysSinceLastOrder, 1);
    const freq2 = customer2.metrics.totalOrders / Math.max(customer2.metrics.daysSinceLastOrder, 1);
    const freqDiff = Math.abs(freq1 - freq2) / Math.max(freq1, freq2);
    score += Math.max(0, 1 - freqDiff) * 0.2;
    factors++;

    return score;
  }
}

export class CRMEngine {
  private config: CRMConfig;
  private store: CRMMemoryStore;
  private recommendationEngine: RecommendationEngine;
  private campaigns: Map<string, CampaignConfig> = new Map();

  constructor(config: CRMConfig) {
    this.config = config;
    this.store = new CRMMemoryStore();
    this.recommendationEngine = new RecommendationEngineImpl(this.store);

    // Initialize default segments
    this.initializeDefaultSegments();

    // Initialize default campaigns
    this.initializeDefaultCampaigns();
  }

  // Customer Management
  async createCustomer(data: {
    email: string;
    profile?: any;
    initialOrder?: {
      total: number;
      date: Date;
      items: any[];
    };
  }): Promise<Customer> {
    const customerId = this.generateId();

    // Create customer
    const customer: Customer = {
      id: customerId,
      email: data.email,
      profile: data.profile,
      metrics: {
        totalOrders: data.initialOrder ? 1 : 0,
        totalSpent: data.initialOrder?.total || 0,
        averageOrderValue: data.initialOrder?.total || 0,
        lifetimeValue: data.initialOrder?.total || 0,
        lastOrderDate: data.initialOrder?.date || new Date(),
        daysSinceLastOrder: 0
      },
      segment: await this.assignCustomerToSegment(customerId, data),
      loyalty: await this.initializeLoyaltyStatus(customerId),
      referrals: [],
      behavior: {
        abandonedCarts: [],
        viewedProducts: [],
        searchHistory: []
      },
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await this.store.saveCustomer(customer);

    // Initialize loyalty status
    if (this.config.loyaltyEnabled) {
      await this.store.saveLoyaltyStatus(customerId, customer.loyalty);
    }

    return customer;
  }

  async updateCustomer(customerId: string, updates: Partial<Customer>): Promise<Customer> {
    const customer = await this.store.getCustomer(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const updatedCustomer = {
      ...customer,
      ...updates,
      updatedAt: new Date()
    };

    await this.store.saveCustomer(updatedCustomer);

    // Re-segment customer if auto-segmentation is enabled
    if (this.config.autoSegmentation) {
      updatedCustomer.segment = await this.assignCustomerToSegment(customerId, updatedCustomer);
      await this.store.saveCustomer(updatedCustomer);
    }

    return updatedCustomer;
  }

  async getCustomer(customerId: string): Promise<Customer | null> {
    return await this.store.getCustomer(customerId);
  }

  async getAllCustomers(filters?: {
    segment?: string;
    loyaltyTier?: string;
    activeSince?: Date;
  }): Promise<Customer[]> {
    let customers = await this.store.getAllCustomers();

    if (filters) {
      if (filters.segment) {
        customers = customers.filter(c => c.segment.id === filters.segment);
      }
      if (filters.loyaltyTier) {
        customers = customers.filter(c => c.loyalty.tier === filters.loyaltyTier);
      }
      if (filters.activeSince) {
        customers = customers.filter(c => c.metrics.lastOrderDate >= filters.activeSince!);
      }
    }

    return customers;
  }

  // Order Processing
  async processOrder(customerId: string, order: {
    total: number;
    items: any[];
    date: Date;
  }): Promise<void> {
    const customer = await this.store.getCustomer(customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    // Update customer metrics
    const newMetrics = {
      totalOrders: customer.metrics.totalOrders + 1,
      totalSpent: customer.metrics.totalSpent + order.total,
      averageOrderValue: (customer.metrics.totalSpent + order.total) / (customer.metrics.totalOrders + 1),
      lifetimeValue: customer.metrics.lifetimeValue + order.total,
      lastOrderDate: order.date,
      daysSinceLastOrder: 0
    };

    await this.updateCustomer(customerId, {
      metrics: newMetrics
    });

    // Update loyalty points
    if (this.config.loyaltyEnabled) {
      await this.updateLoyaltyPoints(customerId, order.total);
    }

    // Track product views for recommendations
    const viewedProducts = order.items.map((item: any) => item.productId);
    await this.store.trackBehavior(customerId, {
      viewedProducts,
      lastActivity: new Date()
    });

    // Trigger campaigns
    await this.triggerCampaigns(customerId, 'order_completed', {
      order,
      customer
    });
  }

  // Segmentation
  async createSegment(data: {
    name: string;
    description: string;
    criteria: SegmentCriteria[];
    autoUpdate: boolean;
  }): Promise<CustomerSegment> {
    const segment: CustomerSegment = {
      id: this.generateId(),
      name: data.name,
      description: data.description,
      criteria: data.criteria,
      customers: [],
      autoUpdate: data.autoUpdate
    };

    await this.store.saveSegment(segment);

    // Run segmentation
    await this.runSegmentation(segment.id);

    return segment;
  }

  async updateSegment(segmentId: string, updates: Partial<CustomerSegment>): Promise<CustomerSegment> {
    const segment = await this.store.getSegment(segmentId);
    if (!segment) {
      throw new Error('Segment not found');
    }

    const updatedSegment = {
      ...segment,
      ...updates
    };

    await this.store.saveSegment(updatedSegment);

    // Re-run segmentation if criteria changed
    if (updates.criteria) {
      await this.runSegmentation(segmentId);
    }

    return updatedSegment;
  }

  async getSegments(): Promise<CustomerSegment[]> {
    return await this.store.getAllSegments();
  }

  async runSegmentation(segmentId?: string): Promise<void> {
    const segments = segmentId
      ? [await this.store.getSegment(segmentId)].filter(Boolean) as CustomerSegment[]
      : await this.store.getAllSegments();

    const allCustomers = await this.store.getAllCustomers();

    for (const segment of segments) {
      const matchingCustomers = allCustomers.filter(customer =>
        this.matchesSegmentCriteria(customer, segment.criteria)
      );

      // Update segment
      segment.customers = matchingCustomers.map(c => c.id);
      await this.store.saveSegment(segment);

      // Update customers
      for (const customer of matchingCustomers) {
        if (customer.segment.id !== segment.id) {
          await this.updateCustomer(customer.id, { segment });
        }
      }
    }
  }

  // Loyalty Program
  async updateLoyaltyPoints(customerId: string, points: number): Promise<LoyaltyStatus> {
    const currentStatus = await this.store.getLoyaltyStatus(customerId) ||
      await this.initializeLoyaltyStatus(customerId);

    const newPoints = currentStatus.points + points;
    const newTier = this.calculateLoyaltyTier(newPoints);

    const updatedStatus: LoyaltyStatus = {
      ...currentStatus,
      points: newPoints,
      pointsEarned: currentStatus.pointsEarned + Math.max(0, points),
      tier: newTier.tier,
      benefits: newTier.benefits,
      nextTier: newTier.nextTier
    };

    await this.store.saveLoyaltyStatus(customerId, updatedStatus);

    // Update customer
    await this.updateCustomer(customerId, { loyalty: updatedStatus });

    // Trigger tier change campaign
    if (currentStatus.tier !== newTier.tier) {
      await this.triggerCampaigns(customerId, 'loyalty_tier_changed', {
        oldTier: currentStatus.tier,
        newTier: newTier.tier,
        customer: await this.store.getCustomer(customerId)
      });
    }

    return updatedStatus;
  }

  async redeemLoyaltyPoints(customerId: string, points: number): Promise<number> {
    const status = await this.store.getLoyaltyStatus(customerId);
    if (!status || status.points < points) {
      throw new Error('Insufficient loyalty points');
    }

    const discount = Math.floor(points / 100) * 5; // 100 points = $5 discount

    await this.updateLoyaltyPoints(customerId, -points);

    // Update redeemed points
    const updatedStatus = {
      ...status,
      pointsRedeemed: status.pointsRedeemed + points
    };
    await this.store.saveLoyaltyStatus(customerId, updatedStatus);

    return discount;
  }

  // Abandoned Cart Recovery
  async trackAbandonedCart(customerId: string, cartData: {
    items: any[];
    totalValue: number;
  }): Promise<void> {
    if (!this.config.abandonedCartEnabled) return;

    const abandonedCart: AbandonedCart = {
      id: this.generateId(),
      customerId,
      items: cartData.items,
      totalValue: cartData.totalValue,
      recoveryEmailsSent: 0,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000) // 72 hours
    };

    await this.store.addAbandonedCart(customerId, abandonedCart);

    // Schedule recovery emails
    this.scheduleAbandonedCartRecovery(customerId, abandonedCart.id);
  }

  // Referral Program
  async createReferral(referrerId: string, referralCode?: string): Promise<Referral> {
    if (!this.config.referralEnabled) {
      throw new Error('Referral program is not enabled');
    }

    const referral: Referral = {
      id: this.generateId(),
      referralCode: referralCode || this.generateReferralCode(),
      referrerId,
      status: 'pending',
      reward: {
        type: 'points',
        amount: 500 // Default referral bonus
      },
      createdAt: new Date()
    };

    await this.store.addReferral(referrerId, referral);
    return referral;
  }

  async completeReferral(referralCode: string, referredId: string): Promise<void> {
    const customers = await this.store.getAllCustomers();
    const referrer = customers.find(c => {
      const referrals = this.store.getReferrals(c.id);
      return referrals.some(r => r.referralCode === referralCode);
    });

    if (!referrer) {
      throw new Error('Invalid referral code');
    }

    const referrals = await this.store.getReferrals(referrer.id);
    const referral = referrals.find(r => r.referralCode === referralCode);

    if (!referral) {
      throw new Error('Referral not found');
    }

    // Update referral
    referral.referredId = referredId;
    referral.status = 'completed';
    referral.completedAt = new Date();

    // Award referral bonus
    await this.updateLoyaltyPoints(referrer.id, referral.reward.amount);

    // Welcome bonus for referred customer
    await this.updateLoyaltyPoints(referredId, 100); // Welcome bonus

    await this.triggerCampaigns(referredId, 'referral_completed', {
      referral,
      referrer,
      referredCustomer: await this.store.getCustomer(referredId)
    });
  }

  // Recommendations
  async getRecommendations(customerId: string, limit?: number): Promise<string[]> {
    if (!this.config.recommendationEnabled) {
      return [];
    }

    return await this.recommendationEngine.generateRecommendations(customerId, limit);
  }

  async trackBehavior(customerId: string, behavior: {
    viewedProducts?: string[];
    searchHistory?: string[];
    category?: string;
  }): Promise<void> {
    await this.store.trackBehavior(customerId, {
      ...behavior,
      lastActivity: new Date()
    });
  }

  // Campaigns
  async createCampaign(campaign: CampaignConfig): Promise<void> {
    this.campaigns.set(campaign.id, campaign);
  }

  async triggerCampaigns(customerId: string, trigger: string, data: any): Promise<void> {
    const triggeredCampaigns = Array.from(this.campaigns.values())
      .filter(campaign => campaign.enabled && campaign.triggers.includes(trigger));

    for (const campaign of triggeredCampaigns) {
      await this.executeCampaign(campaign, customerId, data);
    }
  }

  // Analytics
  async getMetrics(): Promise<CustomerMetrics> {
    const customers = await this.store.getAllCustomers();
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const activeCustomers = customers.filter(c =>
      c.metrics.lastOrderDate >= thirtyDaysAgo
    );

    const newCustomersThisMonth = customers.filter(c =>
      c.createdAt >= thirtyDaysAgo
    );

    const totalLifetimeValue = customers.reduce((sum, c) => sum + c.metrics.lifetimeValue, 0);
    const totalOrders = customers.reduce((sum, c) => sum + c.metrics.totalOrders, 0);

    return {
      totalCustomers: customers.length,
      activeCustomers: activeCustomers.length,
      newCustomersThisMonth: newCustomersThisMonth.length,
      customerRetentionRate: this.calculateRetentionRate(customers),
      averageLifetimeValue: customers.length > 0 ? totalLifetimeValue / customers.length : 0,
      averageOrderValue: totalOrders > 0 ? totalLifetimeValue / totalOrders : 0,
      churnRate: this.calculateChurnRate(customers)
    };
  }

  // Private helper methods
  private async initializeDefaultSegments(): Promise<void> {
    const defaultSegments = [
      {
        name: 'VIP Customers',
        description: 'High-value customers with significant lifetime value',
        criteria: [
          { field: 'metrics.lifetimeValue', operator: 'gt', value: 1000 },
          { field: 'metrics.totalOrders', operator: 'gt', value: 10 }
        ],
        autoUpdate: true
      },
      {
        name: 'At Risk',
        description: 'Customers who haven\'t purchased in over 60 days',
        criteria: [
          { field: 'metrics.daysSinceLastOrder', operator: 'gt', value: 60 }
        ],
        autoUpdate: true
      },
      {
        name: 'New Customers',
        description: 'Customers who joined in the last 30 days',
        criteria: [
          { field: 'createdAt', operator: 'gt', value: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        ],
        autoUpdate: true
      },
      {
        name: 'Loyal Customers',
        description: 'Customers with Silver or Gold loyalty tier',
        criteria: [
          { field: 'loyalty.tier', operator: 'in', value: ['silver', 'gold'] }
        ],
        autoUpdate: true
      }
    ];

    for (const segmentData of defaultSegments) {
      await this.createSegment(segmentData);
    }
  }

  private async initializeDefaultCampaigns(): Promise<void> {
    const defaultCampaigns: CampaignConfig[] = [
      {
        id: 'abandoned-cart-1hour',
        name: 'Abandoned Cart - 1 Hour',
        type: 'abandoned_cart',
        triggers: ['cart_abandoned'],
        template: {
          id: 'abandoned-cart-1hour-template',
          name: '1 Hour Abandoned Cart',
          subject: 'Did you forget something?',
          htmlContent: '<p>Hi {{customer.firstName}}, you left items in your cart. Complete your order now!</p>',
          textContent: 'Hi {{customer.firstName}}, you left items in your cart. Complete your order now!',
          variables: ['customer.firstName']
        },
        enabled: true,
        schedule: {
          frequency: 'immediate'
        }
      },
      {
        id: 'abandoned-cart-24hour',
        name: 'Abandoned Cart - 24 Hours with Discount',
        type: 'abandoned_cart',
        triggers: ['cart_abandoned'],
        template: {
          id: 'abandoned-cart-24hour-template',
          name: '24 Hour Abandoned Cart with Discount',
          subject: 'Complete your order with 10% off!',
          htmlContent: '<p>Hi {{customer.firstName}}, here\'s a 10% discount to complete your order!</p>',
          textContent: 'Hi {{customer.firstName}}, here\'s a 10% discount to complete your order!',
          variables: ['customer.firstName']
        },
        enabled: true,
        schedule: {
          frequency: 'daily',
          time: '09:00'
        }
      },
      {
        id: 'loyalty-tier-upgrade',
        name: 'Loyalty Tier Upgrade',
        type: 'loyalty',
        triggers: ['loyalty_tier_changed'],
        template: {
          id: 'loyalty-tier-upgrade-template',
          name: 'Loyalty Tier Upgrade',
          subject: 'Congratulations! You\'ve reached {{newTier}} status!',
          htmlContent: '<p>Hi {{customer.firstName}}, congratulations on reaching {{newTier}} status! Here are your new benefits...</p>',
          textContent: 'Hi {{customer.firstName}}, congratulations on reaching {{newTier}} status!',
          variables: ['customer.firstName', 'newTier']
        },
        enabled: true,
        schedule: {
          frequency: 'immediate'
        }
      }
    ];

    for (const campaign of defaultCampaigns) {
      await this.createCampaign(campaign);
    }
  }

  private async assignCustomerToSegment(customerId: string, customerData: any): Promise<CustomerSegment> {
    const segments = await this.store.getAllSegments();

    // Find the first matching segment
    for (const segment of segments) {
      if (this.matchesSegmentCriteria(customerData, segment.criteria)) {
        return segment;
      }
    }

    // Default segment
    return {
      id: 'default',
      name: 'General Customers',
      description: 'Default segment for all customers',
      criteria: [],
      customers: [],
      autoUpdate: true
    };
  }

  private matchesSegmentCriteria(customer: any, criteria: SegmentCriteria[]): boolean {
    return criteria.every(criterion => {
      const value = this.getNestedValue(customer, criterion.field);
      return this.evaluateCriterion(value, criterion.operator, criterion.value);
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private evaluateCriterion(value: any, operator: string, expected: any): boolean {
    switch (operator) {
      case 'eq':
        return value === expected;
      case 'gt':
        return value > expected;
      case 'lt':
        return value < expected;
      case 'in':
        return Array.isArray(expected) && expected.includes(value);
      case 'contains':
        return typeof value === 'string' && value.includes(expected);
      case 'between':
        return Array.isArray(expected) && value >= expected[0] && value <= expected[1];
      default:
        return false;
    }
  }

  private async initializeLoyaltyStatus(customerId: string): Promise<LoyaltyStatus> {
    return {
      tier: 'bronze',
      points: 0,
      pointsEarned: 0,
      pointsRedeemed: 0,
      benefits: ['1% cashback', 'Birthday discount']
    };
  }

  private calculateLoyaltyTier(points: number): {
    tier: 'bronze' | 'silver' | 'gold';
    benefits: string[];
    nextTier?: {
      name: string;
      pointsRequired: number;
      progress: number;
    };
  } {
    if (points >= 5000) {
      return {
        tier: 'gold',
        benefits: ['3% cashback', 'Free shipping', 'Early access to sales', 'Exclusive products']
      };
    } else if (points >= 1000) {
      return {
        tier: 'silver',
        benefits: ['2% cashback', 'Free shipping', 'Early access to sales'],
        nextTier: {
          name: 'gold',
          pointsRequired: 5000,
          progress: (points / 5000) * 100
        }
      };
    } else {
      return {
        tier: 'bronze',
        benefits: ['1% cashback', 'Birthday discount'],
        nextTier: {
          name: 'silver',
          pointsRequired: 1000,
          progress: (points / 1000) * 100
        }
      };
    }
  }

  private async scheduleAbandonedCartRecovery(customerId: string, cartId: string): Promise<void> {
    // 1-hour reminder
    setTimeout(async () => {
      const cart = (await this.store.getAbandonedCarts(customerId))
        .find(c => c.id === cartId);
      if (cart && cart.recoveryEmailsSent === 0) {
        await this.triggerCampaigns(customerId, 'abandoned_cart_reminder', {
          cart,
          reminderType: '1hour'
        });
        cart.recoveryEmailsSent = 1;
      }
    }, 60 * 60 * 1000); // 1 hour

    // 24-hour reminder with discount
    setTimeout(async () => {
      const cart = (await this.store.getAbandonedCarts(customerId))
        .find(c => c.id === cartId);
      if (cart && cart.recoveryEmailsSent === 1) {
        await this.triggerCampaigns(customerId, 'abandoned_cart_reminder', {
          cart,
          reminderType: '24hours',
          discount: 10
        });
        cart.recoveryEmailsSent = 2;
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  private async executeCampaign(campaign: CampaignConfig, customerId: string, data: any): Promise<void> {
    // In a real implementation, this would send emails or trigger other actions
    console.log(`Executing campaign ${campaign.name} for customer ${customerId}`, {
      campaign,
      customer: await this.store.getCustomer(customerId),
      data
    });
  }

  private calculateRetentionRate(customers: Customer[]): number {
    if (customers.length === 0) return 0;

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const activeCustomers = customers.filter(c => c.metrics.lastOrderDate >= thirtyDaysAgo);
    return (activeCustomers.length / customers.length) * 100;
  }

  private calculateChurnRate(customers: Customer[]): number {
    // Simplified churn calculation
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
    const inactiveCustomers = customers.filter(c => c.metrics.lastOrderDate < sixtyDaysAgo);
    return (inactiveCustomers.length / customers.length) * 100;
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  private generateReferralCode(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }
}

// Default CRM configuration
export const defaultCRMConfig: CRMConfig = {
  autoSegmentation: true,
  loyaltyEnabled: true,
  abandonedCartEnabled: true,
  referralEnabled: true,
  recommendationEnabled: true,
  emailServiceEnabled: false, // Would need actual email service integration
  dataRetentionDays: 365
};

// Export singleton instance
export const crmEngine = new CRMEngine(defaultCRMConfig);