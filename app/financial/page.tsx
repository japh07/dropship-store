'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/Badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { Progress } from '@/components/ui/Progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  FileText,
  AlertTriangle,
  Calendar,
  Globe,
  Receipt,
  ChevronUp,
  ChevronDown,
  Download,
  RefreshCw
} from 'lucide-react';

interface FinancialOverview {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  revenueGrowth: number;
  activeVendors: number;
  pendingPayouts: number;
  currencyExposure: number;
  taxCompliance: number;
}

interface CurrencyData {
  code: string;
  name: string;
  rate: number;
  change: number;
  exposure: number;
}

interface VendorPayout {
  id: string;
  vendorName: string;
  amount: number;
  currency: string;
  status: string;
  scheduledFor: string;
  method: string;
}

interface TaxAlert {
  id: string;
  type: string;
  jurisdiction: string;
  message: string;
  severity: string;
  dueDate?: string;
}

export default function FinancialDashboard() {
  const [overview, setOverview] = useState<FinancialOverview | null>(null);
  const [currencies, setCurrencies] = useState<CurrencyData[]>([]);
  const [payouts, setPayouts] = useState<VendorPayout[]>([]);
  const [taxAlerts, setTaxAlerts] = useState<TaxAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('month');

  useEffect(() => {
    loadFinancialData();
    const interval = setInterval(loadFinancialData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeframe]);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const [overviewData, currenciesData, payoutsData, taxAlertsData] = await Promise.all([
        fetchFinancialOverview(),
        fetchCurrencyData(),
        fetchPayouts(),
        fetchTaxAlerts()
      ]);

      setOverview(overviewData);
      setCurrencies(currenciesData);
      setPayouts(payoutsData);
      setTaxAlerts(taxAlertsData);
    } catch (error) {
      console.error('Failed to load financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFinancialOverview = async (): Promise<FinancialOverview> => {
    // Mock data - would fetch from API
    return {
      totalRevenue: 524800,
      totalExpenses: 398600,
      netProfit: 126200,
      profitMargin: 24.1,
      revenueGrowth: 15.2,
      activeVendors: 48,
      pendingPayouts: 12,
      currencyExposure: 85000,
      taxCompliance: 96.5
    };
  };

  const fetchCurrencyData = async (): Promise<CurrencyData[]> => {
    // Mock data - would fetch from currency service
    return [
      { code: 'EUR', name: 'Euro', rate: 1.18, change: 0.5, exposure: 25000 },
      { code: 'GBP', name: 'British Pound', rate: 1.32, change: -0.3, exposure: 18000 },
      { code: 'JPY', name: 'Japanese Yen', rate: 0.0091, change: 0.8, exposure: 15000 },
      { code: 'CAD', name: 'Canadian Dollar', rate: 0.79, change: -0.2, exposure: 12000 },
      { code: 'AUD', name: 'Australian Dollar', rate: 0.73, change: 0.4, exposure: 15000 }
    ];
  };

  const fetchPayouts = async (): Promise<VendorPayout[]> => {
    // Mock data - would fetch from payout service
    return [
      {
        id: '1',
        vendorName: 'Tech Supplies Inc',
        amount: 5250,
        currency: 'USD',
        status: 'pending',
        scheduledFor: '2024-01-15',
        method: 'stripe'
      },
      {
        id: '2',
        vendorName: 'Global Electronics',
        amount: 3800,
        currency: 'EUR',
        status: 'processing',
        scheduledFor: '2024-01-14',
        method: 'bank_transfer'
      },
      {
        id: '3',
        vendorName: 'Pacific Manufacturing',
        amount: 2100,
        currency: 'USD',
        status: 'completed',
        scheduledFor: '2024-01-13',
        method: 'stripe'
      }
    ];
  };

  const fetchTaxAlerts = async (): Promise<TaxAlert[]> => {
    // Mock data - would fetch from tax service
    return [
      {
        id: '1',
        type: 'filing_due',
        jurisdiction: 'California',
        message: 'Sales tax filing due in 5 days',
        severity: 'high',
        dueDate: '2024-01-20'
      },
      {
        id: '2',
        type: 'nexus_change',
        jurisdiction: 'New York',
        message: 'Economic nexus threshold approaching',
        severity: 'medium'
      }
    ];
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getChangeIcon = (change: number) => {
    return change >= 0 ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />;
  };

  const getChangeColor = (change: number) => {
    return change >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Dashboard</h1>
          <p className="text-gray-600">Monitor revenue, expenses, and financial performance</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="quarter">Last Quarter</option>
            <option value="year">Last Year</option>
          </select>
          <Button
            variant="outline"
            onClick={loadFinancialData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Financial Overview Cards */}
      {overview && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.totalRevenue)}</div>
              <div className={`flex items-center text-xs ${getChangeColor(overview.revenueGrowth)}`}>
                {getChangeIcon(overview.revenueGrowth)}
                <span className="ml-1">{Math.abs(overview.revenueGrowth)}%</span>
                <span className="ml-1 text-gray-500">vs last period</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(overview.netProfit)}</div>
              <div className="flex items-center text-xs text-gray-500">
                <span>{overview.profitMargin}% margin</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Vendors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.activeVendors}</div>
              <div className="flex items-center text-xs text-gray-500">
                <span>{overview.pendingPayouts} pending payouts</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tax Compliance</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{overview.taxCompliance}%</div>
              <div className="flex items-center text-xs text-gray-500">
                <span>{formatCurrency(overview.currencyExposure)} FX exposure</span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tax Alerts */}
      {taxAlerts.length > 0 && (
        <div className="space-y-2">
          {taxAlerts.map((alert) => (
            <Alert key={alert.id}>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="flex items-center justify-between">
                <span>
                  <strong>{alert.jurisdiction}:</strong> {alert.message}
                  {alert.dueDate && (
                    <span className="ml-2 text-gray-600">
                      Due: {new Date(alert.dueDate).toLocaleDateString()}
                    </span>
                  )}
                </span>
                <Badge variant={getSeverityColor(alert.severity)} className="ml-2">
                  {alert.severity}
                </Badge>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="currency">Multi-Currency</TabsTrigger>
          <TabsTrigger value="payouts">Vendor Payouts</TabsTrigger>
          <TabsTrigger value="tax">Tax Management</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
        </TabsList>

        {/* Currency Tab */}
        <TabsContent value="currency" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Globe className="h-5 w-5 mr-2" />
                Currency Exchange Rates & Exposure
              </CardTitle>
              <CardDescription>
                Monitor foreign exchange rates and currency exposure
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currencies.map((currency) => (
                  <div key={currency.code} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-medium">{currency.code}</div>
                        <div className="text-sm text-gray-600">{currency.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{currency.rate.toFixed(4)}</div>
                        <div className={`flex items-center text-sm ${getChangeColor(currency.change)}`}>
                          {getChangeIcon(currency.change)}
                          <span className="ml-1">{Math.abs(currency.change)}%</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(currency.exposure, currency.code)}</div>
                      <div className="text-sm text-gray-600">Exposure</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payouts Tab */}
        <TabsContent value="payouts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Vendor Payouts
                </div>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </CardTitle>
              <CardDescription>
                Manage and monitor vendor payouts and revenue splits
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {payouts.map((payout) => (
                  <div key={payout.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div>
                        <div className="font-medium">{payout.vendorName}</div>
                        <div className="text-sm text-gray-600">
                          {payout.method} • Scheduled: {new Date(payout.scheduledFor).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(payout.amount, payout.currency)}</div>
                        <Badge className={getStatusColor(payout.status)}>
                          {payout.status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tax Management Tab */}
        <TabsContent value="tax" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Receipt className="h-5 w-5 mr-2" />
                  Tax Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Overall Compliance</span>
                    <span className="text-sm">{overview?.taxCompliance || 0}%</span>
                  </div>
                  <Progress value={overview?.taxCompliance || 0} className="h-2" />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Sales Tax Collected</span>
                    <span className="text-sm font-medium">$45,230</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Tax Remitted</span>
                    <span className="text-sm font-medium">$42,180</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                    <span className="text-sm font-medium">Pending Filings</span>
                    <span className="text-sm font-medium">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="h-5 w-5 mr-2" />
                  Upcoming Deadlines
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border-l-4 border-red-500 bg-red-50 rounded">
                    <div>
                      <div className="font-medium">California Sales Tax</div>
                      <div className="text-sm text-gray-600">Monthly filing</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-red-600">Jan 20, 2024</div>
                      <div className="text-xs text-gray-600">5 days</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 border-l-4 border-yellow-500 bg-yellow-50 rounded">
                    <div>
                      <div className="font-medium">New York Sales Tax</div>
                      <div className="text-sm text-gray-600">Quarterly filing</div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium text-yellow-600">Jan 31, 2024</div>
                      <div className="text-xs text-gray-600">16 days</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>P&L Statement</CardTitle>
                <CardDescription>
                  Generate profit and loss statement
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate P&L</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Balance Sheet</CardTitle>
                <CardDescription>
                  Generate balance sheet report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate Balance Sheet</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Tax Report</CardTitle>
                <CardDescription>
                  Generate tax compliance report
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate Tax Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Vendor Analytics</CardTitle>
                <CardDescription>
                  Vendor performance and revenue analysis
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">View Analytics</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Currency Report</CardTitle>
                <CardDescription>
                  Foreign exchange gains/losses
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">Generate FX Report</Button>
              </CardContent>
            </Card>

            <Card className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle>Expense Forecast</CardTitle>
                <CardDescription>
                  Predict future expenses and trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full">View Forecast</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Product Sales</span>
                    <span className="text-sm font-medium">{formatCurrency(425000)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Services</span>
                    <span className="text-sm font-medium">{formatCurrency(65000)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Subscriptions</span>
                    <span className="text-sm font-medium">{formatCurrency(34800)}</span>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="font-medium">Total Revenue</span>
                    <span className="font-bold">{formatCurrency(overview?.totalRevenue || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Expense Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Cost of Goods</span>
                    <span className="text-sm font-medium">{formatCurrency(285000)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Operations</span>
                    <span className="text-sm font-medium">{formatCurrency(65000)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Marketing</span>
                    <span className="text-sm font-medium">{formatCurrency(28600)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Other Expenses</span>
                    <span className="text-sm font-medium">{formatCurrency(20000)}</span>
                  </div>
                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="font-medium">Total Expenses</span>
                    <span className="font-bold">{formatCurrency(overview?.totalExpenses || 0)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}