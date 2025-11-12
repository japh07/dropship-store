import {
  PluginContext,
  PluginManifest,
  PermissionType,
  PluginEvent
} from '@/types';

export interface PluginSDK {
  // Core SDK methods
  init: (config: PluginConfig) => void;
  getContext: () => PluginContext;
  getVersion: () => string;

  // Storage methods
  storage: {
    get: <T = any>(key: string) => Promise<T | null>;
    set: <T = any>(key: string, value: T) => Promise<void>;
    delete: (key: string) => Promise<void>;
    clear: () => Promise<void>;
  };

  // API methods
  api: {
    get: <T = any>(url: string, config?: RequestConfig) => Promise<T>;
    post: <T = any>(url: string, data?: any, config?: RequestConfig) => Promise<T>;
    put: <T = any>(url: string, data?: any, config?: RequestConfig) => Promise<T>;
    delete: <T = any>(url: string, config?: RequestConfig) => Promise<T>;
  };

  // UI methods
  ui: {
    notify: (message: string, type?: NotificationType) => void;
    showModal: (component: React.ComponentType<any>, props?: any) => void;
    hideModal: () => void;
    showLoading: (message?: string) => () => void; // Returns hide function
    confirm: (message: string, options?: ConfirmOptions) => Promise<boolean>;
  };

  // Event methods
  events: {
    emit: (event: string, data?: any) => void;
    on: (event: string, callback: (data?: any) => void) => () => void; // Returns unsubscribe function
    off: (event: string, callback: (data?: any) => void) => void;
    once: (event: string, callback: (data?: any) => void) => void;
  };

  // Analytics methods
  analytics: {
    track: (event: string, properties?: Record<string, any>) => void;
    identify: (userId: string, traits?: Record<string, any>) => void;
    page: (name?: string, properties?: Record<string, any>) => void;
    group: (groupId: string, traits?: Record<string, any>) => void;
  };

  // Cart methods
  cart: {
    getItems: () => Promise<CartItem[]>;
    addItem: (item: CartItem) => Promise<void>;
    removeItem: (itemId: string) => Promise<void>;
    updateQuantity: (itemId: string, quantity: number) => Promise<void>;
    getTotal: () => Promise<number>;
    onItemAdded: (callback: (item: CartItem) => void) => () => void;
    onItemRemoved: (callback: (itemId: string) => void) => () => void;
  };

  // Product methods
  products: {
    get: (productId: string) => Promise<Product | null>;
    search: (query: string, filters?: SearchFilters) => Promise<Product[]>;
    getCategories: () => Promise<Category[]>;
    getByCategory: (categoryId: string) => Promise<Product[]>;
    getFeatured: () => Promise<Product[]>;
  };

  // Customer methods
  customers: {
    getCurrent: () => Promise<Customer | null>;
    updateProfile: (profile: Partial<CustomerProfile>) => Promise<void>;
    getOrders: () => Promise<Order[]>;
    getOrder: (orderId: string) => Promise<Order | null>;
    getLoyaltyStatus: () => Promise<LoyaltyStatus | null>;
  };

  // Utility methods
  utils: {
    formatCurrency: (amount: number, currency?: string) => string;
    formatDate: (date: Date, format?: string) => string;
    generateId: () => string;
    debounce: <T extends (...args: any[]) => any>(func: T, wait: number) => T;
    throttle: <T extends (...args: any[]) => any>(func: T, limit: number) => T;
    clone: <T>(obj: T) => T;
    validateEmail: (email: string) => boolean;
    validatePhone: (phone: string) => boolean;
  };

  // Development tools
  dev: {
    log: (message: string, data?: any) => void;
    warn: (message: string, data?: any) => void;
    error: (message: string, error?: Error) => void;
    debug: (message: string, data?: any) => void;
    measure: (name: string, fn: () => void) => number;
    getPerformanceMetrics: () => PerformanceMetrics;
  };
}

export interface PluginConfig {
  id: string;
  name: string;
  version: string;
  permissions: PermissionType[];
  debug?: boolean;
}

export interface RequestConfig {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface ConfirmOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

export interface CartItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  variant?: {
    size?: string;
    color?: string;
  };
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  images: string[];
  category: string;
  inStock: boolean;
  variants?: ProductVariant[];
}

export interface ProductVariant {
  id: string;
  name: string;
  price?: number;
  inStock?: boolean;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
}

export interface SearchFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sortBy?: 'price' | 'name' | 'created';
  sortOrder?: 'asc' | 'desc';
}

export interface Customer {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  createdAt: Date;
  lastLogin?: Date;
}

export interface CustomerProfile {
  firstName?: string;
  lastName?: string;
  phone?: string;
  preferences?: {
    newsletter?: boolean;
    sms?: boolean;
  };
}

export interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  createdAt: Date;
  shippingAddress?: Address;
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  productSnapshot: {
    name: string;
    images: string[];
  };
}

export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface LoyaltyStatus {
  tier: string;
  points: number;
  benefits: string[];
}

export interface PerformanceMetrics {
  memoryUsed: number;
  cpuTime: number;
  networkRequests: number;
  errorCount: number;
}

// Plugin SDK Implementation
class PluginSDKImpl implements PluginSDK {
  private context: PluginContext | null = null;
  private config: PluginConfig | null = null;
  private initialized = false;
  private eventListeners: Map<string, Function[]> = new Map();
  private debugMode = false;

  init(config: PluginConfig): void {
    if (this.initialized) {
      throw new Error('Plugin SDK already initialized');
    }

    this.config = config;
    this.debugMode = config.debug || false;

    // Get plugin context from global scope (injected by plugin system)
    if (typeof window !== 'undefined' && (window as any).__PLUGIN_CONTEXT__) {
      this.context = (window as any).__PLUGIN_CONTEXT__;
    } else {
      throw new Error('Plugin context not available. Make sure plugin is properly loaded.');
    }

    this.initialized = true;
    this.dev.log('Plugin SDK initialized', config);
  }

  getContext(): PluginContext {
    this.ensureInitialized();
    return this.context!;
  }

  getVersion(): string {
    return '1.0.0';
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Plugin SDK not initialized. Call init() first.');
    }
  }

  // Storage methods
  storage = {
    get: async <T = any>(key: string): Promise<T | null> => {
      this.ensureInitialized();
      try {
        return await this.context!.storage.get(key);
      } catch (error) {
        this.dev.error('Failed to get storage value', error as Error);
        return null;
      }
    },

    set: async <T = any>(key: string, value: T): Promise<void> => {
      this.ensureInitialized();
      try {
        await this.context!.storage.set(key, value);
        this.dev.log('Storage value set', { key, value });
      } catch (error) {
        this.dev.error('Failed to set storage value', error as Error);
        throw error;
      }
    },

    delete: async (key: string): Promise<void> => {
      this.ensureInitialized();
      try {
        await this.context!.storage.delete(key);
        this.dev.log('Storage value deleted', { key });
      } catch (error) {
        this.dev.error('Failed to delete storage value', error as Error);
        throw error;
      }
    },

    clear: async (): Promise<void> => {
      this.ensureInitialized();
      try {
        await this.context!.storage.clear();
        this.dev.log('Storage cleared');
      } catch (error) {
        this.dev.error('Failed to clear storage', error as Error);
        throw error;
      }
    }
  };

  // API methods
  api = {
    get: async <T = any>(url: string, config?: RequestConfig): Promise<T> => {
      this.ensureInitialized();
      try {
        const response = await this.context!.api.get(url, config);
        this.dev.log('API GET request completed', { url, status: response.status });
        return response;
      } catch (error) {
        this.dev.error('API GET request failed', error as Error);
        throw error;
      }
    },

    post: async <T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> => {
      this.ensureInitialized();
      try {
        const response = await this.context!.api.post(url, data, config);
        this.dev.log('API POST request completed', { url, status: response.status });
        return response;
      } catch (error) {
        this.dev.error('API POST request failed', error as Error);
        throw error;
      }
    },

    put: async <T = any>(url: string, data?: any, config?: RequestConfig): Promise<T> => {
      this.ensureInitialized();
      try {
        const response = await this.context!.api.put(url, data, config);
        this.dev.log('API PUT request completed', { url, status: response.status });
        return response;
      } catch (error) {
        this.dev.error('API PUT request failed', error as Error);
        throw error;
      }
    },

    delete: async <T = any>(url: string, config?: RequestConfig): Promise<T> => {
      this.ensureInitialized();
      try {
        const response = await this.context!.api.delete(url, config);
        this.dev.log('API DELETE request completed', { url, status: response.status });
        return response;
      } catch (error) {
        this.dev.error('API DELETE request failed', error as Error);
        throw error;
      }
    }
  };

  // UI methods
  ui = {
    notify: (message: string, type: NotificationType = 'info'): void => {
      this.ensureInitialized();
      this.context!.ui.notify(message, type);
      this.dev.log('Notification shown', { message, type });
    },

    showModal: (component: React.ComponentType<any>, props?: any): void => {
      this.ensureInitialized();
      this.context!.ui.showModal(component);
      this.dev.log('Modal shown', { component: component.name, props });
    },

    hideModal: (): void => {
      this.ensureInitialized();
      this.context!.ui.hideModal();
      this.dev.log('Modal hidden');
    },

    showLoading: (message?: string): (() => void) => {
      this.ensureInitialized();
      // Create a simple loading notification
      const loadingId = `loading_${Date.now()}`;
      this.context!.ui.notify(message || 'Loading...', 'info');
      this.dev.log('Loading shown', { message });

      return () => {
        this.dev.log('Loading hidden', { loadingId });
      };
    },

    confirm: async (message: string, options?: ConfirmOptions): Promise<boolean> => {
      this.ensureInitialized();
      // Simple confirm implementation
      const result = window.confirm(message);
      this.dev.log('Confirmation dialog', { message, options, result });
      return result;
    }
  };

  // Event methods
  events = {
    emit: (event: string, data?: any): void => {
      this.ensureInitialized();
      this.context!.events.emit(event, data);
      this.dev.log('Event emitted', { event, data });
    },

    on: (event: string, callback: (data?: any) => void): (() => void) => {
      this.ensureInitialized();
      this.context!.events.on(event, callback);

      // Track local listeners for cleanup
      if (!this.eventListeners.has(event)) {
        this.eventListeners.set(event, []);
      }
      this.eventListeners.get(event)!.push(callback);

      this.dev.log('Event listener added', { event });

      // Return unsubscribe function
      return () => {
        this.context!.events.off(event, callback);
        const listeners = this.eventListeners.get(event);
        if (listeners) {
          const index = listeners.indexOf(callback);
          if (index > -1) {
            listeners.splice(index, 1);
          }
        }
        this.dev.log('Event listener removed', { event });
      };
    },

    off: (event: string, callback: (data?: any) => void): void => {
      this.ensureInitialized();
      this.context!.events.off(event, callback);
      this.dev.log('Event listener removed', { event });
    },

    once: (event: string, callback: (data?: any) => void): void => {
      this.ensureInitialized();
      const onceCallback = (data?: any) => {
        callback(data);
        this.context!.events.off(event, onceCallback);
      };
      this.context!.events.on(event, onceCallback);
      this.dev.log('Once event listener added', { event });
    }
  };

  // Analytics methods
  analytics = {
    track: (event: string, properties?: Record<string, any>): void => {
      this.ensureInitialized();
      this.events.emit('analytics:track', { event, properties });
      this.dev.log('Analytics event tracked', { event, properties });
    },

    identify: (userId: string, traits?: Record<string, any>): void => {
      this.ensureInitialized();
      this.events.emit('analytics:identify', { userId, traits });
      this.dev.log('Analytics user identified', { userId, traits });
    },

    page: (name?: string, properties?: Record<string, any>): void => {
      this.ensureInitialized();
      this.events.emit('analytics:page', { name, properties });
      this.dev.log('Analytics page viewed', { name, properties });
    },

    group: (groupId: string, traits?: Record<string, any>): void => {
      this.ensureInitialized();
      this.events.emit('analytics:group', { groupId, traits });
      this.dev.log('Analytics group identified', { groupId, traits });
    }
  };

  // Cart methods
  cart = {
    getItems: async (): Promise<CartItem[]> => {
      this.ensureInitialized();
      try {
        const items = await this.events.emit('cart:getItems');
        return items || [];
      } catch (error) {
        this.dev.error('Failed to get cart items', error as Error);
        return [];
      }
    },

    addItem: async (item: CartItem): Promise<void> => {
      this.ensureInitialized();
      try {
        await this.events.emit('cart:addItem', item);
        this.dev.log('Cart item added', { item });
      } catch (error) {
        this.dev.error('Failed to add cart item', error as Error);
        throw error;
      }
    },

    removeItem: async (itemId: string): Promise<void> => {
      this.ensureInitialized();
      try {
        await this.events.emit('cart:removeItem', { itemId });
        this.dev.log('Cart item removed', { itemId });
      } catch (error) {
        this.dev.error('Failed to remove cart item', error as Error);
        throw error;
      }
    },

    updateQuantity: async (itemId: string, quantity: number): Promise<void> => {
      this.ensureInitialized();
      try {
        await this.events.emit('cart:updateQuantity', { itemId, quantity });
        this.dev.log('Cart item quantity updated', { itemId, quantity });
      } catch (error) {
        this.dev.error('Failed to update cart quantity', error as Error);
        throw error;
      }
    },

    getTotal: async (): Promise<number> => {
      this.ensureInitialized();
      try {
        const total = await this.events.emit('cart:getTotal');
        return total || 0;
      } catch (error) {
        this.dev.error('Failed to get cart total', error as Error);
        return 0;
      }
    },

    onItemAdded: (callback: (item: CartItem) => void): (() => void) => {
      return this.events.on('cart:itemAdded', callback);
    },

    onItemRemoved: (callback: (itemId: string) => void): (() => void) => {
      return this.events.on('cart:itemRemoved', callback);
    }
  };

  // Product methods
  products = {
    get: async (productId: string): Promise<Product | null> => {
      this.ensureInitialized();
      try {
        const product = await this.api.get(`/products/${productId}`);
        return product;
      } catch (error) {
        this.dev.error('Failed to get product', error as Error);
        return null;
      }
    },

    search: async (query: string, filters?: SearchFilters): Promise<Product[]> => {
      this.ensureInitialized();
      try {
        const params = new URLSearchParams({ query, ...filters });
        const products = await this.api.get(`/products/search?${params}`);
        return products;
      } catch (error) {
        this.dev.error('Failed to search products', error as Error);
        return [];
      }
    },

    getCategories: async (): Promise<Category[]> => {
      this.ensureInitialized();
      try {
        const categories = await this.api.get('/categories');
        return categories;
      } catch (error) {
        this.dev.error('Failed to get categories', error as Error);
        return [];
      }
    },

    getByCategory: async (categoryId: string): Promise<Product[]> => {
      this.ensureInitialized();
      try {
        const products = await this.api.get(`/categories/${categoryId}/products`);
        return products;
      } catch (error) {
        this.dev.error('Failed to get products by category', error as Error);
        return [];
      }
    },

    getFeatured: async (): Promise<Product[]> => {
      this.ensureInitialized();
      try {
        const products = await this.api.get('/products/featured');
        return products;
      } catch (error) {
        this.dev.error('Failed to get featured products', error as Error);
        return [];
      }
    }
  };

  // Customer methods
  customers = {
    getCurrent: async (): Promise<Customer | null> => {
      this.ensureInitialized();
      try {
        const customer = await this.api.get('/customers/me');
        return customer;
      } catch (error) {
        this.dev.error('Failed to get current customer', error as Error);
        return null;
      }
    },

    updateProfile: async (profile: Partial<CustomerProfile>): Promise<void> => {
      this.ensureInitialized();
      try {
        await this.api.put('/customers/me/profile', profile);
        this.dev.log('Customer profile updated', { profile });
      } catch (error) {
        this.dev.error('Failed to update customer profile', error as Error);
        throw error;
      }
    },

    getOrders: async (): Promise<Order[]> => {
      this.ensureInitialized();
      try {
        const orders = await this.api.get('/customers/me/orders');
        return orders;
      } catch (error) {
        this.dev.error('Failed to get customer orders', error as Error);
        return [];
      }
    },

    getOrder: async (orderId: string): Promise<Order | null> => {
      this.ensureInitialized();
      try {
        const order = await this.api.get(`/customers/me/orders/${orderId}`);
        return order;
      } catch (error) {
        this.dev.error('Failed to get customer order', error as Error);
        return null;
      }
    },

    getLoyaltyStatus: async (): Promise<LoyaltyStatus | null> => {
      this.ensureInitialized();
      try {
        const loyalty = await this.api.get('/customers/me/loyalty');
        return loyalty;
      } catch (error) {
        this.dev.error('Failed to get loyalty status', error as Error);
        return null;
      }
    }
  };

  // Utility methods
  utils = {
    formatCurrency: (amount: number, currency: string = 'USD'): string => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency
      }).format(amount);
    },

    formatDate: (date: Date, format: string = 'short'): string => {
      return new Intl.DateTimeFormat('en-US', {
        dateStyle: format as any
      }).format(date);
    },

    generateId: (): string => {
      return Math.random().toString(36).substr(2, 9);
    },

    debounce: <T extends (...args: any[]) => any>(func: T, wait: number): T => {
      let timeout: NodeJS.Timeout;
      return ((...args: any[]) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
      }) as T;
    },

    throttle: <T extends (...args: any[]) => any>(func: T, limit: number): T => {
      let inThrottle: boolean;
      return ((...args: any[]) => {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      }) as T;
    },

    clone: <T>(obj: T): T => {
      return JSON.parse(JSON.stringify(obj));
    },

    validateEmail: (email: string): boolean => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    },

    validatePhone: (phone: string): boolean => {
      const re = /^\+?[\d\s\-\(\)]+$/;
      return re.test(phone) && phone.replace(/\D/g, '').length >= 10;
    }
  };

  // Development tools
  dev = {
    log: (message: string, data?: any): void => {
      if (this.debugMode) {
        console.log(`[${this.config?.id}] ${message}`, data);
      }
    },

    warn: (message: string, data?: any): void => {
      if (this.debugMode) {
        console.warn(`[${this.config?.id}] ${message}`, data);
      }
    },

    error: (message: string, error?: Error): void => {
      if (this.debugMode) {
        console.error(`[${this.config?.id}] ${message}`, error);
      }
    },

    debug: (message: string, data?: any): void => {
      if (this.debugMode) {
        console.debug(`[${this.config?.id}] ${message}`, data);
      }
    },

    measure: (name: string, fn: () => void): number => {
      const start = performance.now();
      fn();
      const end = performance.now();
      const duration = end - start;
      this.dev.log(`Performance: ${name}`, { duration: `${duration.toFixed(2)}ms` });
      return duration;
    },

    getPerformanceMetrics: (): PerformanceMetrics => {
      if (typeof performance !== 'undefined' && performance.memory) {
        return {
          memoryUsed: performance.memory.usedJSHeapSize,
          cpuTime: 0, // Would need more complex tracking
          networkRequests: 0, // Would need request interceptors
          errorCount: 0 // Would need error tracking
        };
      }
      return {
        memoryUsed: 0,
        cpuTime: 0,
        networkRequests: 0,
        errorCount: 0
      };
    }
  };

  // Cleanup method
  cleanup(): void {
    // Remove all event listeners
    this.eventListeners.forEach((listeners, event) => {
      listeners.forEach(callback => {
        this.context?.events.off(event, callback);
      });
    });
    this.eventListeners.clear();

    this.initialized = false;
    this.dev.log('Plugin SDK cleaned up');
  }
}

// Export the SDK instance
export const pluginSDK = new PluginSDKImpl();

// Export development tools
export const createPlugin = (config: PluginConfig) => {
  return pluginSDK;
};

export const definePlugin = (
  config: PluginConfig,
  setup: (sdk: PluginSDK) => void | Promise<void>
) => {
  return {
    config,
    setup: async () => {
      pluginSDK.init(config);
      await setup(pluginSDK);
    }
  };
};

// Export type definitions for plugin developers
export type { PluginSDK, PluginConfig, RequestConfig, NotificationType, ConfirmOptions };