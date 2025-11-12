import {
  Plugin,
  PluginManifest,
  PermissionType,
  PluginInstance
} from '@/types';

export interface SecurityConfig {
  maxMemoryUsage: number; // bytes
  maxCpuTime: number; // milliseconds
  allowedDomains: string[];
  blockedDomains: string[];
  enableFunctionValidation: boolean;
  enableWebWorkerIsolation: boolean;
  enableResourceMonitoring: boolean;
}

export interface SecurityViolation {
  type: 'memory_limit' | 'cpu_limit' | 'forbidden_domain' | 'permission_denied' | 'malicious_code';
  pluginId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  context?: any;
}

export interface ResourceLimits {
  memory: {
    used: number;
    limit: number;
    percentage: number;
  };
  cpu: {
    used: number;
    limit: number;
    percentage: number;
  };
  network: {
    requests: number;
    allowedDomains: string[];
  };
}

class SecurityMonitor {
  private violations: SecurityViolation[] = [];
  private resourceUsage: Map<string, ResourceLimits> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  startMonitoring(instance: PluginInstance, config: SecurityConfig): void {
    const pluginId = instance.plugin.id;

    // Initialize resource tracking
    this.resourceUsage.set(pluginId, {
      memory: { used: 0, limit: config.maxMemoryUsage, percentage: 0 },
      cpu: { used: 0, limit: config.maxCpuTime, percentage: 0 },
      network: { requests: 0, allowedDomains: config.allowedDomains }
    });

    if (!this.isMonitoring && config.enableResourceMonitoring) {
      this.isMonitoring = true;
      this.monitoringInterval = setInterval(() => {
        this.checkAllResourceLimits();
      }, 5000); // Check every 5 seconds
    }
  }

  stopMonitoring(pluginId: string): void {
    this.resourceUsage.delete(pluginId);

    if (this.resourceUsage.size === 0 && this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
      this.isMonitoring = false;
    }
  }

  recordMemoryUsage(pluginId: string, usage: number): void {
    const limits = this.resourceUsage.get(pluginId);
    if (limits) {
      limits.memory.used = usage;
      limits.memory.percentage = (usage / limits.memory.limit) * 100;

      if (usage > limits.memory.limit) {
        this.recordViolation({
          type: 'memory_limit',
          pluginId,
          severity: 'high',
          message: `Memory usage (${usage} bytes) exceeds limit (${limits.memory.limit} bytes)`,
          timestamp: new Date()
        });
      }
    }
  }

  recordCpuUsage(pluginId: string, usage: number): void {
    const limits = this.resourceUsage.get(pluginId);
    if (limits) {
      limits.cpu.used += usage;
      limits.cpu.percentage = (limits.cpu.used / limits.cpu.limit) * 100;

      if (limits.cpu.used > limits.cpu.limit) {
        this.recordViolation({
          type: 'cpu_limit',
          pluginId,
          severity: 'high',
          message: `CPU usage (${limits.cpu.used}ms) exceeds limit (${limits.cpu.limit}ms)`,
          timestamp: new Date()
        });
      }
    }
  }

  recordNetworkRequest(pluginId: string, domain: string): boolean {
    const limits = this.resourceUsage.get(pluginId);
    if (!limits) return false;

    limits.network.requests++;

    const allowedDomains = limits.network.allowedDomains;
    if (allowedDomains.length > 0 && !allowedDomains.includes(domain)) {
      this.recordViolation({
        type: 'forbidden_domain',
        pluginId,
        severity: 'medium',
        message: `Access to forbidden domain: ${domain}`,
        timestamp: new Date(),
        context: { domain }
      });
      return false;
    }

    return true;
  }

  recordViolation(violation: SecurityViolation): void {
    this.violations.push(violation);

    // Keep only last 100 violations
    if (this.violations.length > 100) {
      this.violations = this.violations.slice(-100);
    }

    console.warn(`Security violation in plugin ${violation.pluginId}:`, violation);

    // Auto-disable plugin for critical violations
    if (violation.severity === 'critical') {
      this.handleCriticalViolation(violation);
    }
  }

  getViolations(pluginId?: string): SecurityViolation[] {
    if (pluginId) {
      return this.violations.filter(v => v.pluginId === pluginId);
    }
    return [...this.violations];
  }

  getResourceLimits(pluginId: string): ResourceLimits | undefined {
    return this.resourceUsage.get(pluginId);
  }

  private checkAllResourceLimits(): void {
    this.resourceUsage.forEach((limits, pluginId) => {
      // Check memory threshold warnings
      if (limits.memory.percentage > 80 && limits.memory.percentage < 100) {
        this.recordViolation({
          type: 'memory_limit',
          pluginId,
          severity: 'medium',
          message: `Memory usage approaching limit: ${limits.memory.percentage.toFixed(1)}%`,
          timestamp: new Date()
        });
      }

      // Check CPU threshold warnings
      if (limits.cpu.percentage > 80 && limits.cpu.percentage < 100) {
        this.recordViolation({
          type: 'cpu_limit',
          pluginId,
          severity: 'medium',
          message: `CPU usage approaching limit: ${limits.cpu.percentage.toFixed(1)}%`,
          timestamp: new Date()
        });
      }
    });
  }

  private handleCriticalViolation(violation: SecurityViolation): void {
    console.error(`Critical security violation detected for plugin ${violation.pluginId}. Disabling plugin.`);
    // Plugin would be disabled through the registry
  }

  clearViolations(pluginId?: string): void {
    if (pluginId) {
      this.violations = this.violations.filter(v => v.pluginId !== pluginId);
    } else {
      this.violations = [];
    }
  }
}

class FunctionValidator {
  private static readonly DANGEROUS_PATTERNS = [
    /eval\s*\(/gi,
    /Function\s*\(/gi,
    /setTimeout\s*\(/gi,
    /setInterval\s*\(/gi,
    /document\.write/gi,
    /innerHTML\s*=/gi,
    /outerHTML\s*=/gi,
    /insertAdjacentHTML/gi,
    /window\.location/gi,
    /location\.href/gi,
    /location\.replace/gi,
    /localStorage/gi,
    /sessionStorage/gi,
    /indexedDB/gi,
    /webkitStorageInfo/gi,
    /\.cookie/gi,
    /document\.cookie/gi
  ];

  private static readonly SUSPICIOUS_PATTERNS = [
    /crypto\./gi,
    /fetch\s*\(/gi,
    /XMLHttpRequest/gi,
    /WebSocket/gi,
    /Worker/gi,
    /SharedWorker/gi,
    /ServiceWorker/gi,
    /postMessage/gi,
    /addEventListener/gi,
    /removeEventListener/gi
  ];

  static validatePluginCode(code: string, permissions: PermissionType[]): {
    isValid: boolean;
    violations: string[];
    warnings: string[];
  } {
    const violations: string[] = [];
    const warnings: string[] = [];

    // Check for dangerous patterns
    this.DANGEROUS_PATTERNS.forEach(pattern => {
      if (pattern.test(code)) {
        violations.push(`Dangerous code pattern detected: ${pattern.source}`);
      }
    });

    // Check for suspicious patterns based on permissions
    this.SUSPICIOUS_PATTERNS.forEach(pattern => {
      if (pattern.test(code)) {
        const hasPermission = this.hasPermissionForPattern(pattern.source, permissions);
        if (!hasPermission) {
          violations.push(`Suspicious code pattern without permission: ${pattern.source}`);
        } else {
          warnings.push(`Suspicious code pattern with permission: ${pattern.source}`);
        }
      }
    });

    // Check for access to global objects
    const globalAccessPatterns = [
      /window\./gi,
      /global\./gi,
      /globalThis\./gi,
      /process\./gi
    ];

    globalAccessPatterns.forEach(pattern => {
      if (pattern.test(code)) {
        warnings.push(`Global object access detected: ${pattern.source}`);
      }
    });

    // Check for dynamic code execution attempts
    const dynamicPatterns = [
      /\[.*\]\(/gi,  // Dynamic function calls
      /new\s+Function/gi,
      /constructor\s*\(/gi
    ];

    dynamicPatterns.forEach(pattern => {
      if (pattern.test(code)) {
        violations.push(`Dynamic code execution detected: ${pattern.source}`);
      }
    });

    return {
      isValid: violations.length === 0,
      violations,
      warnings
    };
  }

  private static hasPermissionForPattern(pattern: string, permissions: PermissionType[]): boolean {
    const permissionMap: { [key: string]: PermissionType[] } = {
      'fetch': ['api.external'],
      'XMLHttpRequest': ['api.external'],
      'WebSocket': ['api.external'],
      'Worker': ['storage.write'], // Workers might need storage
      'postMessage': ['ui.modify'],
      'addEventListener': ['ui.modify'],
      'crypto': ['storage.write'] // Crypto operations might need storage
    };

    for (const [key, requiredPermissions] of Object.entries(permissionMap)) {
      if (pattern.includes(key)) {
        return requiredPermissions.some(perm => permissions.includes(perm));
      }
    }

    return false;
  }

  static sanitizeFunction(func: Function): Function {
    const funcString = func.toString();

    // Create a wrapper that prevents access to dangerous globals
    return new Function(`
      "use strict";

      // Block dangerous globals
      const blockedGlobals = ['eval', 'Function', 'setTimeout', 'setInterval', 'document', 'window', 'location'];
      const safeGlobal = {};

      // Copy safe globals
      Object.keys(globalThis).forEach(key => {
        if (!blockedGlobals.includes(key)) {
          safeGlobal[key] = globalThis[key];
        }
      });

      // Execute the function in a restricted context
      return (${funcString}).apply(safeGlobal, arguments);
    `);
  }
}

export class PluginSandbox {
  private securityMonitor: SecurityMonitor;
  private config: SecurityConfig;
  private webWorkers: Map<string, Worker> = new Map();

  constructor(config: SecurityConfig) {
    this.config = config;
    this.securityMonitor = new SecurityMonitor();
  }

  async executePluginFunction(
    instance: PluginInstance,
    functionName: string,
    args: any[] = []
  ): Promise<any> {
    const pluginId = instance.plugin.id;

    try {
      // Start monitoring if not already active
      this.securityMonitor.startMonitoring(instance, this.config);

      const startTime = performance.now();

      let result: any;

      // Choose execution method based on security level and plugin type
      if (this.config.enableWebWorkerIsolation && this.shouldUseWebWorker(instance)) {
        result = await this.executeInWebWorker(instance, functionName, args);
      } else {
        result = await this.executeInMainThread(instance, functionName, args);
      }

      const endTime = performance.now();
      const executionTime = endTime - startTime;

      // Record CPU usage
      this.securityMonitor.recordCpuUsage(pluginId, executionTime);

      return result;
    } catch (error) {
      this.securityMonitor.recordViolation({
        type: 'permission_denied',
        pluginId,
        severity: 'medium',
        message: `Function execution failed: ${error}`,
        timestamp: new Date(),
        context: { functionName, args }
      });
      throw error;
    }
  }

  validatePlugin(plugin: Plugin, code: string): {
    isValid: boolean;
    violations: string[];
    warnings: string[];
  } {
    // Validate code for security issues
    const codeValidation = FunctionValidator.validatePluginCode(code, plugin.permissions);

    // Additional manifest validation
    const manifestViolations = this.validateManifest(plugin);

    return {
      isValid: codeValidation.isValid && manifestViolations.length === 0,
      violations: [...codeValidation.violations, ...manifestViolations],
      warnings: codeValidation.warnings
    };
  }

  getSecurityReport(pluginId?: string): {
    violations: SecurityViolation[];
    resourceLimits?: ResourceLimits;
    recommendations: string[];
  } {
    const violations = this.securityMonitor.getViolations(pluginId);
    const resourceLimits = pluginId ? this.securityMonitor.getResourceLimits(pluginId) : undefined;
    const recommendations = this.generateRecommendations(violations, resourceLimits);

    return {
      violations,
      resourceLimits,
      recommendations
    };
  }

  async cleanup(pluginId: string): Promise<void> {
    // Stop monitoring
    this.securityMonitor.stopMonitoring(pluginId);

    // Terminate web worker if exists
    const worker = this.webWorkers.get(pluginId);
    if (worker) {
      worker.terminate();
      this.webWorkers.delete(pluginId);
    }

    // Clear violations for this plugin
    this.securityMonitor.clearViolations(pluginId);
  }

  async cleanupAll(): Promise<void> {
    // Terminate all web workers
    this.webWorkers.forEach(worker => worker.terminate());
    this.webWorkers.clear();

    // Clear all monitoring data
    this.securityMonitor.clearViolations();
  }

  private shouldUseWebWorker(instance: PluginInstance): boolean {
    const plugin = instance.plugin;

    // Use Web Workers for computational plugins
    const computationalCategories = ['analytics', 'shipping', 'payment'];
    return computationalCategories.includes(plugin.category);
  }

  private async executeInWebWorker(
    instance: PluginInstance,
    functionName: string,
    args: any[]
  ): Promise<any> {
    const pluginId = instance.plugin.id;
    let worker = this.webWorkers.get(pluginId);

    if (!worker) {
      worker = await this.createWebWorker(instance);
      this.webWorkers.set(pluginId, worker);
    }

    return new Promise((resolve, reject) => {
      const messageId = Math.random().toString(36).substr(2, 9);
      const timeout = setTimeout(() => {
        reject(new Error(`WebWorker execution timeout for ${functionName}`));
      }, 10000); // 10 second timeout

      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === messageId) {
          clearTimeout(timeout);
          worker!.removeEventListener('message', handleMessage);

          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result);
          }
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({
        id: messageId,
        functionName,
        args
      });
    });
  }

  private async executeInMainThread(
    instance: PluginInstance,
    functionName: string,
    args: any[]
  ): Promise<any> {
    // In a real implementation, this would execute the plugin function
    // with function validation applied
    console.log(`Executing ${functionName} for plugin ${instance.plugin.id} in main thread`);
    return null;
  }

  private async createWebWorker(instance: PluginInstance): Promise<Worker> {
    const workerCode = `
      let pluginInstance = null;

      self.onmessage = function(event) {
        const { id, functionName, args } = event.data;

        try {
          // Execute function with memory monitoring
          const result = executeFunction(functionName, args);

          self.postMessage({
            id,
            result,
            memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 0
          });
        } catch (error) {
          self.postMessage({
            id,
            error: error.message
          });
        }
      };

      function executeFunction(functionName, args) {
        // This would contain the actual plugin function execution
        // For now, return a placeholder
        return { functionName, args, timestamp: Date.now() };
      }
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(blob);

    return new Worker(workerUrl);
  }

  private validateManifest(plugin: Plugin): string[] {
    const violations: string[] = [];

    // Check required fields
    if (!plugin.id || !plugin.name || !plugin.version) {
      violations.push('Plugin manifest missing required fields');
    }

    // Check permission validity
    const validPermissions: PermissionType[] = [
      'storage.read', 'storage.write', 'api.external', 'ui.modify', 'analytics.track', 'cart.access'
    ];

    plugin.permissions.forEach(permission => {
      if (!validPermissions.includes(permission)) {
        violations.push(`Invalid permission: ${permission}`);
      }
    });

    // Check for suspicious combinations
    if (plugin.permissions.includes('ui.modify') && plugin.category === 'payment') {
      violations.push('Payment plugins should not have UI modification permissions');
    }

    return violations;
  }

  private generateRecommendations(
    violations: SecurityViolation[],
    resourceLimits?: ResourceLimits
  ): string[] {
    const recommendations: string[] = [];

    // Analyze violations
    const violationTypes = violations.reduce((acc, v) => {
      acc[v.type] = (acc[v.type] || 0) + 1;
      return acc;
    }, {} as { [key: string]: number });

    if (violationTypes['memory_limit'] > 0) {
      recommendations.push('Consider optimizing memory usage or increasing memory limits');
    }

    if (violationTypes['cpu_limit'] > 0) {
      recommendations.push('Optimize code for better CPU performance or consider Web Workers');
    }

    if (violationTypes['forbidden_domain'] > 0) {
      recommendations.push('Review network access permissions and allowed domains');
    }

    if (violationTypes['permission_denied'] > 0) {
      recommendations.push('Review plugin permissions and ensure proper access control');
    }

    // Analyze resource usage
    if (resourceLimits) {
      if (resourceLimits.memory.percentage > 80) {
        recommendations.push('Memory usage is high - consider memory optimization');
      }

      if (resourceLimits.cpu.percentage > 80) {
        recommendations.push('CPU usage is high - consider performance optimization');
      }
    }

    return recommendations;
  }
}

// Default security configuration
export const defaultSecurityConfig: SecurityConfig = {
  maxMemoryUsage: 50 * 1024 * 1024, // 50MB
  maxCpuTime: 5000, // 5 seconds
  allowedDomains: [
    'api.example.com',
    'cdn.example.com',
    'analytics.example.com'
  ],
  blockedDomains: [
    'evil.com',
    'malware.net'
  ],
  enableFunctionValidation: true,
  enableWebWorkerIsolation: true,
  enableResourceMonitoring: true
};

// Export singleton instances
export const securityMonitor = new SecurityMonitor();
export const pluginSandbox = new PluginSandbox(defaultSecurityConfig);