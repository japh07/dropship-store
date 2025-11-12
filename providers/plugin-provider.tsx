'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
  useRef
} from 'react';
import { toast } from 'react-hot-toast';

import {
  Plugin,
  PluginInstance,
  PluginEvent,
  SecurityViolation,
  ResourceLimits
} from '@/types';
import { pluginRegistry, pluginLoader } from '@/lib/plugin-system';
import { pluginSandbox, defaultSecurityConfig } from '@/lib/plugin-security';
import { pluginSDK } from '@/lib/plugin-sdk';

interface PluginContextType {
  // Plugin state
  plugins: PluginInstance[];
  loading: boolean;
  error: string | null;

  // Plugin actions
  installPlugin: (pluginData: any) => Promise<void>;
  uninstallPlugin: (pluginId: string) => Promise<void>;
  enablePlugin: (pluginId: string) => Promise<void>;
  disablePlugin: (pluginId: string) => Promise<void>;
  reloadPlugin: (pluginId: string) => Promise<void>;

  // Plugin info
  getPlugin: (pluginId: string) => PluginInstance | undefined;
  getPluginMetrics: (pluginId: string) => any;
  getSecurityReport: (pluginId?: string) => {
    violations: SecurityViolation[];
    resourceLimits?: ResourceLimits;
    recommendations: string[];
  };

  // Plugin management
  loadPluginFromUrl: (url: string) => Promise<void>;
  loadPluginFromFile: (file: File) => Promise<void>;
  exportPluginData: (pluginId: string) => Promise<string>;

  // Event handling
  subscribeToPluginEvent: (pluginId: string, event: string, callback: (data: any) => void) => () => void;
  emitPluginEvent: (pluginId: string, event: string, data?: any) => void;

  // Plugin UI
  showPluginModal: (pluginId: string, component: React.ComponentType) => void;
  hidePluginModal: () => void;
  getPluginModalState: () => { isOpen: boolean; pluginId?: string; component?: React.ComponentType };

  // Performance monitoring
  getPerformanceMetrics: () => {
    totalPlugins: number;
    activePlugins: number;
    totalMemoryUsage: number;
    totalCpuTime: number;
    errorCount: number;
  };
}

const PluginContext = createContext<PluginContextType | undefined>(undefined);

interface PluginProviderProps {
  children: ReactNode;
  autoStart?: boolean;
  securityConfig?: any;
  enablePerformanceMonitoring?: boolean;
}

export function PluginProvider({
  children,
  autoStart = true,
  securityConfig = defaultSecurityConfig,
  enablePerformanceMonitoring = true
}: PluginProviderProps) {
  const [plugins, setPlugins] = useState<PluginInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    pluginId?: string;
    component?: React.ComponentType;
  }>({ isOpen: false });

  const performanceIntervalRef = useRef<NodeJS.Timeout>();
  const eventListenersRef = useRef<Map<string, Map<string, Set<Function>>>>(new Map());

  // Initialize plugin system
  useEffect(() => {
    if (!autoStart) return;

    const initializePluginSystem = async () => {
      try {
        setLoading(true);
        setError(null);

        // Setup plugin system event listeners
        setupPluginEventListeners();

        // Load enabled plugins from storage
        await loadPersistedPlugins();

        // Start performance monitoring if enabled
        if (enablePerformanceMonitoring) {
          startPerformanceMonitoring();
        }

        setLoading(false);
        console.log('Plugin system initialized successfully');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize plugin system');
        setLoading(false);
        console.error('Plugin system initialization failed:', err);
      }
    };

    initializePluginSystem();

    return () => {
      // Cleanup
      if (performanceIntervalRef.current) {
        clearInterval(performanceIntervalRef.current);
      }
      cleanup();
    };
  }, [autoStart, enablePerformanceMonitoring]);

  const setupPluginEventListeners = () => {
    // Plugin registration events
    pluginRegistry.on('plugin:registered', (data) => {
      setPlugins(prev => [...prev, data.instance]);
      toast.success(`Plugin ${data.plugin.name} registered`);
    });

    pluginRegistry.on('plugin:unregistered', (data) => {
      setPlugins(prev => prev.filter(p => p.plugin.id !== data.pluginId));
      toast(`Plugin ${data.pluginId} unregistered`);
    });

    pluginRegistry.on('plugin:enabled', (data) => {
      setPlugins(prev =>
        prev.map(p =>
          p.plugin.id === data.pluginId
            ? { ...p, plugin: { ...p.plugin, status: 'enabled' as const } }
            : p
        )
      );
      toast.success(`Plugin ${data.plugin.name} enabled`);
    });

    pluginRegistry.on('plugin:disabled', (data) => {
      setPlugins(prev =>
        prev.map(p =>
          p.plugin.id === data.pluginId
            ? { ...p, plugin: { ...p.plugin, status: 'disabled' as const } }
            : p
        )
      );
      toast(`Plugin ${data.plugin.name} disabled`);
    });

    // Plugin error handling
    pluginRegistry.on('plugin:error', (data) => {
      console.error(`Plugin error in ${data.pluginId}:`, data.error);
      toast.error(`Plugin ${data.pluginId} encountered an error`);
    });
  };

  const loadPersistedPlugins = async () => {
    try {
      // In a real implementation, this would load from local storage or backend
      const persistedPluginIds = localStorage.getItem('enabled_plugins');
      if (persistedPluginIds) {
        const pluginIds = JSON.parse(persistedPluginIds);
        // Load plugins based on persisted IDs
        console.log('Loading persisted plugins:', pluginIds);
      }
    } catch (err) {
      console.warn('Failed to load persisted plugins:', err);
    }
  };

  const startPerformanceMonitoring = () => {
    if (performanceIntervalRef.current) {
      clearInterval(performanceIntervalRef.current);
    }

    performanceIntervalRef.current = setInterval(() => {
      // Update plugin performance metrics
      setPlugins(prev =>
        prev.map(instance => {
          const metrics = pluginSandbox.getSecurityReport(instance.plugin.id);
          return {
            ...instance,
            performance: {
              ...instance.performance,
              memoryUsage: metrics.resourceLimits?.memory.used || 0,
              cpuTime: metrics.resourceLimits?.cpu.used || 0,
              errorCount: metrics.violations.filter(v => v.severity === 'high' || v.severity === 'critical').length
            }
          };
        })
      );
    }, 5000); // Update every 5 seconds
  };

  const cleanup = async () => {
    try {
      // Stop performance monitoring
      if (performanceIntervalRef.current) {
        clearInterval(performanceIntervalRef.current);
      }

      // Cleanup all plugins
      await pluginRegistry.cleanup();
      await pluginSandbox.cleanupAll();

      // Clear event listeners
      eventListenersRef.current.clear();

      console.log('Plugin system cleaned up');
    } catch (err) {
      console.error('Plugin system cleanup failed:', err);
    }
  };

  // Plugin actions
  const installPlugin = useCallback(async (pluginData: any) => {
    try {
      setLoading(true);
      setError(null);

      // Validate plugin
      const { plugin, manifest } = pluginData;
      const validation = pluginSandbox.validatePlugin(plugin, JSON.stringify(pluginData));

      if (!validation.isValid) {
        throw new Error(`Plugin validation failed: ${validation.violations.join(', ')}`);
      }

      // Register plugin
      await pluginRegistry.registerPlugin(plugin, manifest);

      // Persist plugin installation
      persistPluginInstallation(plugin.id);

      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to install plugin');
      setLoading(false);
      toast.error(err instanceof Error ? err.message : 'Plugin installation failed');
      throw err;
    }
  }, []);

  const uninstallPlugin = useCallback(async (pluginId: string) => {
    try {
      await pluginRegistry.unregisterPlugin(pluginId);
      removePersistedPlugin(pluginId);
      toast.success('Plugin uninstalled successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to uninstall plugin';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const enablePlugin = useCallback(async (pluginId: string) => {
    try {
      await pluginRegistry.enablePlugin(pluginId);
      persistPluginState(pluginId, true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to enable plugin';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const disablePlugin = useCallback(async (pluginId: string) => {
    try {
      await pluginRegistry.disablePlugin(pluginId);
      persistPluginState(pluginId, false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to disable plugin';
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const reloadPlugin = useCallback(async (pluginId: string) => {
    try {
      await disablePlugin(pluginId);
      await enablePlugin(pluginId);
      toast.success('Plugin reloaded successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reload plugin';
      toast.error(errorMessage);
      throw err;
    }
  }, [disablePlugin, enablePlugin]);

  // Plugin loading
  const loadPluginFromUrl = useCallback(async (url: string) => {
    try {
      setLoading(true);
      await pluginLoader.loadPluginFromUrl(url);
      setLoading(false);
      toast.success('Plugin loaded from URL successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load plugin from URL';
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const loadPluginFromFile = useCallback(async (file: File) => {
    try {
      setLoading(true);
      await pluginLoader.loadPluginFromFile(file);
      setLoading(false);
      toast.success('Plugin loaded from file successfully');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load plugin from file';
      setError(errorMessage);
      setLoading(false);
      toast.error(errorMessage);
      throw err;
    }
  }, []);

  const exportPluginData = useCallback(async (pluginId: string): Promise<string> => {
    const instance = getPlugin(pluginId);
    if (!instance) {
      throw new Error('Plugin not found');
    }

    const exportData = {
      plugin: instance.plugin,
      manifest: {
        // Include manifest data
      },
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(exportData, null, 2);
  }, []);

  // Plugin info
  const getPlugin = useCallback((pluginId: string): PluginInstance | undefined => {
    return pluginRegistry.getPlugin(pluginId);
  }, []);

  const getPluginMetrics = useCallback((pluginId: string) => {
    return pluginRegistry.getPluginMetrics()[pluginId];
  }, []);

  const getSecurityReport = useCallback((pluginId?: string) => {
    return pluginSandbox.getSecurityReport(pluginId);
  }, []);

  // Event handling
  const subscribeToPluginEvent = useCallback((pluginId: string, event: string, callback: (data: any) => void) => {
    const fullEventName = `plugin:${pluginId}:${event}`;

    // Initialize listeners map for this plugin if needed
    if (!eventListenersRef.current.has(pluginId)) {
      eventListenersRef.current.set(pluginId, new Map());
    }

    const pluginListeners = eventListenersRef.current.get(pluginId)!;

    // Initialize listeners map for this event if needed
    if (!pluginListeners.has(event)) {
      pluginListeners.set(event, new Set());
    }

    const eventListeners = pluginListeners.get(event)!;

    // Add callback to listeners
    eventListeners.add(callback);

    // Register with plugin registry
    pluginRegistry.on(fullEventName, callback);

    // Return unsubscribe function
    return () => {
      eventListeners.delete(callback);
      pluginRegistry.off(fullEventName, callback);

      // Clean up empty maps
      if (eventListeners.size === 0) {
        pluginListeners.delete(event);
      }
      if (pluginListeners.size === 0) {
        eventListenersRef.current.delete(pluginId);
      }
    };
  }, []);

  const emitPluginEvent = useCallback((pluginId: string, event: string, data?: any) => {
    const fullEventName = `plugin:${pluginId}:${event}`;
    pluginRegistry.emit(fullEventName, data);
  }, []);

  // Plugin UI
  const showPluginModal = useCallback((pluginId: string, component: React.ComponentType) => {
    setModalState({
      isOpen: true,
      pluginId,
      component
    });
  }, []);

  const hidePluginModal = useCallback(() => {
    setModalState({ isOpen: false });
  }, []);

  const getPluginModalState = useCallback(() => {
    return modalState;
  }, [modalState]);

  // Performance metrics
  const getPerformanceMetrics = useCallback(() => {
    const allPlugins = pluginRegistry.getAllPlugins();
    const enabledPlugins = pluginRegistry.getEnabledPlugins();
    const metrics = pluginRegistry.getPluginMetrics();

    const totalMemoryUsage = Object.values(metrics).reduce((sum, metric) => sum + metric.memoryUsage, 0);
    const totalCpuTime = Object.values(metrics).reduce((sum, metric) => sum + metric.cpuTime, 0);
    const errorCount = Object.values(metrics).reduce((sum, metric) => sum + metric.errorCount, 0);

    return {
      totalPlugins: allPlugins.length,
      activePlugins: enabledPlugins.length,
      totalMemoryUsage,
      totalCpuTime,
      errorCount
    };
  }, []);

  // Utility functions
  const persistPluginInstallation = (pluginId: string) => {
    try {
      const installedPlugins = JSON.parse(localStorage.getItem('installed_plugins') || '[]');
      installedPlugins.push(pluginId);
      localStorage.setItem('installed_plugins', JSON.stringify(installedPlugins));
    } catch (err) {
      console.warn('Failed to persist plugin installation:', err);
    }
  };

  const removePersistedPlugin = (pluginId: string) => {
    try {
      const installedPlugins = JSON.parse(localStorage.getItem('installed_plugins') || '[]');
      const filtered = installedPlugins.filter((id: string) => id !== pluginId);
      localStorage.setItem('installed_plugins', JSON.stringify(filtered));
    } catch (err) {
      console.warn('Failed to remove persisted plugin:', err);
    }
  };

  const persistPluginState = (pluginId: string, enabled: boolean) => {
    try {
      const enabledPlugins = JSON.parse(localStorage.getItem('enabled_plugins') || '[]');
      if (enabled && !enabledPlugins.includes(pluginId)) {
        enabledPlugins.push(pluginId);
      } else if (!enabled) {
        const index = enabledPlugins.indexOf(pluginId);
        if (index > -1) {
          enabledPlugins.splice(index, 1);
        }
      }
      localStorage.setItem('enabled_plugins', JSON.stringify(enabledPlugins));
    } catch (err) {
      console.warn('Failed to persist plugin state:', err);
    }
  };

  const value: PluginContextType = {
    // State
    plugins,
    loading,
    error,

    // Actions
    installPlugin,
    uninstallPlugin,
    enablePlugin,
    disablePlugin,
    reloadPlugin,

    // Info
    getPlugin,
    getPluginMetrics,
    getSecurityReport,

    // Loading
    loadPluginFromUrl,
    loadPluginFromFile,
    exportPluginData,

    // Events
    subscribeToPluginEvent,
    emitPluginEvent,

    // UI
    showPluginModal,
    hidePluginModal,
    getPluginModalState,

    // Performance
    getPerformanceMetrics
  };

  return (
    <PluginContext.Provider value={value}>
      {children}

      {/* Plugin Modal */}
      {modalState.isOpen && modalState.component && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">
                  {modalState.pluginId && getPlugin(modalState.pluginId)?.plugin.name}
                </h3>
                <button
                  onClick={hidePluginModal}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="p-6">
              <modalState.component />
            </div>
          </div>
        </div>
      )}
    </PluginContext.Provider>
  );
}

// Hook for using plugin context
export function usePlugin() {
  const context = useContext(PluginContext);
  if (context === undefined) {
    throw new Error('usePlugin must be used within a PluginProvider');
  }
  return context;
}

// Hook for specific plugin
export function usePluginInstance(pluginId: string) {
  const { getPlugin, subscribeToPluginEvent, emitPluginEvent } = usePlugin();
  const plugin = getPlugin(pluginId);

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    return subscribeToPluginEvent(pluginId, event, callback);
  }, [pluginId, subscribeToPluginEvent]);

  const emit = useCallback((event: string, data?: any) => {
    emitPluginEvent(pluginId, event, data);
  }, [pluginId, emitPluginEvent]);

  return {
    plugin,
    subscribe,
    emit
  };
}

export default PluginProvider;