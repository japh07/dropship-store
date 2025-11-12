'use client';

import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

import {
  Customer,
  CustomerSegment,
  LoyaltyStatus,
  Referral,
  AbandonedCart,
  CustomerMetrics
} from '@/types';
import { crmEngine, CRMConfig } from '@/lib/crm-engine';

interface CRMContextType {
  // State
  customers: Customer[];
  segments: CustomerSegment[];
  currentCustomer: Customer | null;
  loading: boolean;
  error: string | null;
  metrics: CustomerMetrics | null;

  // Customer operations
  createCustomer: (data: {
    email: string;
    profile?: any;
    initialOrder?: {
      total: number;
      date: Date;
      items: any[];
    };
  }) => Promise<Customer>;
  updateCustomer: (customerId: string, updates: Partial<Customer>) => Promise<Customer>;
  getCustomer: (customerId: string) => Promise<Customer | null>;
  getAllCustomers: (filters?: {
    segment?: string;
    loyaltyTier?: string;
    activeSince?: Date;
  }) => Promise<Customer[]>;

  // Order processing
  processOrder: (customerId: string, order: {
    total: number;
    items: any[];
    date: Date;
  }) => Promise<void>;

  // Segmentation
  createSegment: (data: {
    name: string;
    description: string;
    criteria: any[];
    autoUpdate: boolean;
  }) => Promise<CustomerSegment>;
  updateSegment: (segmentId: string, updates: Partial<CustomerSegment>) => Promise<CustomerSegment>;
  runSegmentation: (segmentId?: string) => Promise<void>;

  // Loyalty
  updateLoyaltyPoints: (customerId: string, points: number) => Promise<LoyaltyStatus>;
  redeemLoyaltyPoints: (customerId: string, points: number) => Promise<number>;

  // Abandoned cart
  trackAbandonedCart: (customerId: string, cartData: {
    items: any[];
    totalValue: number;
  }) => Promise<void>;

  // Referrals
  createReferral: (referrerId: string, referralCode?: string) => Promise<Referral>;
  completeReferral: (referralCode: string, referredId: string) => Promise<void>;

  // Recommendations
  getRecommendations: (customerId: string, limit?: number) => Promise<string[]>;
  trackBehavior: (customerId: string, behavior: {
    viewedProducts?: string[];
    searchHistory?: string[];
    category?: string;
  }) => Promise<void>;

  // Analytics
  refreshMetrics: () => Promise<void>;
}

const CRMContext = createContext<CRMContextType | undefined>(undefined);

interface CRMProviderProps {
  children: ReactNode;
  config?: CRMConfig;
  autoLoad?: boolean;
}

export function CRMProvider({ children, config, autoLoad = true }: CRMProviderProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [segments, setSegments] = useState<CustomerSegment[]>([]);
  const [currentCustomer, setCurrentCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<CustomerMetrics | null>(null);

  // Initialize CRM
  useEffect(() => {
    if (autoLoad) {
      initializeCRM();
    }
  }, [autoLoad]);

  const initializeCRM = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load initial data
      await Promise.all([
        loadCustomers(),
        loadSegments(),
        loadMetrics()
      ]);

      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize CRM';
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
    }
  };

  // Data loading functions
  const loadCustomers = async () => {
    try {
      const customerList = await crmEngine.getAllCustomers();
      setCustomers(customerList);
    } catch (err) {
      console.error('Failed to load customers:', err);
      throw err;
    }
  };

  const loadSegments = async () => {
    try {
      const segmentList = await crmEngine.getSegments();
      setSegments(segmentList);
    } catch (err) {
      console.error('Failed to load segments:', err);
      throw err;
    }
  };

  const loadMetrics = async () => {
    try {
      const customerMetrics = await crmEngine.getMetrics();
      setMetrics(customerMetrics);
    } catch (err) {
      console.error('Failed to load metrics:', err);
      throw err;
    }
  };

  // Customer operations
  const createCustomer = useCallback(async (data: {
    email: string;
    profile?: any;
    initialOrder?: {
      total: number;
      date: Date;
      items: any[];
    };
  }): Promise<Customer> => {
    try {
      const customer = await crmEngine.createCustomer(data);
      setCustomers(prev => [...prev, customer]);
      toast.success('Customer created successfully');
      return customer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create customer';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const updateCustomer = useCallback(async (customerId: string, updates: Partial<Customer>): Promise<Customer> => {
    try {
      const updatedCustomer = await crmEngine.updateCustomer(customerId, updates);
      setCustomers(prev =>
        prev.map(c => c.id === customerId ? updatedCustomer : c)
      );

      // Update current customer if it's the same
      if (currentCustomer?.id === customerId) {
        setCurrentCustomer(updatedCustomer);
      }

      toast.success('Customer updated successfully');
      return updatedCustomer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update customer';
      toast.error(errorMessage);
      throw err;
    }
  }, [currentCustomer]);

  const getCustomer = useCallback(async (customerId: string): Promise<Customer | null> => {
    try {
      const customer = await crmEngine.getCustomer(customerId);
      setCurrentCustomer(customer);
      return customer;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get customer';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const getAllCustomers = useCallback(async (filters?: {
    segment?: string;
    loyaltyTier?: string;
    activeSince?: Date;
  }): Promise<Customer[]> => {
    try {
      const customerList = await crmEngine.getAllCustomers(filters);
      setCustomers(customerList);
      return customerList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get customers';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Order processing
  const processOrder = useCallback(async (customerId: string, order: {
    total: number;
    items: any[];
    date: Date;
  }): Promise<void> => {
    try {
      await crmEngine.processOrder(customerId, order);

      // Refresh customer data
      const updatedCustomer = await crmEngine.getCustomer(customerId);
      if (updatedCustomer) {
        setCustomers(prev =>
          prev.map(c => c.id === customerId ? updatedCustomer : c)
        );

        if (currentCustomer?.id === customerId) {
          setCurrentCustomer(updatedCustomer);
        }
      }

      // Refresh metrics
      await loadMetrics();

      toast.success('Order processed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to process order';
      toast.error(errorMessage);
      throw err;
    }
  }, [currentCustomer]);

  // Segmentation
  const createSegment = useCallback(async (data: {
    name: string;
    description: string;
    criteria: any[];
    autoUpdate: boolean;
  }): Promise<CustomerSegment> => {
    try {
      const segment = await crmEngine.createSegment(data);
      setSegments(prev => [...prev, segment]);
      toast.success('Segment created successfully');
      return segment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create segment';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const updateSegment = useCallback(async (segmentId: string, updates: Partial<CustomerSegment>): Promise<CustomerSegment> => {
    try {
      const updatedSegment = await crmEngine.updateSegment(segmentId, updates);
      setSegments(prev =>
        prev.map(s => s.id === segmentId ? updatedSegment : s)
      );
      toast.success('Segment updated successfully');
      return updatedSegment;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update segment';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const runSegmentation = useCallback(async (segmentId?: string): Promise<void> => {
    try {
      setLoading(true);
      await crmEngine.runSegmentation(segmentId);

      // Refresh data
      await Promise.all([
        loadCustomers(),
        loadSegments()
      ]);

      setLoading(false);
      toast.success('Segmentation completed successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run segmentation';
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Loyalty
  const updateLoyaltyPoints = useCallback(async (customerId: string, points: number): Promise<LoyaltyStatus> => {
    try {
      const status = await crmEngine.updateLoyaltyPoints(customerId, points);

      // Refresh customer data
      const updatedCustomer = await crmEngine.getCustomer(customerId);
      if (updatedCustomer) {
        setCustomers(prev =>
          prev.map(c => c.id === customerId ? updatedCustomer : c)
        );

        if (currentCustomer?.id === customerId) {
          setCurrentCustomer(updatedCustomer);
        }
      }

      toast.success(`${points > 0 ? 'Earned' : 'Deducted'} ${Math.abs(points)} loyalty points`);
      return status;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update loyalty points';
      toast.error(errorMessage);
      throw err;
    }
  }, [currentCustomer]);

  const redeemLoyaltyPoints = useCallback(async (customerId: string, points: number): Promise<number> => {
    try {
      const discount = await crmEngine.redeemLoyaltyPoints(customerId, points);

      // Refresh customer data
      const updatedCustomer = await crmEngine.getCustomer(customerId);
      if (updatedCustomer) {
        setCustomers(prev =>
          prev.map(c => c.id === customerId ? updatedCustomer : c)
        );

        if (currentCustomer?.id === customerId) {
          setCurrentCustomer(updatedCustomer);
        }
      }

      toast.success(`Redeemed ${points} points for $${discount} discount`);
      return discount;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to redeem points';
      toast.error(errorMessage);
      throw err;
    }
  }, [currentCustomer]);

  // Abandoned cart
  const trackAbandonedCart = useCallback(async (customerId: string, cartData: {
    items: any[];
    totalValue: number;
  }): Promise<void> => {
    try {
      await crmEngine.trackAbandonedCart(customerId, cartData);
      console.log('Abandoned cart tracked for customer:', customerId);
    } catch (err) {
      console.error('Failed to track abandoned cart:', err);
    }
  }, []);

  // Referrals
  const createReferral = useCallback(async (referrerId: string, referralCode?: string): Promise<Referral> => {
    try {
      const referral = await crmEngine.createReferral(referrerId, referralCode);
      toast.success('Referral created successfully');
      return referral;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create referral';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const completeReferral = useCallback(async (referralCode: string, referredId: string): Promise<void> => {
    try {
      await crmEngine.completeReferral(referralCode, referredId);

      // Refresh customer data
      await Promise.all([
        loadCustomers(),
        loadMetrics()
      ]);

      toast.success('Referral completed successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to complete referral';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Recommendations
  const getRecommendations = useCallback(async (customerId: string, limit?: number): Promise<string[]> => {
    try {
      const recommendations = await crmEngine.getRecommendations(customerId, limit);
      return recommendations;
    } catch (err) {
      console.error('Failed to get recommendations:', err);
      return [];
    }
  }, []);

  const trackBehavior = useCallback(async (customerId: string, behavior: {
    viewedProducts?: string[];
    searchHistory?: string[];
    category?: string;
  }): Promise<void> => {
    try {
      await crmEngine.trackBehavior(customerId, behavior);
    } catch (err) {
      console.error('Failed to track behavior:', err);
    }
  }, []);

  // Analytics
  const refreshMetrics = useCallback(async (): Promise<void> => {
    try {
      const customerMetrics = await crmEngine.getMetrics();
      setMetrics(customerMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh metrics';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const value: CRMContextType = {
    // State
    customers,
    segments,
    currentCustomer,
    loading,
    error,
    metrics,

    // Operations
    createCustomer,
    updateCustomer,
    getCustomer,
    getAllCustomers,
    processOrder,
    createSegment,
    updateSegment,
    runSegmentation,
    updateLoyaltyPoints,
    redeemLoyaltyPoints,
    trackAbandonedCart,
    createReferral,
    completeReferral,
    getRecommendations,
    trackBehavior,
    refreshMetrics
  };

  return (
    <CRMContext.Provider value={value}>
      {children}
    </CRMContext.Provider>
  );
}

// Hook for using CRM context
export function useCRM() {
  const context = useContext(CRMContext);
  if (context === undefined) {
    throw new Error('useCRM must be used within a CRMProvider');
  }
  return context;
}

// Hook for customer-specific operations
export function useCustomer(customerId?: string) {
  const { getCustomer, currentCustomer, ...crm } = useCRM();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (customerId) {
      setLoading(true);
      getCustomer(customerId)
        .then(setCustomer)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setCustomer(currentCustomer);
    }
  }, [customerId, currentCustomer, getCustomer]);

  return {
    customer,
    loading,
    ...crm
  };
}

// Hook for customer metrics
export function useCustomerMetrics() {
  const { customers, refreshMetrics, ...crm } = useCRM();

  const calculateMetrics = useCallback(() => {
    const totalCustomers = customers.length;
    const activeCustomers = customers.filter(c =>
      c.metrics.lastOrderDate >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;
    const newCustomersThisMonth = customers.filter(c =>
      c.createdAt >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    ).length;

    const totalLifetimeValue = customers.reduce((sum, c) => sum + c.metrics.lifetimeValue, 0);
    const totalOrders = customers.reduce((sum, c) => sum + c.metrics.totalOrders, 0);

    return {
      totalCustomers,
      activeCustomers,
      newCustomersThisMonth,
      averageLifetimeValue: totalCustomers > 0 ? totalLifetimeValue / totalCustomers : 0,
      averageOrderValue: totalOrders > 0 ? totalLifetimeValue / totalOrders : 0,
      retentionRate: totalCustomers > 0 ? (activeCustomers / totalCustomers) * 100 : 0
    };
  }, [customers]);

  const [metrics, setMetrics] = useState(calculateMetrics);

  useEffect(() => {
    setMetrics(calculateMetrics());
  }, [calculateMetrics]);

  return {
    metrics,
    refreshMetrics,
    ...crm
  };
}

// Hook for loyalty operations
export function useLoyalty(customerId?: string) {
  const { updateLoyaltyPoints, redeemLoyaltyPoints, currentCustomer } = useCRM();
  const [loyaltyStatus, setLoyaltyStatus] = useState<LoyaltyStatus | null>(null);

  useEffect(() => {
    if (customerId) {
      // In a real implementation, you would fetch the loyalty status
      setLoyaltyStatus(currentCustomer?.loyalty || null);
    } else {
      setLoyaltyStatus(currentCustomer?.loyalty || null);
    }
  }, [customerId, currentCustomer]);

  const addPoints = useCallback(async (points: number) => {
    if (!customerId) return;

    try {
      const status = await updateLoyaltyPoints(customerId, points);
      setLoyaltyStatus(status);
      return status;
    } catch (err) {
      throw err;
    }
  }, [customerId, updateLoyaltyPoints]);

  const redeemPoints = useCallback(async (points: number) => {
    if (!customerId) return 0;

    try {
      const discount = await redeemLoyaltyPoints(customerId, points);
      // Refresh loyalty status
      const updatedCustomer = await crmEngine.getCustomer(customerId);
      if (updatedCustomer) {
        setLoyaltyStatus(updatedCustomer.loyalty);
      }
      return discount;
    } catch (err) {
      throw err;
    }
  }, [customerId, redeemLoyaltyPoints]);

  return {
    loyaltyStatus,
    addPoints,
    redeemPoints
  };
}

// Hook for abandoned cart tracking
export function useAbandonedCart(customerId?: string) {
  const { trackAbandonedCart } = useCRM();

  const trackCart = useCallback((cartData: {
    items: any[];
    totalValue: number;
  }) => {
    if (!customerId) return;

    return trackAbandonedCart(customerId, cartData);
  }, [customerId, trackAbandonedCart]);

  return {
    trackCart: trackCart
  };
}

// Hook for product recommendations
export function useRecommendations(customerId?: string) {
  const { getRecommendations, trackBehavior } = useCRM();
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const loadRecommendations = useCallback(async (limit?: number) => {
    if (!customerId) return;

    setLoading(true);
    try {
      const recs = await getRecommendations(customerId, limit);
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to load recommendations:', err);
    } finally {
      setLoading(false);
    }
  }, [customerId, getRecommendations]);

  const trackView = useCallback((productId: string) => {
    if (!customerId) return;

    return trackBehavior(customerId, {
      viewedProducts: [productId]
    });
  }, [customerId, trackBehavior]);

  const trackSearch = useCallback((query: string) => {
    if (!customerId) return;

    return trackBehavior(customerId, {
      searchHistory: [query]
    });
  }, [customerId, trackBehavior]);

  return {
    recommendations,
    loading,
    loadRecommendations,
    trackView,
    trackSearch
  };
}

export default CRMProvider;