import { auditLogger } from './audit-logger';
import { currencyService } from './currency-service';
import { notificationService } from './notification-service';
import type {
  TaxProvider,
  TaxCalculation,
  TaxRate,
  TaxExemption,
  TaxFiling,
  TaxJurisdiction,
  NexusStatus,
  TaxReport
} from '@/types';

export class TaxAutomationService {
  private providers = new Map<string, TaxProvider>();
  private taxRates = new Map<string, TaxRate>();
  private nexusStatuses = new Map<string, NexusStatus>();
  private taxFilings = new Map<string, TaxFiling>();
  private exemptions = new Map<string, TaxExemption>();

  /**
   * Initialize tax automation
   */
  async initialize(): Promise<void> {
    await this.initializeProviders();
    await this.loadTaxRates();
    await this.loadNexusStatuses();
    await this.startTaxMonitoring();
    this.startFilingScheduler();

    console.log('Tax automation initialized');
  }

  /**
   * Calculate tax for transaction
   */
  async calculateTax(transaction: TaxableTransaction): Promise<TaxCalculation> {
    try {
      // Determine tax jurisdiction
      const jurisdiction = await this.determineTaxJurisdiction(transaction);

      // Check for tax exemption
      const exemption = await this.checkTaxExemption(transaction.customer, transaction.items);

      // Calculate tax using appropriate provider
      const calculation = await this.calculateTaxWithProvider(transaction, jurisdiction, exemption);

      // Validate calculation
      await this.validateTaxCalculation(calculation, transaction);

      // Cache the calculation
      await this.cacheTaxCalculation(calculation);

      await auditLogger.logTaxEvent('tax_calculated', {
        transactionId: transaction.id,
        jurisdiction: jurisdiction.state,
        totalTax: calculation.totalTax,
        exemptionApplied: exemption !== null,
        provider: calculation.provider
      });

      return calculation;

    } catch (error) {
      console.error('Tax calculation failed:', error);
      throw new Error(`Tax calculation failed: ${error.message}`);
    }
  }

  /**
   * Validate and update nexus status
   */
  async updateNexusStatus(
    states: string[],
    provider: 'taxjar' | 'avalara' = 'taxjar'
  ): Promise<NexusStatusUpdate> {
    try {
      const taxProvider = this.providers.get(provider);
      if (!taxProvider) {
        throw new Error(`Tax provider ${provider} not found`);
      }

      const nexusStatuses: NexusStatus[] = [];

      for (const state of states) {
        try {
          const nexusData = await taxProvider.checkNexusStatus(state);
          const nexusStatus: NexusStatus = {
            state,
            hasNexus: nexusData.hasNexus,
            nexusType: nexusData.nexusType,
            establishedDate: nexusData.establishedDate,
            lastSaleDate: nexusData.lastSaleDate,
            totalSales: nexusData.totalSales,
            threshold: nexusData.threshold,
            filingRequirements: nexusData.filingRequirements,
            lastChecked: new Date()
          };

          nexusStatuses.push(nexusStatus);
          this.nexusStatuses.set(`${provider}-${state}`, nexusStatus);

        } catch (error) {
          console.error(`Failed to check nexus for ${state}:`, error);
          nexusStatuses.push({
            state,
            hasNexus: false,
            lastChecked: new Date(),
            error: error.message
          });
        }
      }

      // Check for new nexus obligations
      const newNexus = nexusStatuses.filter(status => status.hasNexus);
      const existingStates = Array.from(this.nexusStatuses.values())
        .filter(status => status.hasNexus)
        .map(status => status.state);

      const newNexusStates = newNexus
        .filter(status => !existingStates.includes(status.state))
        .map(status => status.state);

      if (newNexusStates.length > 0) {
        await this.handleNewNexus(newNexusStates);
      }

      const result: NexusStatusUpdate = {
        provider,
        statesChecked: states,
        nexusStatuses,
        newNexusStates,
        updateDate: new Date()
      };

      await auditLogger.logTaxEvent('nexus_status_updated', {
        provider,
        statesChecked: states.length,
        newNexusStates: newNexusStates.length,
        totalNexusStates: newNexus.length
      });

      return result;

    } catch (error) {
      console.error('Nexus status update failed:', error);
      throw new Error(`Nexus status update failed: ${error.message}`);
    }
  }

  /**
   * Generate and file tax returns
   */
  async generateTaxFiling(
    period: { startDate: Date; endDate: Date },
    jurisdictions: string[],
    provider: 'taxjar' | 'avalara' = 'taxjar'
  ): Promise<TaxFiling> {
    try {
      const taxProvider = this.providers.get(provider);
      if (!taxProvider) {
        throw new Error(`Tax provider ${provider} not found`);
      }

      // Collect transaction data for period
      const transactions = await this.getTaxableTransactions(period);

      // Group by jurisdiction
      const transactionsByJurisdiction = this.groupTransactionsByJurisdiction(transactions);

      const filings: TaxFiling[] = [];

      for (const jurisdiction of jurisdictions) {
        try {
          const jurisdictionTransactions = transactionsByJurisdiction[jurisdiction] || [];

          if (jurisdictionTransactions.length === 0) {
            continue;
          }

          // Generate filing data
          const filingData = await this.generateFilingData(
            jurisdictionTransactions,
            jurisdiction,
            period
          );

          // Create filing with provider
          const filing = await taxProvider.createFiling(filingData);

          const taxFiling: TaxFiling = {
            id: filing.id,
            jurisdiction,
            period,
            provider,
            status: 'prepared',
            totalSales: filingData.totalSales,
            totalTax: filingData.totalTax,
            taxableSales: filingData.taxableSales,
            exemptSales: filingData.exemptSales,
            dueDate: this.calculateDueDate(period, jurisdiction),
            filingId: filing.filingId,
            createdAt: new Date(),
            submittedAt: null
          };

          filings.push(taxFiling);
          this.taxFilings.set(taxFiling.id, taxFiling);

        } catch (error) {
          console.error(`Failed to generate filing for ${jurisdiction}:`, error);
        }
      }

      if (filings.length === 0) {
        throw new Error('No tax filings generated');
      }

      // Submit filings (optional - can be done manually)
      if (process.env.AUTO_SUBMIT_TAX_FILINGS === 'true') {
        for (const filing of filings) {
          await this.submitTaxFiling(filing.id);
        }
      }

      await auditLogger.logTaxEvent('tax_filing_generated', {
        provider,
        period,
        jurisdictionCount: filings.length,
        totalTax: filings.reduce((sum, f) => sum + f.totalTax, 0)
      });

      return filings[0]; // Return primary filing

    } catch (error) {
      console.error('Tax filing generation failed:', error);
      throw new Error(`Tax filing generation failed: ${error.message}`);
    }
  }

  /**
   * Handle tax exemption certificates
   */
  async processExemptionCertificate(
    certificateData: ExemptionCertificateData
  ): Promise<TaxExemption> {
    try {
      // Validate certificate
      const validation = await this.validateExemptionCertificate(certificateData);
      if (!validation.isValid) {
        throw new Error(`Invalid certificate: ${validation.errors.join(', ')}`);
      }

      const exemption: TaxExemption = {
        id: this.generateExemptionId(),
        customerId: certificateData.customerId,
        certificateType: certificateData.certificateType,
        certificateNumber: certificateData.certificateNumber,
        issuingState: certificateData.issuingState,
        expirationDate: certificateData.expirationDate,
        jurisdictions: certificateData.jurisdictions,
        status: 'active',
        documents: certificateData.documents,
        verifiedAt: new Date(),
        createdAt: new Date()
      };

      this.exemptions.set(exemption.id, exemption);

      await auditLogger.logTaxEvent('exemption_certificate_processed', {
        exemptionId: exemption.id,
        customerId: exemption.customerId,
        certificateType: exemption.certificateType,
        jurisdictions: exemption.jurisdictions.length
      });

      return exemption;

    } catch (error) {
      console.error('Exemption certificate processing failed:', error);
      throw new Error(`Exemption certificate processing failed: ${error.message}`);
    }
  }

  /**
   * Generate tax compliance report
   */
  async generateTaxComplianceReport(
    period: { startDate: Date; endDate: Date },
    provider: 'taxjar' | 'avalara' = 'taxjar'
  ): Promise<TaxReport> {
    try {
      const taxProvider = this.providers.get(provider);
      if (!taxProvider) {
        throw new Error(`Tax provider ${provider} not found`);
      }

      // Get compliance data
      const complianceData = await taxProvider.getComplianceData(period);

      // Get nexus status
      const nexusStatuses = Array.from(this.nexusStatuses.values())
        .filter(status => status.hasNexus);

      // Get pending filings
      const pendingFilings = Array.from(this.taxFilings.values())
        .filter(filing => filing.status === 'prepared');

      // Calculate compliance metrics
      const metrics = await this.calculateComplianceMetrics(period, nexusStatuses);

      const report: TaxReport = {
        id: this.generateReportId(),
        period,
        provider,
        nexusStatuses,
        pendingFilings,
        totalSales: complianceData.totalSales,
        totalTaxCollected: complianceData.totalTaxCollected,
        totalTaxRemitted: complianceData.totalTaxRemitted,
        taxLiability: complianceData.taxLiability,
        complianceMetrics: metrics,
        recommendations: await this.generateComplianceRecommendations(metrics),
        generatedAt: new Date()
      };

      await auditLogger.logTaxEvent('tax_compliance_report_generated', {
        reportId: report.id,
        period,
        provider,
        nexusStates: nexusStatuses.length,
        pendingFilings: pendingFilings.length,
        taxLiability: report.taxLiability
      });

      return report;

    } catch (error) {
      console.error('Tax compliance report generation failed:', error);
      throw new Error(`Tax compliance report generation failed: ${error.message}`);
    }
  }

  /**
   * Monitor tax rate changes
   */
  async monitorTaxRateChanges(): Promise<TaxRateChange[]> {
    const changes: TaxRateChange[] = [];

    try {
      for (const [providerName, provider] of this.providers) {
        const currentRates = await provider.getCurrentTaxRates();
        const cachedRates = this.getCachedTaxRates(providerName);

        for (const currentRate of currentRates) {
          const cachedRate = cachedRates.get(currentRate.jurisdiction);

          if (cachedRate && cachedRate.rate !== currentRate.rate) {
            const change: TaxRateChange = {
              jurisdiction: currentRate.jurisdiction,
              provider: providerName,
              oldRate: cachedRate.rate,
              newRate: currentRate.rate,
              effectiveDate: currentRate.effectiveDate,
              changeType: currentRate.rate > cachedRate.rate ? 'increase' : 'decrease',
              changePercentage: ((currentRate.rate - cachedRate.rate) / cachedRate.rate) * 100
            };

            changes.push(change);

            // Update cached rate
            this.taxRates.set(`${providerName}-${currentRate.jurisdiction}`, currentRate);

            // Send notification for significant changes
            if (Math.abs(change.changePercentage) > 5) {
              await this.sendTaxRateChangeNotification(change);
            }
          }
        }
      }

      if (changes.length > 0) {
        await auditLogger.logTaxEvent('tax_rate_changes_detected', {
          changeCount: changes.length,
          significantChanges: changes.filter(c => Math.abs(c.changePercentage) > 5).length
        });
      }

      return changes;

    } catch (error) {
      console.error('Tax rate monitoring failed:', error);
      return [];
    }
  }

  // Private methods

  /**
   * Initialize tax providers
   */
  private async initializeProviders(): Promise<void> {
    // Initialize TaxJar
    if (process.env.TAXJAR_API_KEY) {
      this.providers.set('taxjar', new TaxJarProvider({
        apiKey: process.env.TAXJAR_API_KEY,
        sandbox: process.env.NODE_ENV !== 'production'
      }));
    }

    // Initialize Avalara
    if (process.env.AVALARA_ACCOUNT_ID && process.env.AVALARA_LICENSE_KEY) {
      this.providers.set('avalara', new AvalaraProvider({
        accountId: process.env.AVALARA_ACCOUNT_ID,
        licenseKey: process.env.AVALARA_LICENSE_KEY,
        environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
      }));
    }

    if (this.providers.size === 0) {
      console.warn('No tax providers configured');
    }
  }

  /**
   * Load tax rates
   */
  private async loadTaxRates(): Promise<void> {
    // Implementation would load tax rates from database
  }

  /**
   * Load nexus statuses
   */
  private async loadNexusStatuses(): Promise<void> {
    // Implementation would load nexus statuses from database
  }

  /**
   * Start tax monitoring
   */
  private startTaxMonitoring(): void {
    // Monitor tax rate changes daily
    setInterval(async () => {
      await this.monitorTaxRateChanges().catch(console.error);
    }, 24 * 60 * 60 * 1000);

    // Monitor nexus status weekly
    setInterval(async () => {
      const states = ['CA', 'NY', 'TX', 'FL', 'IL']; // Key states to monitor
      await this.updateNexusStatus(states).catch(console.error);
    }, 7 * 24 * 60 * 60 * 1000);
  }

  /**
   * Start filing scheduler
   */
  private startFilingScheduler(): void {
    // Check for upcoming filing deadlines daily
    setInterval(async () => {
      await this.checkFilingDeadlines().catch(console.error);
    }, 24 * 60 * 60 * 1000);
  }

  /**
   * Determine tax jurisdiction
   */
  private async determineTaxJurisdiction(transaction: TaxableTransaction): Promise<TaxJurisdiction> {
    return {
      country: transaction.shippingAddress.country,
      state: transaction.shippingAddress.state,
      city: transaction.shippingAddress.city,
      zipCode: transaction.shippingAddress.zipCode,
      isOriginBased: this.isOriginBasedState(transaction.shippingAddress.state)
    };
  }

  /**
   * Check tax exemption
   */
  private async checkTaxExemption(
    customer: any,
    items: any[]
  ): Promise<TaxExemption | null> {
    // Implementation would check for valid exemption certificates
    return null;
  }

  /**
   * Calculate tax with provider
   */
  private async calculateTaxWithProvider(
    transaction: TaxableTransaction,
    jurisdiction: TaxJurisdiction,
    exemption: TaxExemption | null
  ): Promise<TaxCalculation> {
    const provider = this.providers.get('taxjar'); // Default to TaxJar
    if (!provider) {
      throw new Error('No tax provider available');
    }

    return await provider.calculateTax(transaction, jurisdiction, exemption);
  }

  /**
   * Submit tax filing
   */
  private async submitTaxFiling(filingId: string): Promise<void> {
    const filing = this.taxFilings.get(filingId);
    if (!filing) {
      throw new Error(`Filing not found: ${filingId}`);
    }

    const provider = this.providers.get(filing.provider);
    if (!provider) {
      throw new Error(`Provider not found: ${filing.provider}`);
    }

    await provider.submitFiling(filing.filingId);

    filing.status = 'submitted';
    filing.submittedAt = new Date();

    await auditLogger.logTaxEvent('tax_filing_submitted', {
      filingId,
      jurisdiction: filing.jurisdiction,
      provider: filing.provider
    });
  }

  /**
   * Send tax rate change notification
   */
  private async sendTaxRateChangeNotification(change: TaxRateChange): Promise<void> {
    await notificationService.sendOperationsAlert({
      system: 'Tax Automation',
      message: `Tax rate ${change.changeType} in ${change.jurisdiction}: ${change.oldRate}% → ${change.newRate}% (${change.changePercentage.toFixed(1)}%)`,
      severity: 'medium',
      data: {
        jurisdiction: change.jurisdiction,
        provider: change.provider,
        change: change
      }
    });
  }

  // Helper methods
  private generateExemptionId(): string {
    return `exempt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `tax_report_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isOriginBasedState(state: string): boolean {
    const originBasedStates = ['AZ', 'CA', 'IL', 'MO', 'NM', 'OH', 'PA', 'TN', 'TX', 'UT', 'VA'];
    return originBasedStates.includes(state);
  }

  private getCachedTaxRates(provider: string): Map<string, TaxRate> {
    const cached = new Map<string, TaxRate>();
    for (const [key, rate] of this.taxRates) {
      if (key.startsWith(`${provider}-`)) {
        const jurisdiction = key.substring(provider.length + 1);
        cached.set(jurisdiction, rate);
      }
    }
    return cached;
  }

  private async handleNewNexus(newNexusStates: string[]): Promise<void> {
    await notificationService.sendOperationsAlert({
      system: 'Tax Automation',
      message: `New tax nexus established in: ${newNexusStates.join(', ')}`,
      severity: 'high',
      data: { newNexusStates }
    });
  }

  private async checkFilingDeadlines(): Promise<void> {
    // Implementation would check for upcoming filing deadlines and send alerts
  }

  private async validateTaxCalculation(calculation: TaxCalculation, transaction: TaxableTransaction): Promise<void> {
    // Implementation would validate tax calculation
  }

  private async cacheTaxCalculation(calculation: TaxCalculation): Promise<void> {
    // Implementation would cache calculation
  }

  private async getTaxableTransactions(period: any): Promise<TaxableTransaction[]> {
    // Implementation would get taxable transactions
    return [];
  }

  private groupTransactionsByJurisdiction(transactions: TaxableTransaction[]): Record<string, TaxableTransaction[]> {
    // Implementation would group transactions by jurisdiction
    return {};
  }

  private async generateFilingData(
    transactions: TaxableTransaction[],
    jurisdiction: string,
    period: any
  ): Promise<any> {
    // Implementation would generate filing data
    return {
      totalSales: 10000,
      totalTax: 800,
      taxableSales: 10000,
      exemptSales: 0
    };
  }

  private calculateDueDate(period: any, jurisdiction: string): Date {
    // Implementation would calculate filing due date based on jurisdiction rules
    return new Date();
  }

  private async validateExemptionCertificate(data: ExemptionCertificateData): Promise<ValidationResult> {
    // Implementation would validate exemption certificate
    return {
      isValid: true,
      errors: []
    };
  }

  private async calculateComplianceMetrics(period: any, nexusStatuses: NexusStatus[]): Promise<any> {
    // Implementation would calculate compliance metrics
    return {
      onTimeFilingRate: 95,
      accuracyRate: 98.5,
      averageDaysToRemit: 7
    };
  }

  private async generateComplianceRecommendations(metrics: any): Promise<string[]> {
    // Implementation would generate compliance recommendations
    return [];
  }
}

// Tax Provider implementations
class TaxJarProvider implements TaxProvider {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  async calculateTax(
    transaction: TaxableTransaction,
    jurisdiction: TaxJurisdiction,
    exemption: TaxExemption | null
  ): Promise<TaxCalculation> {
    // Implementation would call TaxJar API
    return {
      id: `taxjar_${Date.now()}`,
      transactionId: transaction.id,
      provider: 'taxjar',
      jurisdiction: jurisdiction.state,
      totalTax: transaction.amount * 0.08, // Mock 8% tax
      taxBreakdown: [
        {
          type: 'state',
          rate: 0.06,
          amount: transaction.amount * 0.06
        },
        {
          type: 'local',
          rate: 0.02,
          amount: transaction.amount * 0.02
        }
      ],
      taxableAmount: transaction.amount,
      exemptAmount: 0,
      calculatedAt: new Date()
    };
  }

  async checkNexusStatus(state: string): Promise<any> {
    // Implementation would call TaxJar Nexus API
    return {
      hasNexus: Math.random() > 0.7,
      nexusType: 'economic',
      establishedDate: new Date('2023-01-01'),
      lastSaleDate: new Date(),
      totalSales: Math.floor(Math.random() * 1000000),
      threshold: 100000,
      filingRequirements: ['monthly']
    };
  }

  async createFiling(filingData: any): Promise<any> {
    // Implementation would create filing with TaxJar
    return {
      id: `filing_${Date.now()}`,
      filingId: `taxjar_filing_${Date.now()}`
    };
  }

  async getCurrentTaxRates(): Promise<TaxRate[]> {
    // Implementation would get current rates from TaxJar
    return [
      {
        jurisdiction: 'CA',
        rate: 0.0825,
        effectiveDate: new Date(),
        type: 'state'
      }
    ];
  }

  async getComplianceData(period: any): Promise<any> {
    return {
      totalSales: 500000,
      totalTaxCollected: 40000,
      totalTaxRemitted: 38000,
      taxLiability: 2000
    };
  }

  async submitFiling(filingId: string): Promise<void> {
    // Implementation would submit filing to TaxJar
  }
}

class AvalaraProvider implements TaxProvider {
  private config: any;

  constructor(config: any) {
    this.config = config;
  }

  // Implementation would mirror TaxJarProvider but use Avalara APIs
  async calculateTax(
    transaction: TaxableTransaction,
    jurisdiction: TaxJurisdiction,
    exemption: TaxExemption | null
  ): Promise<TaxCalculation> {
    // Implementation would call Avalara API
    return {} as TaxCalculation;
  }

  async checkNexusStatus(state: string): Promise<any> {
    return {};
  }

  async createFiling(filingData: any): Promise<any> {
    return {};
  }

  async getCurrentTaxRates(): Promise<TaxRate[]> {
    return [];
  }

  async getComplianceData(period: any): Promise<any> {
    return {};
  }

  async submitFiling(filingId: string): Promise<void> {
    // Implementation would submit filing to Avalara
  }
}

// Type definitions
interface ExemptionCertificateData {
  customerId: string;
  certificateType: string;
  certificateNumber: string;
  issuingState: string;
  expirationDate: Date;
  jurisdictions: string[];
  documents: string[];
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface TaxableTransaction {
  id: string;
  amount: number;
  currency: string;
  customer: {
    id: string;
    taxId?: string;
    exemptionId?: string;
  };
  shippingAddress: {
    country: string;
    state: string;
    city: string;
    zipCode: string;
  };
  billingAddress: {
    country: string;
    state: string;
    city: string;
    zipCode: string;
  };
  items: Array<{
    id: string;
    amount: number;
    quantity: number;
    taxCategory: string;
  }>;
}

interface NexusStatusUpdate {
  provider: string;
  statesChecked: string[];
  nexusStatuses: NexusStatus[];
  newNexusStates: string[];
  updateDate: Date;
}

interface TaxRateChange {
  jurisdiction: string;
  provider: string;
  oldRate: number;
  newRate: number;
  effectiveDate: Date;
  changeType: 'increase' | 'decrease';
  changePercentage: number;
}

export const taxAutomationService = new TaxAutomationService();