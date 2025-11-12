import {
  Plugin,
  PluginInstance,
  PluginContext,
  PluginLifecycle,
  PluginManifest,
  PluginEvent,
  PermissionType
} from '@/types';

export interface PluginHook {
  name: string;
  handler: (...args: any[]) => any;
  priority: number;
}

export interface PluginRegistryConfig {
  maxPlugins: number;
  allowUnsignedPlugins: boolean;
  securityLevel: 'strict' | 'moderate' | 'permissive';
  enablePerformanceMonitoring: boolean;
}

class EventEmitter {
  private events: Map<string, Function[]> = new Map();

  on(event: string, callback: Function) {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  off(event: string, callback: Function) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  emit(event: string, data?: any) {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  clear() {
    this.events.clear();
  }
}

export class PluginRegistry {
  private plugins: Map<string, PluginInstance> = new Map();
  private hooks: Map<string, PluginHook[]> = new Map();
  private eventEmitter: EventEmitter = new EventEmitter();
  private config: PluginRegistryConfig;

  constructor(config: PluginRegistryConfig = {
    maxPlugins: 50,
    allowUnsignedPlugins: false,
    securityLevel: 'moderate',
    enablePerformanceMonitoring: true
  }) {
    this.config = config;
  }

  async registerPlugin(plugin: Plugin, manifest: PluginManifest): Promise<void> {
    if (this.plugins.size >= this.config.maxPlugins) {
      throw new Error(`Maximum plugin limit (${this.config.maxPlugins}) reached`);
    }

    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} is already registered`);
    }

    await this.validatePlugin(plugin, manifest);

    const context = this.createPluginContext(plugin, manifest);
    const lifecycle = this.createPluginLifecycle(plugin, manifest);

    const instance: PluginInstance = {
      plugin,
      context,
      lifecycle,
      performance: {
        memoryUsage: 0,
        cpuTime: 0,
        errorCount: 0
      }
    };

    this.plugins.set(plugin.id, instance);

    // Emit plugin registered event
    this.eventEmitter.emit('plugin:registered', { plugin, instance });
  }

  async unregisterPlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    try {
      await instance.lifecycle.disable();
      await instance.lifecycle.uninstall();
    } catch (error) {
      console.error(`Error during plugin ${pluginId} cleanup:`, error);
    }

    this.plugins.delete(pluginId);
    this.eventEmitter.emit('plugin:unregistered', { pluginId });
  }

  getPlugin(pluginId: string): PluginInstance | undefined {
    return this.plugins.get(pluginId);
  }

  getAllPlugins(): PluginInstance[] {
    return Array.from(this.plugins.values());
  }

  getEnabledPlugins(): PluginInstance[] {
    return this.getAllPlugins().filter(instance => instance.plugin.status === 'enabled');
  }

  async enablePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    if (instance.plugin.status === 'enabled') {
      return;
    }

    await instance.lifecycle.enable();
    instance.plugin.status = 'enabled';
    this.eventEmitter.emit('plugin:enabled', { pluginId, instance });
  }

  async disablePlugin(pluginId: string): Promise<void> {
    const instance = this.plugins.get(pluginId);
    if (!instance) {
      throw new Error(`Plugin ${pluginId} is not registered`);
    }

    if (instance.plugin.status === 'disabled') {
      return;
    }

    await instance.lifecycle.disable();
    instance.plugin.status = 'disabled';
    this.eventEmitter.emit('plugin:disabled', { pluginId, instance });
  }

  registerHook(name: string, handler: (...args: any[]) => any, priority: number = 10): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }

    const hooks = this.hooks.get(name)!;
    hooks.push({ name, handler, priority });
    hooks.sort((a, b) => a.priority - b.priority);
  }

  unregisterHook(name: string, handler: (...args: any[]) => any): void {
    const hooks = this.hooks.get(name);
    if (hooks) {
      const index = hooks.findIndex(hook => hook.handler === handler);
      if (index > -1) {
        hooks.splice(index, 1);
      }
    }
  }

  executeHook(name: string, ...args: any[]): any[] {
    const hooks = this.hooks.get(name) || [];
    return hooks.map(hook => {
      try {
        return hook.handler(...args);
      } catch (error) {
        console.error(`Hook ${name} execution failed:`, error);
        return null;
      }
    }).filter(result => result !== null);
  }

  on(event: string, callback: (data?: any) => void): void {
    this.eventEmitter.on(event, callback);
  }

  off(event: string, callback: (data?: any) => void): void {
    this.eventEmitter.off(event, callback);
  }

  emit(event: string, data?: any): void {
    this.eventEmitter.emit(event, data);
  }

  private async validatePlugin(plugin: Plugin, manifest: PluginManifest): Promise<void> {
    // Validate plugin structure
    if (!plugin.id || !plugin.name || !plugin.version) {
      throw new Error('Plugin missing required fields: id, name, or version');
    }

    // Validate permissions
    for (const permission of manifest.permissions) {
      if (!this.isValidPermission(permission)) {
        throw new Error(`Invalid permission: ${permission}`);
      }
    }

    // Validate dependencies
    for (const dependency of manifest.dependencies) {
      if (!this.plugins.has(dependency)) {
        throw new Error(`Plugin dependency not found: ${dependency}`);
      }
    }

    // Security validation based on config
    if (this.config.securityLevel === 'strict') {
      await this.performStrictValidation(plugin, manifest);
    }
  }

  private isValidPermission(permission: string): permission is PermissionType {
    const validPermissions: PermissionType[] = [
      'storage.read', 'storage.write', 'api.external', 'ui.modify', 'analytics.track', 'cart.access'
    ];
    return validPermissions.includes(permission as PermissionType);
  }

  private async performStrictValidation(plugin: Plugin, manifest: PluginManifest): Promise<void> {
    // In strict mode, perform additional security checks
    // This would integrate with the plugin security system
    console.log(`Performing strict validation for plugin ${plugin.id}`);
  }

  private createPluginContext(plugin: Plugin, manifest: PluginManifest): PluginContext {
    return {
      api: {
        get: async (url: string, config?: any) => {
          if (!manifest.permissions.includes('api.external')) {
            throw new Error('Plugin does not have API access permission');
          }
          // Implementation would go through the security layer
          return fetch(url, { ...config, method: 'GET' });
        },
        post: async (url: string, data?: any, config?: any) => {
          if (!manifest.permissions.includes('api.external')) {
            throw new Error('Plugin does not have API access permission');
          }
          return fetch(url, {
            ...config,
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...config?.headers },
            body: JSON.stringify(data)
          });
        },
        put: async (url: string, data?: any, config?: any) => {
          if (!manifest.permissions.includes('api.external')) {
            throw new Error('Plugin does not have API access permission');
          }
          return fetch(url, {
            ...config,
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...config?.headers },
            body: JSON.stringify(data)
          });
        },
        delete: async (url: string, config?: any) => {
          if (!manifest.permissions.includes('api.external')) {
            throw new Error('Plugin does not have API access permission');
          }
          return fetch(url, { ...config, method: 'DELETE' });
        }
      },
      storage: {
        get: async (key: string) => {
          if (!manifest.permissions.includes('storage.read')) {
            throw new Error('Plugin does not have storage read permission');
          }
          const storageKey = `plugin_${plugin.id}_${key}`;
          const value = localStorage.getItem(storageKey);
          return value ? JSON.parse(value) : null;
        },
        set: async (key: string, value: any) => {
          if (!manifest.permissions.includes('storage.write')) {
            throw new Error('Plugin does not have storage write permission');
          }
          const storageKey = `plugin_${plugin.id}_${key}`;
          localStorage.setItem(storageKey, JSON.stringify(value));
        },
        delete: async (key: string) => {
          if (!manifest.permissions.includes('storage.write')) {
            throw new Error('Plugin does not have storage write permission');
          }
          const storageKey = `plugin_${plugin.id}_${key}`;
          localStorage.removeItem(storageKey);
        },
        clear: async () => {
          if (!manifest.permissions.includes('storage.write')) {
            throw new Error('Plugin does not have storage write permission');
          }
          const keys = Object.keys(localStorage);
          keys.forEach(key => {
            if (key.startsWith(`plugin_${plugin.id}_`)) {
              localStorage.removeItem(key);
            }
          });
        }
      },
      events: {
        emit: (event: string, data?: any) => {
          this.eventEmitter.emit(`plugin:${plugin.id}:${event}`, data);
        },
        on: (event: string, callback: (data?: any) => void) => {
          this.eventEmitter.on(`plugin:${plugin.id}:${event}`, callback);
        },
        off: (event: string, callback: (data?: any) => void) => {
          this.eventEmitter.off(`plugin:${plugin.id}:${event}`, callback);
        }
      },
      ui: {
        notify: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
          // Integration with toast system
          console.log(`[${plugin.id}] ${type.toUpperCase()}: ${message}`);
        },
        showModal: (component: React.ComponentType) => {
          // Integration with modal system
          console.log(`[${plugin.id}] Show modal:`, component.name);
        },
        hideModal: () => {
          // Integration with modal system
          console.log(`[${plugin.id}] Hide modal`);
        }
      }
    };
  }

  private createPluginLifecycle(plugin: Plugin, manifest: PluginManifest): PluginLifecycle {
    return {
      install: async () => {
        console.log(`Installing plugin ${plugin.id}`);
        // Installation logic would go here
      },
      enable: async () => {
        console.log(`Enabling plugin ${plugin.id}`);
        // Enable logic would go here
      },
      disable: async () => {
        console.log(`Disabling plugin ${plugin.id}`);
        // Disable logic would go here
      },
      uninstall: async () => {
        console.log(`Uninstalling plugin ${plugin.id}`);
        // Cleanup plugin data
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
          if (key.startsWith(`plugin_${plugin.id}_`)) {
            localStorage.removeItem(key);
          }
        });
      },
      update: async (newVersion: string) => {
        console.log(`Updating plugin ${plugin.id} to version ${newVersion}`);
        // Update logic would go here
      }
    };
  }

  getPluginMetrics(): { [pluginId: string]: any } {
    const metrics: { [pluginId: string]: any } = {};

    this.plugins.forEach((instance, pluginId) => {
      metrics[pluginId] = {
        status: instance.plugin.status,
        memoryUsage: instance.performance.memoryUsage,
        cpuTime: instance.performance.cpuTime,
        errorCount: instance.performance.errorCount,
        lastError: instance.performance.lastError?.message
      };
    });

    return metrics;
  }

  async cleanup(): Promise<void> {
    // Disable all plugins
    const disablePromises = Array.from(this.plugins.values()).map(instance =>
      instance.lifecycle.disable().catch(console.error)
    );
    await Promise.all(disablePromises);

    // Clear registry
    this.plugins.clear();
    this.hooks.clear();
    this.eventEmitter.clear();

    console.log('Plugin registry cleaned up');
  }
}

export class PluginLoader {
  private registry: PluginRegistry;

  constructor(registry: PluginRegistry) {
    this.registry = registry;
  }

  async loadPluginFromUrl(url: string): Promise<void> {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch plugin from ${url}: ${response.statusText}`);
      }

      const pluginData = await response.json();
      await this.loadPluginFromData(pluginData);
    } catch (error) {
      throw new Error(`Plugin loading failed: ${error}`);
    }
  }

  async loadPluginFromData(pluginData: any): Promise<void> {
    const { plugin, manifest } = pluginData;

    if (!plugin || !manifest) {
      throw new Error('Invalid plugin data structure');
    }

    await this.registry.registerPlugin(plugin, manifest);
  }

  async loadPluginFromFile(file: File): Promise<void> {
    try {
      const text = await file.text();
      const pluginData = JSON.parse(text);
      await this.loadPluginFromData(pluginData);
    } catch (error) {
      throw new Error(`Plugin file loading failed: ${error}`);
    }
  }

  async unloadPlugin(pluginId: string): Promise<void> {
    await this.registry.unregisterPlugin(pluginId);
  }
}

// Global plugin system instance
export const pluginRegistry = new PluginRegistry();
export const pluginLoader = new PluginLoader(pluginRegistry);

// Export convenience functions
export const registerPlugin = (plugin: Plugin, manifest: PluginManifest) =>
  pluginRegistry.registerPlugin(plugin, manifest);

export const enablePlugin = (pluginId: string) =>
  pluginRegistry.enablePlugin(pluginId);

export const disablePlugin = (pluginId: string) =>
  pluginRegistry.disablePlugin(pluginId);

export const getPlugin = (pluginId: string) =>
  pluginRegistry.getPlugin(pluginId);

export const getAllPlugins = () =>
  pluginRegistry.getAllPlugins();