import { auditLogger } from './audit-logger';
import { cacheService } from './cache-service';
import type { Currency, ExchangeRate, CurrencyConversion, MultiCurrencyTransaction } from '@/types';

export class CurrencyService {
  private supportedCurrencies = new Map<string, Currency>();
  private exchangeRates = new Map<string, ExchangeRate>();
  private fxProviders = new Map<string, FXProvider>();

  /**
   * Initialize multi-currency system
   */
  async initialize(): Promise<void> {
    await this.loadSupportedCurrencies();
    await this.initializeFXProviders();
    await this.startFXRateUpdates();
    await this.loadHistoricalRates();

    console.log('Multi-currency system initialized');
  }

  /**
   * Convert amount between currencies
   */
  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<CurrencyConversion> {
    try {
      // Validate currencies
      await this.validateCurrencies([fromCurrency, toCurrency]);

      // Get exchange rate
      const rate = await this.getExchangeRate(fromCurrency, toCurrency, date);
      if (!rate) {
        throw new Error(`No exchange rate available for ${fromCurrency} to ${toCurrency}`);
      }

      // Calculate conversion
      const convertedAmount = amount * rate.rate;
      const fees = await this.calculateConversionFees(amount, fromCurrency, toCurrency);
      const netAmount = convertedAmount - fees;

      const conversion: CurrencyConversion = {
        id: this.generateConversionId(),
        fromAmount: amount,
        fromCurrency,
        toAmount: netAmount,
        toCurrency,
        exchangeRate: rate.rate,
        fees,
        conversionDate: new Date(),
        rateDate: rate.date,
        provider: rate.provider,
        metadata: {
          grossAmount: convertedAmount,
          feeBreakdown: await this.getFeeBreakdown(fees, fromCurrency, toCurrency)
        }
      };

      // Log conversion
      await auditLogger.logCurrencyEvent('currency_converted', {
        conversionId: conversion.id,
        fromAmount: amount,
        fromCurrency,
        toAmount: netAmount,
        toCurrency,
        exchangeRate: rate.rate,
        fees
      });

      return conversion;

    } catch (error) {
      console.error('Currency conversion failed:', error);
      throw new Error(`Currency conversion failed: ${error.message}`);
    }
  }

  /**
   * Process multi-currency transaction
   */
  async processTransaction(transaction: MultiCurrencyTransaction): Promise<ProcessedTransaction> {
    try {
      const processedTransaction: ProcessedTransaction = {
        id: transaction.id,
        originalAmount: transaction.amount,
        originalCurrency: transaction.currency,
        processedAt: new Date(),
        conversions: [],
        fees: 0,
        netAmount: 0,
        settlementCurrency: transaction.settlementCurrency || 'USD',
        status: 'processing'
      };

      let currentAmount = transaction.amount;
      let currentCurrency = transaction.currency;

      // Convert to settlement currency if needed
      if (currentCurrency !== processedTransaction.settlementCurrency) {
        const conversion = await this.convertAmount(
          currentAmount,
          currentCurrency,
          processedTransaction.settlementCurrency
        );

        processedTransaction.conversions.push(conversion);
        currentAmount = conversion.toAmount;
        currentCurrency = processedTransaction.settlementCurrency;
        processedTransaction.fees += conversion.fees;
      }

      // Process revenue splits if applicable
      if (transaction.revenueSplits) {
        processedTransaction.splits = await this.processRevenueSplits(
          currentAmount,
          currentCurrency,
          transaction.revenueSplits
        );
      }

      processedTransaction.netAmount = currentAmount;
      processedTransaction.status = 'completed';

      // Update transaction in database
      await this.updateTransaction(processedTransaction);

      await auditLogger.logCurrencyEvent('transaction_processed', {
        transactionId: transaction.id,
        originalAmount: transaction.amount,
        originalCurrency: transaction.currency,
        settlementAmount: processedTransaction.netAmount,
        settlementCurrency: processedTransaction.settlementCurrency,
        totalFees: processedTransaction.fees
      });

      return processedTransaction;

    } catch (error) {
      console.error('Transaction processing failed:', error);
      throw new Error(`Transaction processing failed: ${error.message}`);
    }
  }

  /**
   * Get real-time exchange rate
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    date?: Date
  ): Promise<ExchangeRate | null> {
    const cacheKey = this.generateRateKey(fromCurrency, toCurrency, date);

    // Check cache first
    const cached = await cacheService.get(cacheKey);
    if (cached) {
      return cached as ExchangeRate;
    }

    // If historical rate requested, check database
    if (date && date < new Date()) {
      const historicalRate = await this.getHistoricalRate(fromCurrency, toCurrency, date);
      if (historicalRate) {
        await cacheService.set(cacheKey, historicalRate, 24 * 60 * 60); // Cache for 24 hours
        return historicalRate;
      }
    }

    // Get live rate from FX providers
    const rate = await this.fetchLiveRate(fromCurrency, toCurrency);
    if (rate) {
      await cacheService.set(cacheKey, rate, 5 * 60); // Cache live rates for 5 minutes
      await this.saveExchangeRate(rate);
    }

    return rate;
  }

  /**
   * Get currency information
   */
  async getCurrency(currencyCode: string): Promise<Currency | null> {
    return this.supportedCurrencies.get(currencyCode) || null;
  }

  /**
   * Get all supported currencies
   */
  async getSupportedCurrencies(): Promise<Currency[]> {
    return Array.from(this.supportedCurrencies.values());
  }

  /**
   * Update currency rates manually
   */
  async updateExchangeRates(): Promise<void> {
    try {
      const currencies = Array.from(this.supportedCurrencies.keys());
      const baseCurrency = 'USD'; // Default base currency

      for (const currency of currencies) {
        if (currency === baseCurrency) continue;

        try {
          const rate = await this.fetchLiveRate(baseCurrency, currency);
          if (rate) {
            await this.saveExchangeRate(rate);
            console.log(`Updated rate ${baseCurrency}/${currency}: ${rate.rate}`);
          }
        } catch (error) {
          console.error(`Failed to update rate for ${currency}:`, error);
        }
      }

      await auditLogger.logCurrencyEvent('exchange_rates_updated', {
        currencyCount: currencies.length - 1,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('FX rate update failed:', error);
      throw new Error(`FX rate update failed: ${error.message}`);
    }
  }

  /**
   * Get historical exchange rates for reporting
   */
  async getHistoricalRates(
    fromCurrency: string,
    toCurrency: string,
    startDate: Date,
    endDate: Date
  ): Promise<ExchangeRate[]> {
    // Implementation would fetch from database
    return [];
  }

  /**
   * Calculate currency volatility for risk management
   */
  async calculateCurrencyVolatility(
    currencyCode: string,
    days: number = 30
  ): Promise<CurrencyVolatility> {
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    const rates = await this.getHistoricalRates('USD', currencyCode, startDate, endDate);

    if (rates.length < 2) {
      return {
        currency: currencyCode,
        period: days,
        volatility: 0,
        averageRate: 0,
        highRate: 0,
        lowRate: Infinity,
        standardDeviation: 0
      };
    }

    const rateValues = rates.map(r => r.rate);
    const averageRate = rateValues.reduce((sum, rate) => sum + rate, 0) / rateValues.length;
    const highRate = Math.max(...rateValues);
    const lowRate = Math.min(...rateValues);

    // Calculate standard deviation
    const variance = rateValues.reduce((sum, rate) => sum + Math.pow(rate - averageRate, 2), 0) / rateValues.length;
    const standardDeviation = Math.sqrt(variance);

    // Calculate volatility as coefficient of variation
    const volatility = (standardDeviation / averageRate) * 100;

    return {
      currency: currencyCode,
      period: days,
      volatility,
      averageRate,
      highRate,
      lowRate,
      standardDeviation
    };
  }

  /**
   * Get currency risk assessment
   */
  async getCurrencyRiskAssessment(): Promise<CurrencyRiskAssessment> {
    const currencies = Array.from(this.supportedCurrencies.keys()).filter(c => c !== 'USD');
    const riskFactors: CurrencyRiskFactor[] = [];

    for (const currency of currencies) {
      const volatility = await this.calculateCurrencyVolatility(currency);
      const riskFactor = this.calculateRiskFactor(volatility);

      riskFactors.push({
        currency,
        volatility: volatility.volatility,
        riskFactor,
        riskLevel: this.getRiskLevel(riskFactor),
        recommendation: this.getRiskRecommendation(riskFactor)
      });
    }

    return {
      assessmentDate: new Date(),
      baseCurrency: 'USD',
      overallRisk: this.calculateOverallRisk(riskFactors),
      currencyRisks: riskFactors,
      recommendations: this.generateRiskRecommendations(riskFactors)
    };
  }

  // Private methods

  /**
   * Load supported currencies
   */
  private async loadSupportedCurrencies(): Promise<void> {
    const defaultCurrencies: Currency[] = [
      { code: 'USD', name: 'US Dollar', symbol: '$', decimalPlaces: 2, active: true },
      { code: 'EUR', name: 'Euro', symbol: '€', decimalPlaces: 2, active: true },
      { code: 'GBP', name: 'British Pound', symbol: '£', decimalPlaces: 2, active: true },
      { code: 'JPY', name: 'Japanese Yen', symbol: '¥', decimalPlaces: 0, active: true },
      { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', decimalPlaces: 2, active: true },
      { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', decimalPlaces: 2, active: true },
      { code: 'CHF', name: 'Swiss Franc', symbol: 'Fr', decimalPlaces: 2, active: true },
      { code: 'CNY', name: 'Chinese Yuan', symbol: '¥', decimalPlaces: 2, active: true },
      { code: 'INR', name: 'Indian Rupee', symbol: '₹', decimalPlaces: 2, active: true },
      { code: 'MXN', name: 'Mexican Peso', symbol: '$', decimalPlaces: 2, active: true }
    ];

    for (const currency of defaultCurrencies) {
      this.supportedCurrencies.set(currency.code, currency);
    }
  }

  /**
   * Initialize FX rate providers
   */
  private async initializeFXProviders(): Promise<void> {
    // Initialize multiple FX providers for redundancy
    this.fxProviders.set('openexchangerates', new OpenExchangeRatesProvider());
    this.fxProviders.set('exchangerateapi', new ExchangeRateAPIProvider());
    this.fxProviders.set('fixer', new FixerProvider());
  }

  /**
   * Start automatic FX rate updates
   */
  private startFXRateUpdates(): void {
    // Update rates every hour
    setInterval(async () => {
      try {
        await this.updateExchangeRates();
      } catch (error) {
        console.error('Scheduled FX rate update failed:', error);
      }
    }, 60 * 60 * 1000); // Every hour

    // Update critical rates every 15 minutes
    setInterval(async () => {
      try {
        await this.updateCriticalRates();
      } catch (error) {
        console.error('Critical FX rate update failed:', error);
      }
    }, 15 * 60 * 1000); // Every 15 minutes
  }

  /**
   * Update critical currency rates more frequently
   */
  private async updateCriticalRates(): Promise<void> {
    const criticalCurrencies = ['EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
    const baseCurrency = 'USD';

    for (const currency of criticalCurrencies) {
      try {
        const rate = await this.fetchLiveRate(baseCurrency, currency);
        if (rate) {
          await this.saveExchangeRate(rate);
          const cacheKey = this.generateRateKey(baseCurrency, currency);
          await cacheService.set(cacheKey, rate, 5 * 60); // Cache for 5 minutes
        }
      } catch (error) {
        console.error(`Failed to update critical rate for ${currency}:`, error);
      }
    }
  }

  /**
   * Fetch live rate from FX providers
   */
  private async fetchLiveRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    for (const [providerName, provider] of this.fxProviders) {
      try {
        const rate = await provider.getRate(fromCurrency, toCurrency);
        if (rate) {
          return {
            fromCurrency,
            toCurrency,
            rate: rate.rate,
            date: new Date(),
            provider: providerName
          };
        }
      } catch (error) {
        console.error(`Provider ${providerName} failed:`, error);
        continue;
      }
    }
    return null;
  }

  /**
   * Calculate conversion fees
   */
  private async calculateConversionFees(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<number> {
    // Base fee calculation
    const baseFee = amount * 0.0059; // 0.59% base fee
    const fixedFee = 0.30; // $0.30 fixed fee in USD

    // Convert fixed fee to fromCurrency
    const fixedFeeInCurrency = fromCurrency === 'USD'
      ? fixedFee
      : await this.convertAmount(fixedFee, 'USD', fromCurrency).then(c => c.toAmount);

    return baseFee + fixedFeeInCurrency;
  }

  /**
   * Get fee breakdown
   */
  private async getFeeBreakdown(
    totalFees: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<FeeBreakdown> {
    return {
      processingFee: totalFees * 0.7,
      conversionFee: totalFees * 0.2,
      networkFee: totalFees * 0.1,
      currency: fromCurrency
    };
  }

  /**
   * Process revenue splits
   */
  private async processRevenueSplits(
    amount: number,
    currency: string,
    splits: RevenueSplit[]
  ): Promise<ProcessedSplit[]> {
    const processedSplits: ProcessedSplit[] = [];
    let remainingAmount = amount;

    for (const split of splits.slice(0, -1)) {
      const splitAmount = amount * (split.percentage / 100);
      remainingAmount -= splitAmount;

      processedSplits.push({
        recipientId: split.recipientId,
        recipientName: split.recipientName,
        amount: splitAmount,
        currency,
        percentage: split.percentage,
        type: split.type
      });
    }

    // Add final split with remaining amount
    const lastSplit = splits[splits.length - 1];
    processedSplits.push({
      recipientId: lastSplit.recipientId,
      recipientName: lastSplit.recipientName,
      amount: remainingAmount,
      currency,
      percentage: lastSplit.percentage,
      type: lastSplit.type
    });

    return processedSplits;
  }

  /**
   * Load historical rates
   */
  private async loadHistoricalRates(): Promise<void> {
    // Implementation would load recent historical rates from database
  }

  /**
   * Get historical rate
   */
  private async getHistoricalRate(
    fromCurrency: string,
    toCurrency: string,
    date: Date
  ): Promise<ExchangeRate | null> {
    // Implementation would fetch from database
    return null;
  }

  /**
   * Save exchange rate to database
   */
  private async saveExchangeRate(rate: ExchangeRate): Promise<void> {
    // Implementation would save to database
    console.log(`Saving rate ${rate.fromCurrency}/${rate.toCurrency}: ${rate.rate}`);
  }

  /**
   * Update transaction in database
   */
  private async updateTransaction(transaction: ProcessedTransaction): Promise<void> {
    // Implementation would update transaction in database
  }

  /**
   * Validate currencies
   */
  private async validateCurrencies(currencies: string[]): Promise<void> {
    for (const currency of currencies) {
      if (!this.supportedCurrencies.has(currency)) {
        throw new Error(`Unsupported currency: ${currency}`);
      }
    }
  }

  // Helper methods
  private generateConversionId(): string {
    return `conv-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateRateKey(fromCurrency: string, toCurrency: string, date?: Date): string {
    const dateStr = date ? date.toISOString().split('T')[0] : 'live';
    return `fx:${fromCurrency}:${toCurrency}:${dateStr}`;
  }

  private calculateRiskFactor(volatility: CurrencyVolatility): number {
    // Risk factor based on volatility percentage
    if (volatility.volatility < 1) return 1; // Low risk
    if (volatility.volatility < 3) return 2; // Medium risk
    if (volatility.volatility < 5) return 3; // High risk
    return 4; // Very high risk
  }

  private getRiskLevel(riskFactor: number): 'low' | 'medium' | 'high' | 'very_high' {
    switch (riskFactor) {
      case 1: return 'low';
      case 2: return 'medium';
      case 3: return 'high';
      case 4: return 'very_high';
      default: return 'medium';
    }
  }

  private getRiskRecommendation(riskFactor: number): string {
    switch (riskFactor) {
      case 1: return 'Monitor regularly';
      case 2: return 'Consider hedging for large amounts';
      case 3: return 'Implement hedging strategy';
      case 4: return 'Avoid or strong hedging required';
      default: return 'Monitor';
    }
  }

  private calculateOverallRisk(riskFactors: CurrencyRiskFactor[]): number {
    if (riskFactors.length === 0) return 0;
    return riskFactors.reduce((sum, factor) => sum + factor.riskFactor, 0) / riskFactors.length;
  }

  private generateRiskRecommendations(riskFactors: CurrencyRiskFactor[]): string[] {
    const recommendations: string[] = [];
    const highRiskCurrencies = riskFactors.filter(f => f.riskFactor >= 3);

    if (highRiskCurrencies.length > 0) {
      recommendations.push(`High risk detected for ${highRiskCurrencies.map(c => c.currency).join(', ')}. Consider implementing hedging strategies.`);
    }

    if (riskFactors.length > 5) {
      recommendations.push('Diversify currency holdings to reduce concentration risk.');
    }

    recommendations.push('Review exchange rate exposure monthly and adjust hedging as needed.');

    return recommendations;
  }
}

// FX Provider implementations
interface FXProvider {
  getRate(fromCurrency: string, toCurrency: string): Promise<{ rate: number } | null>;
}

class OpenExchangeRatesProvider implements FXProvider {
  async getRate(fromCurrency: string, toCurrency: string): Promise<{ rate: number } | null> {
    // Implementation would call Open Exchange Rates API
    const mockRate = 1.18; // Mock rate for EUR/USD
    return { rate: mockRate };
  }
}

class ExchangeRateAPIProvider implements FXProvider {
  async getRate(fromCurrency: string, toCurrency: string): Promise<{ rate: number } | null> {
    // Implementation would call ExchangeRate-API
    return null; // Fallback provider
  }
}

class FixerProvider implements FXProvider {
  async getRate(fromCurrency: string, toCurrency: string): Promise<{ rate: number } | null> {
    // Implementation would call Fixer API
    return null; // Fallback provider
  }
}

// Type definitions
interface CurrencyVolatility {
  currency: string;
  period: number;
  volatility: number;
  averageRate: number;
  highRate: number;
  lowRate: number;
  standardDeviation: number;
}

interface CurrencyRiskFactor {
  currency: string;
  volatility: number;
  riskFactor: number;
  riskLevel: 'low' | 'medium' | 'high' | 'very_high';
  recommendation: string;
}

interface CurrencyRiskAssessment {
  assessmentDate: Date;
  baseCurrency: string;
  overallRisk: number;
  currencyRisks: CurrencyRiskFactor[];
  recommendations: string[];
}

interface RevenueSplit {
  recipientId: string;
  recipientName: string;
  percentage: number;
  type: 'vendor' | 'platform' | 'affiliate';
}

interface ProcessedSplit {
  recipientId: string;
  recipientName: string;
  amount: number;
  currency: string;
  percentage: number;
  type: string;
}

interface ProcessedTransaction {
  id: string;
  originalAmount: number;
  originalCurrency: string;
  processedAt: Date;
  conversions: CurrencyConversion[];
  splits?: ProcessedSplit[];
  fees: number;
  netAmount: number;
  settlementCurrency: string;
  status: 'processing' | 'completed' | 'failed';
}

interface FeeBreakdown {
  processingFee: number;
  conversionFee: number;
  networkFee: number;
  currency: string;
}

export const currencyService = new CurrencyService();