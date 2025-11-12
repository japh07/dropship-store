export interface Product {
  id: string;
  category: Category;
  name: string;
  price: string;
  isFeatured: boolean;
  size: Size;
  color: Color;
  images: Image[]
};

export interface Image {
  id: string;
  url: string;
}

export interface Billboard {
  id: string;
  label: string;
  imageUrl: string;
};

export interface Category {
  id: string;
  name: string;
  billboard: Billboard;
};

export interface Size {
  id: string;
  name: string;
  value: string;
};

export interface Color {
  id: string;
  name: string;
  value: string;
};

// Plugin Framework Types
export type PermissionType = 'storage.read' | 'storage.write' | 'api.external' | 'ui.modify' | 'analytics.track' | 'cart.access';

export interface Plugin {
  id: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email: string;
    website?: string;
  };
  category: 'analytics' | 'ui' | 'payment' | 'shipping' | 'marketing' | 'other';
  permissions: PermissionType[];
  status: 'installed' | 'enabled' | 'disabled' | 'error';
  metadata: PluginMetadata;
}

export interface PluginMetadata {
  id: string;
  name: string;
  version: string;
  description: string;
  author: {
    name: string;
    email: string;
    website?: string;
  };
  category: 'analytics' | 'ui' | 'payment' | 'shipping' | 'marketing' | 'other';
  permissions: PermissionType[];
  dependencies: string[];
  pricing: {
    type: 'free' | 'one-time' | 'subscription';
    amount?: number;
    currency?: string;
  };
  compatibility: {
    minStoreVersion: string;
    maxStoreVersion?: string;
  };
}

export interface PluginManifest {
  id: string;
  entryPoints: {
    main: string;
    admin?: string;
    settings?: string;
  };
  permissions: PermissionType[];
  dependencies: string[];
  resources: {
    maxMemory?: number;
    maxCpuTime?: number;
    allowedDomains?: string[];
  };
}

export interface PluginContext {
  api: {
    get: (url: string, config?: any) => Promise<any>;
    post: (url: string, data?: any, config?: any) => Promise<any>;
    put: (url: string, data?: any, config?: any) => Promise<any>;
    delete: (url: string, config?: any) => Promise<any>;
  };
  storage: {
    get: (key: string) => Promise<any>;
    set: (key: string, value: any) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };
  events: {
    emit: (event: string, data?: any) => void;
    on: (event: string, callback: (data?: any) => void) => void;
    off: (event: string, callback: (data?: any) => void) => void;
  };
  ui: {
    notify: (message: string, type?: 'success' | 'error' | 'info') => void;
    showModal: (component: React.ComponentType) => void;
    hideModal: () => void;
  };
}

export interface PluginLifecycle {
  install: () => Promise<void>;
  enable: () => Promise<void>;
  disable: () => Promise<void>;
  uninstall: () => Promise<void>;
  update: (newVersion: string) => Promise<void>;
}

export interface PluginInstance {
  plugin: Plugin;
  context: PluginContext;
  lifecycle: PluginLifecycle;
  performance: {
    memoryUsage: number;
    cpuTime: number;
    errorCount: number;
    lastError?: Error;
  };
}

// CRM System Types
export interface Customer {
  id: string;
  email: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phone?: string;
    birthday?: Date;
    preferences: {
      categories: string[];
      brands: string[];
      priceRange: { min: number; max: number };
    };
  };
  metrics: {
    totalOrders: number;
    totalSpent: number;
    averageOrderValue: number;
    lifetimeValue: number;
    lastOrderDate: Date;
    daysSinceLastOrder: number;
  };
  segment: CustomerSegment;
  loyalty: LoyaltyStatus;
  referrals: Referral[];
  behavior: {
    abandonedCarts: AbandonedCart[];
    viewedProducts: string[];
    searchHistory: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    field: string;
    operator: 'eq' | 'gt' | 'lt' | 'in' | 'contains';
    value: any;
  }[];
  customers: string[];
  autoUpdate: boolean;
}

export interface LoyaltyStatus {
  tier: 'bronze' | 'silver' | 'gold';
  points: number;
  pointsEarned: number;
  pointsRedeemed: number;
  benefits: string[];
  nextTier?: {
    name: string;
    pointsRequired: number;
    progress: number;
  };
}

export interface Referral {
  id: string;
  referralCode: string;
  referrerId?: string;
  referredId?: string;
  status: 'pending' | 'completed' | 'expired';
  reward: {
    type: 'points' | 'discount' | 'cashback';
    amount: number;
    currency?: string;
  };
  createdAt: Date;
  completedAt?: Date;
}

export interface AbandonedCart {
  id: string;
  customerId: string;
  items: {
    productId: string;
    quantity: number;
    price: number;
  }[];
  totalValue: number;
  recoveryEmailsSent: number;
  lastRecoveryEmail?: Date;
  createdAt: Date;
  expiresAt: Date;
}

// VRM System Types
export interface Vendor {
  id: string;
  name: string;
  contact: {
    email: string;
    phone: string;
    address: Address;
    primaryContact: string;
  };
  performance: VendorScorecard;
  products: Product[];
  metrics: {
    totalOrders: number;
    onTimeDeliveryRate: number;
    qualityScore: number;
    averageLeadTime: number;
    pricingCompetitiveness: number;
  };
  reliability: {
    monthsTracked: number;
    averageRating: number;
    issueHistory: VendorIssue[];
  };
  status: 'active' | 'inactive' | 'under-review';
  createdAt: Date;
  updatedAt: Date;
}

export interface VendorScorecard {
  vendorId: string;
  overallScore: number;
  metrics: {
    pricing: {
      score: number;
      weight: number;
      trend: 'up' | 'down' | 'stable';
    };
    delivery: {
      score: number;
      weight: number;
      trend: 'up' | 'down' | 'stable';
    };
    quality: {
      score: number;
      weight: number;
      trend: 'up' | 'down' | 'stable';
    };
    communication: {
      score: number;
      weight: number;
      trend: 'up' | 'down' | 'stable';
    };
    reliability: {
      score: number;
      weight: number;
      trend: 'up' | 'down' | 'stable';
    };
  };
  lastUpdated: Date;
  reviewPeriod: string;
}

export interface VendorIssue {
  id: string;
  type: 'delivery' | 'quality' | 'communication' | 'pricing' | 'other';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  resolution?: string;
  status: 'open' | 'resolved' | 'escalated';
  createdAt: Date;
  resolvedAt?: Date;
}

export interface SupplierAlert {
  id: string;
  vendorId: string;
  type: 'performance_drop' | 'delivery_issue' | 'price_change' | 'quality_problem' | 'opportunity';
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  recommendations?: string[];
  acknowledged: boolean;
  createdAt: Date;
  acknowledgedAt?: Date;
}

export interface PurchaseOrder {
  id: string;
  vendorId: string;
  orderNumber: string;
  items: {
    productId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  totalAmount: number;
  status: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
  orderDate: Date;
  expectedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  trackingNumber?: string;
}

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

// Marketplace Types
export interface MarketplacePlugin {
  id: string;
  metadata: PluginMetadata;
  developer: {
    id: string;
    name: string;
    email: string;
    verified: boolean;
  };
  stats: {
    downloads: number;
    rating: number;
    reviewCount: number;
    activeInstalls: number;
  };
  pricing: {
    type: 'free' | 'one-time' | 'subscription';
    amount?: number;
    currency?: string;
    trialDays?: number;
  };
  versions: {
    version: string;
    releaseDate: Date;
    changelog: string;
    downloadUrl: string;
    compatibility: string[];
  }[];
  reviews: PluginReview[];
  status: 'published' | 'pending' | 'rejected' | 'suspended';
  submittedAt: Date;
  publishedAt?: Date;
}

export interface PluginReview {
  id: string;
  pluginId: string;
  userId: string;
  userName: string;
  rating: number;
  title: string;
  content: string;
  helpful: number;
  verified: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

export interface PluginSubmission {
  id: string;
  pluginId: string;
  developerId: string;
  version: string;
  manifest: PluginManifest;
  codeFiles: {
    name: string;
    content: string;
    type: 'javascript' | 'typescript' | 'json' | 'css';
  }[];
  documentation?: string;
  screenshots: string[];
  status: 'pending' | 'in_review' | 'approved' | 'rejected' | 'requires_changes';
  reviewNotes?: string;
  submittedAt: Date;
  reviewedAt?: Date;
  reviewerId?: string;
}

// Admin & Analytics Types
export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'admin' | 'manager' | 'staff';
  permissions: string[];
  lastLogin?: Date;
  active: boolean;
  createdAt: Date;
}

export interface StoreMetrics {
  revenue: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    growth: number;
  };
  orders: {
    total: number;
    today: number;
    thisWeek: number;
    thisMonth: number;
    averageValue: number;
  };
  customers: {
    total: number;
    new: number;
    active: number;
    returning: number;
  };
  products: {
    total: number;
    topSelling: Product[];
    lowStock: Product[];
  };
  plugins: {
    installed: number;
    active: number;
    updates: number;
    errors: number;
  };
}

// Event System Types
export interface PluginEvent {
  type: string;
  payload: any;
  source: string;
  timestamp: Date;
}

export interface SystemEvent {
  id: string;
  type: 'plugin' | 'crm' | 'vrm' | 'marketplace' | 'system';
  category: string;
  message: string;
  data: any;
  userId?: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  createdAt: Date;
}
