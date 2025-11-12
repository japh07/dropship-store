import { EnvEncryption } from './encryption';

// Dynamic imports for server-side only modules
let fs: any = null;
let path: any = null;

if (typeof window === 'undefined') {
  fs = require('fs');
  path = require('path');
}

/**
 * Audit log entry interface
 */
export interface AuditLogEntry {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  category: 'auth' | 'api' | 'user_action' | 'security' | 'system';
  event: string;
  userId?: string;
  email?: string;
  ip?: string;
  userAgent?: string;
  path?: string;
  method?: string;
  data?: Record<string, any>;
  metadata?: Record<string, any>;
  sessionId?: string;
  requestId?: string;
}

/**
 * Log filtering and search options
 */
export interface LogFilterOptions {
  startDate?: Date;
  endDate?: Date;
  userId?: string;
  email?: string;
  level?: AuditLogEntry['level'][];
  category?: AuditLogEntry['category'][];
  event?: string;
  path?: string;
  limit?: number;
  offset?: number;
}

/**
 * Comprehensive audit logging system
 * - Logs all user actions (login, logout, purchases, profile changes)
 * - Logs all API calls with timestamps and user context
 * - Logs security events (failed logins, suspicious activities)
 * - Structured logging format for SIEM integration
 * - Encrypted sensitive data storage
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private logFilePath: string;
  private encryptionEnabled: boolean;
  private consoleLogging: boolean;

  private constructor() {
    // Set up log directory and file (server only)
    if (fs && path) {
      const logDir = path.join(process.cwd(), 'logs');
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }

      this.logFilePath = path.join(logDir, `audit-${new Date().toISOString().split('T')[0]}.log`);
    }

    this.encryptionEnabled = process.env.ENCRYPT_AUDIT_LOGS === 'true';
    this.consoleLogging = process.env.NODE_ENV === 'development';
  }

  /**
   * Get singleton instance
   */
  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Generate unique log entry ID
   */
  private generateLogId(): string {
    return crypto.randomUUID();
  }

  /**
   * Get client IP address from request
   */
  private getClientIP(request?: any): string {
    if (request) {
      return (
        request.ip ||
        request.connection?.remoteAddress ||
        request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
        'unknown'
      );
    }
    return 'server';
  }

  /**
   * Get user agent from request
   */
  private getUserAgent(request?: any): string {
    return request?.headers?.['user-agent'] || 'server';
  }

  /**
   * Encrypt sensitive log data if encryption is enabled
   */
  private encryptSensitiveData(data: Record<string, any>): Record<string, any> {
    if (!this.encryptionEnabled) {
      return data;
    }

    const sensitiveKeys = ['email', 'name', 'api_key', 'token', 'password', 'credit_card'];
    const encrypted = { ...data };

    for (const key of sensitiveKeys) {
      if (encrypted[key]) {
        try {
          encrypted[key] = '[ENCRYPTED]';
          // Store the actual encrypted data in a separate field
          encrypted[`encrypted_${key}`] = EnvEncryption.encrypt(encrypted[key]);
        } catch (error) {
          console.error('Failed to encrypt log data:', error);
        }
      }
    }

    return encrypted;
  }

  /**
   * Write log entry to file
   */
  private async writeLogEntry(entry: AuditLogEntry): Promise<void> {
    try {
      // Log to console in development or client-side
      if (this.consoleLogging || typeof window !== 'undefined') {
        console.log(`[AUDIT-${entry.level}] ${entry.category}:${entry.event}`, entry);
      }

      // Write to file only on server-side
      if (fs && this.logFilePath) {
        const logLine = JSON.stringify(entry) + '\n';
        fs.appendFileSync(this.logFilePath, logLine, 'utf8');
      }
    } catch (error) {
      console.error('Failed to write audit log:', error);
      // Fallback to console logging if file write fails
      console.error(`[AUDIT-${entry.level}] ${entry.category}:${entry.event}`, entry);
    }
  }

  /**
   * Generic log entry creation
   */
  private async createLogEntry(
    level: AuditLogEntry['level'],
    category: AuditLogEntry['category'],
    event: string,
    data?: Record<string, any>,
    request?: any
  ): Promise<void> {
    const entry: AuditLogEntry = {
      id: this.generateLogId(),
      timestamp: new Date().toISOString(),
      level,
      category,
      event,
      ip: this.getClientIP(request),
      userAgent: this.getUserAgent(request),
      path: request?.url || request?.path,
      method: request?.method,
      sessionId: request?.sessionId,
      requestId: request?.requestId,
      data: data ? this.encryptSensitiveData(data) : undefined,
    };

    // Extract user information if available
    if (data?.userId) entry.userId = data.userId;
    if (data?.email) entry.email = data.email;

    await this.writeLogEntry(entry);
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(event: string, data?: Record<string, any>, request?: any): Promise<void> {
    await this.createLogEntry('INFO', 'auth', event, data, request);
  }

  /**
   * Log API calls and responses
   */
  async logAPICall(
    method: string,
    path: string,
    statusCode: number,
    responseTime: number,
    data?: Record<string, any>,
    request?: any
  ): Promise<void> {
    await this.createLogEntry('INFO', 'api', `${method} ${path}`, {
      ...data,
      statusCode,
      responseTime,
      method,
      path,
    }, request);
  }

  /**
   * Log user actions (purchases, profile changes, etc.)
   */
  async logUserAction(
    action: string,
    details: Record<string, any>,
    userId?: string,
    email?: string,
    request?: any
  ): Promise<void> {
    await this.createLogEntry('INFO', 'user_action', action, {
      ...details,
      userId,
      email,
    }, request);
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    event: string,
    data?: Record<string, any>,
    request?: any,
    level: 'WARN' | 'ERROR' = 'WARN'
  ): Promise<void> {
    await this.createLogEntry(level, 'security', event, data, request);
  }

  /**
   * Log system events
   */
  async logSystemEvent(
    event: string,
    data?: Record<string, any>,
    request?: any
  ): Promise<void> {
    await this.createLogEntry('INFO', 'system', event, data, request);
  }

  /**
   * Search and filter audit logs
   */
  async searchLogs(filter: LogFilterOptions = {}): Promise<AuditLogEntry[]> {
    try {
      const logs: AuditLogEntry[] = [];

      // Server-side file reading
      if (fs && this.logFilePath) {
        if (!fs.existsSync(this.logFilePath)) {
          return logs;
        }

        const logContent = fs.readFileSync(this.logFilePath, 'utf8');
        const logLines = logContent.trim().split('\n').filter(line => line);

        for (const line of logLines) {
          try {
            const entry: AuditLogEntry = JSON.parse(line);

            // Apply filters
            if (filter.startDate && new Date(entry.timestamp) < filter.startDate) continue;
            if (filter.endDate && new Date(entry.timestamp) > filter.endDate) continue;
            if (filter.userId && entry.userId !== filter.userId) continue;
            if (filter.email && entry.email !== filter.email) continue;
            if (filter.level && !filter.level.includes(entry.level)) continue;
            if (filter.category && !filter.category.includes(entry.category)) continue;
            if (filter.event && !entry.event.includes(filter.event)) continue;
            if (filter.path && entry.path && !entry.path.includes(filter.path)) continue;

            logs.push(entry);
          } catch (parseError) {
            console.error('Failed to parse log line:', parseError);
          }
        }
      }

      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      // Apply pagination
      if (filter.offset) {
        logs.splice(0, filter.offset);
      }
      if (filter.limit) {
        logs.splice(filter.limit);
      }

      return logs;
    } catch (error) {
      console.error('Failed to search logs:', error);
      return [];
    }
  }

  /**
   * Get log statistics
   */
  async getLogStats(timeRange?: { start: Date; end: Date }): Promise<Record<string, any>> {
    try {
      const logs = await this.searchLogs({
        startDate: timeRange?.start,
        endDate: timeRange?.end,
      });

      const stats = {
        totalLogs: logs.length,
        byLevel: {} as Record<string, number>,
        byCategory: {} as Record<string, number>,
        byEvent: {} as Record<string, number>,
        uniqueUsers: new Set<string>(),
        uniqueIPs: new Set<string>(),
        timeRange,
      };

      for (const log of logs) {
        stats.byLevel[log.level] = (stats.byLevel[log.level] || 0) + 1;
        stats.byCategory[log.category] = (stats.byCategory[log.category] || 0) + 1;
        stats.byEvent[log.event] = (stats.byEvent[log.event] || 0) + 1;

        if (log.userId) stats.uniqueUsers.add(log.userId);
        if (log.ip && log.ip !== 'unknown') stats.uniqueIPs.add(log.ip);
      }

      // Convert Sets to counts
      stats.uniqueUsers = (stats.uniqueUsers as Set<string>).size;
      stats.uniqueIPs = (stats.uniqueIPs as Set<string>).size;

      return stats;
    } catch (error) {
      console.error('Failed to get log stats:', error);
      return {};
    }
  }

  /**
   * Export logs to different formats
   */
  async exportLogs(
    format: 'json' | 'csv' | 'syslog' = 'json',
    filter?: LogFilterOptions
  ): Promise<string> {
    const logs = await this.searchLogs(filter);

    switch (format) {
      case 'csv':
        return this.exportToCSV(logs);
      case 'syslog':
        return this.exportToSyslog(logs);
      case 'json':
      default:
        return JSON.stringify(logs, null, 2);
    }
  }

  /**
   * Export logs to CSV format
   */
  private exportToCSV(logs: AuditLogEntry[]): string {
    const headers = [
      'id', 'timestamp', 'level', 'category', 'event', 'userId', 'email',
      'ip', 'userAgent', 'path', 'method', 'data'
    ];

    const csvRows = [headers.join(',')];

    for (const log of logs) {
      const row = [
        log.id,
        log.timestamp,
        log.level,
        log.category,
        log.event,
        log.userId || '',
        log.email || '',
        log.ip || '',
        log.userAgent || '',
        log.path || '',
        log.method || '',
        log.data ? JSON.stringify(log.data).replace(/"/g, '""') : '',
      ];

      csvRows.push(row.map(field => `"${field}"`).join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Export logs to syslog format
   */
  private exportToSyslog(logs: AuditLogEntry[]): string {
    const syslogLines = [];

    for (const log of logs) {
      const priority = this.getSyslogPriority(log.level);
      const timestamp = new Date(log.timestamp).toISOString();
      const hostname = process.env.HOSTNAME || 'dropship-store';
      const appName = 'audit';
      const message = `${log.category}:${log.event} ${JSON.stringify(log.data || {})}`;

      syslogLines.push(`<${priority}>${timestamp} ${hostname} ${appName}: ${message}`);
    }

    return syslogLines.join('\n');
  }

  /**
   * Convert log level to syslog priority
   */
  private getSyslogPriority(level: AuditLogEntry['level']): number {
    switch (level) {
      case 'ERROR':
        return 3; // Error
      case 'WARN':
        return 4; // Warning
      case 'INFO':
        return 6; // Informational
      case 'SECURITY':
        return 2; // Critical
      default:
        return 6; // Informational
    }
  }

  /**
   * Clean up old log files
   */
  async cleanupOldLogs(retentionDays: number = 90): Promise<void> {
    try {
      if (!fs || !path) return; // Skip on client-side

      const logDir = path.join(process.cwd(), 'logs');
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

      if (fs.existsSync(logDir)) {
        const files = fs.readdirSync(logDir);

        for (const file of files) {
          if (file.startsWith('audit-') && file.endsWith('.log')) {
            const filePath = path.join(logDir, file);
            const stats = fs.statSync(filePath);

            if (stats.mtime < cutoffDate) {
              fs.unlinkSync(filePath);
              console.log(`Deleted old audit log: ${file}`);
            }
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup old logs:', error);
    }
  }
}

// Export singleton instance
export const auditLogger = AuditLogger.getInstance();

// Export utility functions for easy access
export const logAuthEvent = (event: string, data?: Record<string, any>, request?: any) =>
  auditLogger.logAuthEvent(event, data, request);

export const logAPICall = (
  method: string,
  path: string,
  statusCode: number,
  responseTime: number,
  data?: Record<string, any>,
  request?: any
) => auditLogger.logAPICall(method, path, statusCode, responseTime, data, request);

export const logUserAction = (
  action: string,
  details: Record<string, any>,
  userId?: string,
  email?: string,
  request?: any
) => auditLogger.logUserAction(action, details, userId, email, request);

export const logSecurityEvent = (
  event: string,
  data?: Record<string, any>,
  request?: any,
  level: 'WARN' | 'ERROR' = 'WARN'
) => auditLogger.logSecurityEvent(event, data, request, level);

export const logSystemEvent = (event: string, data?: Record<string, any>, request?: any) =>
  auditLogger.logSystemEvent(event, data, request);

export default auditLogger;