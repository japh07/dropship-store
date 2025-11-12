import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { financialAnalyticsService } from '@/lib/financial-analytics';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { reportType, period, includeForecast, currency } = await request.json();

    const startDate = period?.startDate ? new Date(period.startDate) : new Date(new Date().setMonth(new Date().getMonth() - 1));
    const endDate = period?.endDate ? new Date(period.endDate) : new Date();

    let report;

    switch (reportType) {
      case 'pnl':
        report = await financialAnalyticsService.generatePNLStatement(startDate, endDate, currency);
        break;
      case 'balance_sheet':
        report = await financialAnalyticsService.generateBalanceSheet(endDate, currency);
        break;
      case 'comprehensive':
        report = await financialAnalyticsService.generateFinancialReport(startDate, endDate, includeForecast, currency);
        break;
      case 'cash_flow':
        report = await financialAnalyticsService.generateCashFlowStatement(startDate, endDate, currency);
        break;
      default:
        return NextResponse.json(
          { success: false, error: 'Invalid report type' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      data: report
    });

  } catch (error) {
    console.error('Financial report generation failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to generate financial report',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const timeframe = searchParams.get('timeframe') || 'month';

    const kpis = await financialAnalyticsService.getFinancialKPIs(timeframe as any);

    return NextResponse.json({
      success: true,
      data: kpis
    });

  } catch (error) {
    console.error('Financial KPIs fetch failed:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch financial KPIs',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}