'use client';

import { useState, useEffect, useCallback, useContext, createContext, ReactNode } from 'react';
import { toast } from 'react-hot-toast';

import {
  Vendor,
  VendorScorecard,
  VendorIssue,
  SupplierAlert,
  PurchaseOrder,
  VendorMetrics,
  Address
} from '@/types';
import { vrmEngine, VRMConfig } from '@/lib/vrm-engine';

interface VRMContextType {
  // State
  vendors: Vendor[];
  scorecards: Record<string, VendorScorecard>;
  alerts: SupplierAlert[];
  issues: Record<string, VendorIssue[]>;
  purchaseOrders: Record<string, PurchaseOrder[]>;
  currentVendor: Vendor | null;
  loading: boolean;
  error: string | null;
  metrics: VendorMetrics | null;

  // Vendor operations
  createVendor: (data: {
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
  }) => Promise<Vendor>;
  updateVendor: (vendorId: string, updates: Partial<Vendor>) => Promise<Vendor>;
  getVendor: (vendorId: string) => Promise<Vendor | null>;
  getAllVendors: (filters?: {
    status?: string;
    category?: string;
    minRating?: number;
  }) => Promise<Vendor[]>;

  // Order operations
  createPurchaseOrder: (data: {
    vendorId: string;
    items: {
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
    expectedDeliveryDate?: Date;
  }) => Promise<PurchaseOrder>;
  updateOrderStatus: (
    vendorId: string,
    orderId: string,
    status: PurchaseOrder['status'],
    actualDeliveryDate?: Date,
    trackingNumber?: string
  ) => Promise<void>;

  // Scorecard operations
  generateScorecard: (vendorId: string) => Promise<VendorScorecard>;
  updateScorecard: (vendorId: string) => Promise<VendorScorecard>;

  // Issue operations
  createIssue: (vendorId: string, issue: {
    type: VendorIssue['type'];
    severity: VendorIssue['severity'];
    description: string;
  }) => Promise<VendorIssue>;
  resolveIssue: (vendorId: string, issueId: string, resolution: string) => Promise<void>;
  getVendorIssues: (vendorId: string) => Promise<VendorIssue[]>;

  // Alert operations
  createAlert: (data: {
    vendorId: string;
    type: SupplierAlert['type'];
    severity: SupplierAlert['severity'];
    title: string;
    message: string;
    recommendations?: string[];
  }) => Promise<SupplierAlert>;
  acknowledgeAlert: (vendorId: string, alertId: string) => Promise<void>;
  getAlerts: (vendorId?: string, unacknowledgedOnly?: boolean) => Promise<SupplierAlert[]>;

  // Analytics
  refreshMetrics: () => Promise<void>;
}

const VRMContext = createContext<VRMContextType | undefined>(undefined);

interface VRMProviderProps {
  children: ReactNode;
  config?: VRMConfig;
  autoLoad?: boolean;
}

export function VRMProvider({ children, config, autoLoad = true }: VRMProviderProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [scorecards, setScorecards] = useState<Record<string, VendorScorecard>>({});
  const [alerts, setAlerts] = useState<SupplierAlert[]>([]);
  const [issues, setIssues] = useState<Record<string, VendorIssue[]>>({});
  const [purchaseOrders, setPurchaseOrders] = useState<Record<string, PurchaseOrder[]>>({});
  const [currentVendor, setCurrentVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<VendorMetrics | null>(null);

  // Initialize VRM
  useEffect(() => {
    if (autoLoad) {
      initializeVRM();
    }
  }, [autoLoad]);

  const initializeVRM = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load initial data
      await Promise.all([
        loadVendors(),
        loadScorecards(),
        loadAlerts(),
        loadMetrics()
      ]);

      setLoading(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize VRM';
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
    }
  };

  // Data loading functions
  const loadVendors = async () => {
    try {
      const vendorList = await vrmEngine.getAllVendors();
      setVendors(vendorList);
    } catch (err) {
      console.error('Failed to load vendors:', err);
      throw err;
    }
  };

  const loadScorecards = async () => {
    try {
      const vendorList = await vrmEngine.getAllVendors();
      const scorecardMap: Record<string, VendorScorecard> = {};

      for (const vendor of vendorList) {
        const scorecard = await vrmEngine.getVendor(vendor.id);
        if (scorecard) {
          scorecardMap[vendor.id] = scorecard.performance;
        }
      }

      setScorecards(scorecardMap);
    } catch (err) {
      console.error('Failed to load scorecards:', err);
      throw err;
    }
  };

  const loadAlerts = async () => {
    try {
      const alertList = await vrmEngine.getAlerts();
      setAlerts(alertList);
    } catch (err) {
      console.error('Failed to load alerts:', err);
      throw err;
    }
  };

  const loadMetrics = async () => {
    try {
      const vendorMetrics = await vrmEngine.getMetrics();
      setMetrics(vendorMetrics);
    } catch (err) {
      console.error('Failed to load metrics:', err);
      throw err;
    }
  };

  // Vendor operations
  const createVendor = useCallback(async (data: {
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
  }): Promise<Vendor> => {
    try {
      const vendor = await vrmEngine.createVendor(data);
      setVendors(prev => [...prev, vendor]);

      // Generate initial scorecard
      const scorecard = await vrmEngine.generateScorecard(vendor.id);
      setScorecards(prev => ({
        ...prev,
        [vendor.id]: scorecard
      }));

      toast.success('Vendor created successfully');
      return vendor;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create vendor';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const updateVendor = useCallback(async (vendorId: string, updates: Partial<Vendor>): Promise<Vendor> => {
    try {
      const updatedVendor = await vrmEngine.updateVendor(vendorId, updates);
      setVendors(prev =>
        prev.map(v => v.id === vendorId ? updatedVendor : v)
      );

      // Update current vendor if it's the same
      if (currentVendor?.id === vendorId) {
        setCurrentVendor(updatedVendor);
      }

      toast.success('Vendor updated successfully');
      return updatedVendor;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update vendor';
      toast.error(errorMessage);
      throw err;
    }
  }, [currentVendor]);

  const getVendor = useCallback(async (vendorId: string): Promise<Vendor | null> => {
    try {
      const vendor = await vrmEngine.getVendor(vendorId);
      setCurrentVendor(vendor);
      return vendor;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get vendor';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const getAllVendors = useCallback(async (filters?: {
    status?: string;
    category?: string;
    minRating?: number;
  }): Promise<Vendor[]> => {
    try {
      const vendorList = await vrmEngine.getAllVendors(filters);
      setVendors(vendorList);
      return vendorList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get vendors';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Order operations
  const createPurchaseOrder = useCallback(async (data: {
    vendorId: string;
    items: {
      productId: string;
      quantity: number;
      unitPrice: number;
      totalPrice: number;
    }[];
    expectedDeliveryDate?: Date;
  }): Promise<PurchaseOrder> => {
    try {
      const order = await vrmEngine.recordPurchaseOrder(data);

      // Update vendor and scorecard
      await updateVendor(data.vendorId, {});
      const updatedScorecard = await vrmEngine.updateScorecard(data.vendorId);
      setScorecards(prev => ({
        ...prev,
        [data.vendorId]: updatedScorecard
      }));

      // Refresh metrics
      await loadMetrics();

      toast.success('Purchase order created successfully');
      return order;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create purchase order';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const updateOrderStatus = useCallback(async (
    vendorId: string,
    orderId: string,
    status: PurchaseOrder['status'],
    actualDeliveryDate?: Date,
    trackingNumber?: string
  ): Promise<void> => {
    try {
      await vrmEngine.updateOrderStatus(vendorId, orderId, status, actualDeliveryDate, trackingNumber);

      // Update vendor and scorecard
      await updateVendor(vendorId, {});
      const updatedScorecard = await vrmEngine.updateScorecard(vendorId);
      setScorecards(prev => ({
        ...prev,
        [vendorId]: updatedScorecard
      }));

      // Refresh alerts and metrics
      await Promise.all([
        loadAlerts(),
        loadMetrics()
      ]);

      toast.success('Order status updated successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update order status';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Scorecard operations
  const generateScorecard = useCallback(async (vendorId: string): Promise<VendorScorecard> => {
    try {
      const scorecard = await vrmEngine.generateScorecard(vendorId);
      setScorecards(prev => ({
        ...prev,
        [vendorId]: scorecard
      }));
      return scorecard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate scorecard';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const updateScorecard = useCallback(async (vendorId: string): Promise<VendorScorecard> => {
    try {
      const scorecard = await vrmEngine.updateScorecard(vendorId);
      setScorecards(prev => ({
        ...prev,
        [vendorId]: scorecard
      }));
      return scorecard;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update scorecard';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Issue operations
  const createIssue = useCallback(async (vendorId: string, issue: {
    type: VendorIssue['type'];
    severity: VendorIssue['severity'];
    description: string;
  }): Promise<VendorIssue> => {
    try {
      const vendorIssue = await vrmEngine.createIssue(vendorId, issue);

      // Update vendor
      await updateVendor(vendorId, {});

      // Refresh alerts
      await loadAlerts();

      toast.success('Issue created successfully');
      return vendorIssue;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create issue';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const resolveIssue = useCallback(async (vendorId: string, issueId: string, resolution: string): Promise<void> => {
    try {
      await vrmEngine.resolveIssue(vendorId, issueId, resolution);

      // Update vendor
      await updateVendor(vendorId, {});

      toast.success('Issue resolved successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to resolve issue';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const getVendorIssues = useCallback(async (vendorId: string): Promise<VendorIssue[]> => {
    try {
      const vendorIssues = await vrmEngine.getIssues(vendorId);
      setIssues(prev => ({
        ...prev,
        [vendorId]: vendorIssues
      }));
      return vendorIssues;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get issues';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Alert operations
  const createAlert = useCallback(async (data: {
    vendorId: string;
    type: SupplierAlert['type'];
    severity: SupplierAlert['severity'];
    title: string;
    message: string;
    recommendations?: string[];
  }): Promise<SupplierAlert> => {
    try {
      const alert = await vrmEngine.createAlert(data);
      setAlerts(prev => [...prev, alert]);
      return alert;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to create alert';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const acknowledgeAlert = useCallback(async (vendorId: string, alertId: string): Promise<void> => {
    try {
      await vrmEngine.acknowledgeAlert(vendorId, alertId);

      // Refresh alerts
      await loadAlerts();

      toast.success('Alert acknowledged successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to acknowledge alert';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const getAlerts = useCallback(async (vendorId?: string, unacknowledgedOnly?: boolean): Promise<SupplierAlert[]> => {
    try {
      const alertList = await vrmEngine.getAlerts(vendorId, unacknowledgedOnly);
      setAlerts(alertList);
      return alertList;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get alerts';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  // Analytics
  const refreshMetrics = useCallback(async (): Promise<void> => {
    try {
      const vendorMetrics = await vrmEngine.getMetrics();
      setMetrics(vendorMetrics);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh metrics';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const value: VRMContextType = {
    // State
    vendors,
    scorecards,
    alerts,
    issues,
    purchaseOrders,
    currentVendor,
    loading,
    error,
    metrics,

    // Operations
    createVendor,
    updateVendor,
    getVendor,
    getAllVendors,
    createPurchaseOrder,
    updateOrderStatus,
    generateScorecard,
    updateScorecard,
    createIssue,
    resolveIssue,
    getVendorIssues,
    createAlert,
    acknowledgeAlert,
    getAlerts,
    refreshMetrics
  };

  return (
    <VRMContext.Provider value={value}>
      {children}
    </VRMContext.Provider>
  );
}

// Hook for using VRM context
export function useVRM() {
  const context = useContext(VRMContext);
  if (context === undefined) {
    throw new Error('useVRM must be used within a VRMProvider');
  }
  return context;
}

// Hook for vendor-specific operations
export function useVendor(vendorId?: string) {
  const { getVendor, currentVendor, scorecards, alerts, ...vrm } = useVRM();
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (vendorId) {
      setLoading(true);
      getVendor(vendorId)
        .then(setVendor)
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setVendor(currentVendor);
    }
  }, [vendorId, currentVendor, getVendor]);

  const vendorScorecard = vendorId ? scorecards[vendorId] : null;
  const vendorAlerts = vendorId ? alerts.filter(a => a.vendorId === vendorId) : [];

  return {
    vendor,
    scorecard: vendorScorecard,
    alerts: vendorAlerts,
    loading,
    ...vrm
  };
}

// Hook for vendor metrics
export function useVendorMetrics() {
  const { vendors, refreshMetrics, ...vrm } = useVRM();

  const calculateMetrics = useCallback(() => {
    const totalVendors = vendors.length;
    const activeVendors = vendors.filter(v => v.status === 'active').length;
    const averageRating = vendors.length > 0 ?
      vendors.reduce((sum, v) => sum + v.reliability.averageRating, 0) / vendors.length : 0;

    const totalOrders = vendors.reduce((sum, v) => sum + v.metrics.totalOrders, 0);
    const deliveredOrders = totalOrders; // Simplified - would need actual data

    const averageDeliveryRate = vendors.length > 0 ?
      vendors.reduce((sum, v) => sum + v.metrics.onTimeDeliveryRate, 0) / vendors.length : 0;
    const averageLeadTime = vendors.length > 0 ?
      vendors.reduce((sum, v) => sum + v.metrics.averageLeadTime, 0) / vendors.length : 0;

    const totalIssues = vendors.reduce((sum, v) => sum + v.reliability.issueHistory.length, 0);
    const criticalIssues = vendors.reduce((sum, v) =>
      sum + v.reliability.issueHistory.filter(i => i.severity === 'critical').length, 0
    );

    return {
      totalVendors,
      activeVendors,
      averageRating,
      totalOrders,
      onTimeDeliveryRate: averageDeliveryRate,
      averageLeadTime,
      totalIssues,
      criticalIssues
    };
  }, [vendors]);

  const [metrics, setMetrics] = useState(calculateMetrics);

  useEffect(() => {
    setMetrics(calculateMetrics());
  }, [calculateMetrics]);

  return {
    metrics,
    refreshMetrics,
    ...vrm
  };
}

export default VRMProvider;