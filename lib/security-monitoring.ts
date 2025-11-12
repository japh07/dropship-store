import { auditLogger, LogFilterOptions } from './audit-logger';

/**
 * Security event types for monitoring
 */
export interface SecurityEvent {
  type: 'authentication' | 'authorization' | 'data_breach' | 'malicious_request' | 'system_threat';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  timestamp: string;
  source: {
    ip: string;
    userAgent?: string;
    userId?: string;
    sessionId?: string;
    requestId?: string;
  };
  metadata?: Record<string, any>;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

/**
 * Security metrics and analytics
 */
export interface SecurityMetrics {
  timeRange: {
    start: Date;
    end: Date;
  };
  totalEvents: number;
  eventsByType: Record<string, number>;
  eventsBySeverity: Record<string, number>;
  topSourceIPs: Array<{ ip: string; count: number; userId?: string }>;
  failedAuthAttempts: number;
  suspiciousActivities: number;
  blockedRequests: number;
  resolvedIncidents: number;
  openIncidents: number;
  averageResponseTime: number;
}

/**
 * Security alert configuration
 */
export interface SecurityAlert {
  id: string;
  type: 'email' | 'webhook' | 'slack' | 'sms';
  enabled: boolean;
  config: {
    recipients?: string[];
    webhookUrl?: string;
    slackChannel?: string;
    phoneNumber?: string;
  };
  conditions: {
    eventTypes: string[];
    severityThreshold: 'low' | 'medium' | 'high' | 'critical';
    frequencyLimit?: number; // Maximum alerts per hour
  };
}

/**
 * Real-time threat detection and security monitoring system
 * - Monitors audit logs for suspicious patterns
 * - Automated security alerts
 * - Anomalous behavior identification
 * - Integration with audit logs
 */
export class SecurityMonitoring {
  private static instance: SecurityMonitoring;
  private alerts: SecurityAlert[] = [];
  private eventHistory: SecurityEvent[] = [];
  private alertThrottle = new Map<string, number>();

  private constructor() {
    this.initializeDefaultAlerts();
    this.startBackgroundMonitoring();
  }

  /**
   * Get singleton instance
   */
  static getInstance(): SecurityMonitoring {
    if (!SecurityMonitoring.instance) {
      SecurityMonitoring.instance = new SecurityMonitoring();
    }
    return SecurityMonitoring.instance;
  }

  /**
   * Initialize default security alerts
   */
  private initializeDefaultAlerts(): void {
    // Critical authentication failures
    this.addAlert({
      id: 'critical-auth-failures',
      type: 'email',
      enabled: process.env.SECURITY_EMAIL ? true : false,
      config: {
        recipients: process.env.SECURITY_EMAIL ? [process.env.SECURITY_EMAIL] : [],
      },
      conditions: {
        eventTypes: ['signin_failed', 'token_expired_access', 'unauthorized_access_attempt'],
        severityThreshold: 'critical',
        frequencyLimit: 5, // Maximum 5 alerts per hour
      },
    });

    // Slack webhook for high severity events
    this.addAlert({
      id: 'high-severity-events',
      type: 'webhook',
      enabled: process.env.SECURITY_WEBHOOK_URL ? true : false,
      config: {
        webhookUrl: process.env.SECURITY_WEBHOOK_URL || '',
      },
      conditions: {
        eventTypes: ['rate_limit_exceeded', 'malicious_request_detected'],
        severityThreshold: 'high',
        frequencyLimit: 10,
      },
    });
  }

  /**
   * Start background monitoring
   */
  private startBackgroundMonitoring(): void {
    // Monitor for suspicious patterns every 5 minutes
    setInterval(() => {
      this.detectAnomalousPatterns();
      this.cleanupOldEvents();
      this.processAlertThrottling();
    }, 5 * 60 * 1000);

    // Analyze failed authentication attempts every minute
    setInterval(() => {
      this.analyzeFailedAuthentications();
    }, 60 * 1000);
  }

  /**
   * Detect anomalous patterns in audit logs
   */
  private async detectAnomalousPatterns(): Promise<void> {
    try {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const logs = await auditLogger.searchLogs({
        startDate: oneHourAgo,
        level: ['WARN', 'ERROR', 'SECURITY'],
      });

      // Detect patterns
      await this.detectBruteForceAttacks(logs);
      await this.detectUnusualAPIUsage(logs);
      await this.detectDataAccessAnomalies(logs);
      await this.detectGeographicalAnomalies(logs);
    } catch (error) {
      console.error('Error in anomaly detection:', error);
    }
  }

  /**
   * Detect potential brute force attacks
   */
  private async detectBruteForceAttacks(logs: any[]): Promise<void> {
    const failedLogins = logs.filter(log =>
      log.event === 'signin_failed' ||
      log.event === 'unauthorized_access_attempt'
    );

    // Group by IP address
    const ipGroups = failedLogins.reduce((groups, log) => {
      const ip = log.ip || 'unknown';
      groups[ip] = (groups[ip] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);

    // Check for suspicious activity (more than 10 failed attempts from same IP)
    for (const [ip, count] of Object.entries(ipGroups)) {
      if (count >= 10) {
        await this.createSecurityEvent({
          type: 'authentication',
          severity: count >= 50 ? 'critical' : 'high',
          title: 'Potential Brute Force Attack Detected',
          description: `${count} failed authentication attempts from IP: ${ip}`,
          timestamp: new Date().toISOString(),
          source: {
            ip,
          },
          metadata: {
            failedAttempts: count,
            timeWindow: '1 hour',
          },
          resolved: false,
        });
      }
    }
  }

  /**
   * Detect unusual API usage patterns
   */
  private async detectUnusualAPIUsage(logs: any[]): Promise<void> {
    const apiCalls = logs.filter(log =>
      log.category === 'api' && log.event.includes('GET') || log.event.includes('POST')
    );

    // Group by user ID
    const userGroups = apiCalls.reduce((groups, log) => {
      const userId = log.userId || 'anonymous';
      groups[userId] = (groups[userId] || 0) + 1;
      return groups;
    }, {} as Record<string, number>);

    // Check for excessive API usage (more than 1000 calls per hour)
    for (const [userId, count] of Object.entries(userGroups)) {
      if (count >= 1000) {
        await this.createSecurityEvent({
          type: 'malicious_request',
          severity: 'medium',
          title: 'Excessive API Usage Detected',
          description: `User ${userId} made ${count} API calls in the last hour`,
          timestamp: new Date().toISOString(),
          source: {
            ip: 'server',
            userId,
          },
          metadata: {
            apiCalls: count,
            timeWindow: '1 hour',
          },
          resolved: false,
        });
      }
    }
  }

  /**
   * Detect data access anomalies
   */
  private async detectDataAccessAnomalies(logs: any[]): Promise<void> {
    const dataAccess = logs.filter(log =>
      log.event.includes('fetch_products') ||
      log.event.includes('user_action') ||
      log.event.includes('api_call')
    );

    // Look for unusual access patterns (e.g., accessing too much data)
    for (const log of dataAccess) {
      if (log.data?.productCount > 1000 || log.data?.responseTime > 30000) {
        await this.createSecurityEvent({
          type: 'data_breach',
          severity: 'medium',
          title: 'Unusual Data Access Pattern',
          description: `Unusual data access detected: ${log.event}`,
          timestamp: new Date().toISOString(),
          source: {
            ip: log.ip,
            userId: log.userId,
          },
          metadata: log.data,
          resolved: false,
        });
      }
    }
  }

  /**
   * Detect geographical anomalies (would need GeoIP database)
   */
  private async detectGeographicalAnomalies(logs: any[]): Promise<void> {
    // Placeholder for geographical anomaly detection
    // This would integrate with a GeoIP service to detect:
    // - Logins from unusual geographic locations
    // - Impossible travel times between locations
    // - Access from high-risk countries
  }

  /**
   * Analyze failed authentication patterns
   */
  private async analyzeFailedAuthentications(): Promise<void> {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const logs = await auditLogger.searchLogs({
      startDate: fiveMinutesAgo,
      level: ['WARN', 'ERROR'],
    });

    const authFailures = logs.filter(log =>
      log.event.includes('signin_failed') ||
      log.event.includes('unauthorized_access') ||
      log.event.includes('authentication_error')
    );

    // Trigger immediate alerts for critical patterns
    if (authFailures.length >= 50) {
      await this.triggerImmediateAlert({
        type: 'authentication',
        severity: 'critical',
        title: 'Critical Authentication Failure Rate',
        description: `${authFailures.length} authentication failures in 5 minutes`,
        timestamp: new Date().toISOString(),
        source: {
          ip: 'server',
        },
        metadata: {
          failureCount: authFailures.length,
          timeWindow: '5 minutes',
        },
        resolved: false,
      });
    }
  }

  /**
   * Create a security event
   */
  async createSecurityEvent(event: Omit<SecurityEvent, 'id'>): Promise<string> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
    };

    this.eventHistory.push(securityEvent);

    // Log to audit logger
    await auditLogger.logSecurityEvent(
      securityEvent.type,
      {
        ...securityEvent.metadata,
        securityEventId: securityEvent.id,
        title: securityEvent.title,
        description: securityEvent.description,
      },
      null,
      securityEvent.severity === 'critical' ? 'ERROR' : 'WARN'
    );

    // Trigger alerts
    await this.triggerAlerts(securityEvent);

    return securityEvent.id;
  }

  /**
   * Trigger alerts based on event
   */
  private async triggerAlerts(event: SecurityEvent): Promise<void> {
    for (const alert of this.alerts) {
      if (!alert.enabled) continue;

      // Check if event matches alert conditions
      const eventTypeMatch = alert.conditions.eventTypes.includes(event.type);
      const severityMatch = this.compareSeverity(
        event.severity,
        alert.conditions.severityThreshold
      );

      if (eventTypeMatch && severityMatch) {
        // Check throttling
        if (this.isAlertThrottled(alert.id)) continue;

        await this.sendAlert(alert, event);
        this.updateAlertThrottle(alert.id);
      }
    }
  }

  /**
   * Compare severity levels
   */
  private compareSeverity(
    eventSeverity: string,
    threshold: string
  ): boolean {
    const severityLevels = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const eventLevel = severityLevels[eventSeverity as keyof typeof severityLevels];
    const thresholdLevel = severityLevels[threshold as keyof typeof severityLevels];

    return eventLevel >= thresholdLevel;
  }

  /**
   * Check if alert is throttled
   */
  private isAlertThrottled(alertId: string): boolean {
    const lastSent = this.alertThrottle.get(alertId) || 0;
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    return lastSent > oneHourAgo;
  }

  /**
   * Update alert throttle
   */
  private updateAlertThrottle(alertId: string): void {
    this.alertThrottle.set(alertId, Date.now());
  }

  /**
   * Send alert through configured channel
   */
  private async sendAlert(alert: SecurityAlert, event: SecurityEvent): Promise<void> {
    try {
      switch (alert.type) {
        case 'email':
          await this.sendEmailAlert(alert, event);
          break;
        case 'webhook':
          await this.sendWebhookAlert(alert, event);
          break;
        case 'slack':
          await this.sendSlackAlert(alert, event);
          break;
        case 'sms':
          await this.sendSMSAlert(alert, event);
          break;
      }
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: SecurityAlert, event: SecurityEvent): Promise<void> {
    // Implementation would depend on email service provider
    console.log('Email alert sent:', {
      to: alert.config.recipients,
      subject: `Security Alert: ${event.title}`,
      body: event.description,
    });
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: SecurityAlert, event: SecurityEvent): Promise<void> {
    if (!alert.config.webhookUrl) return;

    await fetch(alert.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        alert: event,
        timestamp: new Date().toISOString(),
      }),
    });
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: SecurityAlert, event: SecurityEvent): Promise<void> {
    if (!alert.config.webhookUrl) return;

    const slackMessage = {
      text: `🚨 Security Alert: ${event.title}`,
      attachments: [
        {
          color: this.getSeverityColor(event.severity),
          fields: [
            {
              title: 'Severity',
              value: event.severity.toUpperCase(),
              short: true,
            },
            {
              title: 'Type',
              value: event.type,
              short: true,
            },
            {
              title: 'Description',
              value: event.description,
              short: false,
            },
            {
              title: 'Source IP',
              value: event.source.ip,
              short: true,
            },
            {
              title: 'Timestamp',
              value: event.timestamp,
              short: true,
            },
          ],
        },
      ],
    };

    await fetch(alert.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(slackMessage),
    });
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(alert: SecurityAlert, event: SecurityEvent): Promise<void> {
    // Implementation would depend on SMS service provider
    console.log('SMS alert sent:', {
      to: alert.config.phoneNumber,
      message: `Security Alert: ${event.title} - ${event.description}`,
    });
  }

  /**
   * Get severity color for Slack
   */
  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'danger';
      case 'high':
        return 'warning';
      case 'medium':
        return 'good';
      default:
        return 'warning';
    }
  }

  /**
   * Add security alert configuration
   */
  addAlert(alert: SecurityAlert): void {
    this.alerts.push(alert);
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeRange?: { start: Date; end: Date }): Promise<SecurityMetrics> {
    const defaultTimeRange = {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000), // 24 hours ago
      end: new Date(),
    };

    const range = timeRange || defaultTimeRange;

    try {
      const logs = await auditLogger.searchLogs({
        startDate: range.start,
        endDate: range.end,
        level: ['WARN', 'ERROR', 'SECURITY'],
      });

      const events = this.eventHistory.filter(event =>
        new Date(event.timestamp) >= range.start && new Date(event.timestamp) <= range.end
      );

      return {
        timeRange: range,
        totalEvents: events.length,
        eventsByType: events.reduce((types, event) => {
          types[event.type] = (types[event.type] || 0) + 1;
          return types;
        }, {} as Record<string, number>),
        eventsBySeverity: events.reduce((severities, event) => {
          severities[event.severity] = (severities[event.severity] || 0) + 1;
          return severities;
        }, {} as Record<string, number>),
        topSourceIPs: this.getTopSourceIPs(logs),
        failedAuthAttempts: logs.filter(log => log.event.includes('failed')).length,
        suspiciousActivities: events.filter(e => e.type === 'malicious_request').length,
        blockedRequests: logs.filter(log => log.event.includes('rate_limit')).length,
        resolvedIncidents: events.filter(e => e.resolved).length,
        openIncidents: events.filter(e => !e.resolved).length,
        averageResponseTime: this.calculateAverageResponseTime(logs),
      };
    } catch (error) {
      console.error('Error getting security metrics:', error);
      return {
        timeRange: range,
        totalEvents: 0,
        eventsByType: {},
        eventsBySeverity: {},
        topSourceIPs: [],
        failedAuthAttempts: 0,
        suspiciousActivities: 0,
        blockedRequests: 0,
        resolvedIncidents: 0,
        openIncidents: 0,
        averageResponseTime: 0,
      };
    }
  }

  /**
   * Get top source IPs from logs
   */
  private getTopSourceIPs(logs: any[]): Array<{ ip: string; count: number; userId?: string }> {
    const ipCounts = logs.reduce((counts, log) => {
      const ip = log.ip || 'unknown';
      counts[ip] = (counts[ip] || 0) + 1;
      return counts;
    }, {} as Record<string, number>);

    return Object.entries(ipCounts)
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Calculate average response time
   */
  private calculateAverageResponseTime(logs: any[]): number {
    const responseTimes = logs
      .filter(log => log.data?.responseTime)
      .map(log => log.data.responseTime);

    if (responseTimes.length === 0) return 0;

    return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
  }

  /**
   * Process alert throttling cleanup
   */
  private processAlertThrottling(): void {
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [alertId, timestamp] of this.alertThrottle.entries()) {
      if (timestamp < oneHourAgo) {
        this.alertThrottle.delete(alertId);
      }
    }
  }

  /**
   * Clean up old events
   */
  private cleanupOldEvents(): void {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    this.eventHistory = this.eventHistory.filter(
      event => new Date(event.timestamp).getTime() > thirtyDaysAgo
    );
  }

  /**
   * Trigger immediate alert for critical events
   */
  private async triggerImmediateAlert(event: Omit<SecurityEvent, 'id'>): Promise<void> {
    await this.createSecurityEvent(event);

    // Send critical alerts immediately
    for (const alert of this.alerts) {
      if (alert.enabled && alert.conditions.severityThreshold === 'critical') {
        const securityEvent = { ...event, id: crypto.randomUUID(), resolved: false };
        await this.sendAlert(alert, securityEvent);
      }
    }
  }
}

// Export singleton instance
export const securityMonitoring = SecurityMonitoring.getInstance();
export default securityMonitoring;