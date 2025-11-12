import { NextRequest, NextResponse } from 'next/server';
import { handsOffAutomation } from '@/lib/hands-off-automation';
import { autoThrottlingService } from '@/lib/auto-throttling-service';
import { aiLearningSystem } from '@/lib/ai-learning-system';
import { auditLogger } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  try {
    // Get comprehensive automation status
    const [
      automationStatus,
      competitorAnalysis,
      aiAnalytics
    ] = await Promise.all([
      handsOffAutomation.getAutomationStatus(),
      autoThrottlingService.getCompetitorAnalysis(),
      aiLearningSystem.getLearningAnalytics()
    ]);

    // Calculate system health
    const systemHealth = calculateSystemHealth(automationStatus, competitorAnalysis, aiAnalytics);

    // Get automation mode statistics
    const modeStats = await getAutomationModeStats();

    const statusResponse = {
      success: true,
      timestamp: new Date(),
      system: {
        isActive: automationStatus.isActive,
        currentMode: automationStatus.currentMode,
        emergencyStop: automationStatus.emergencyStop,
        health: systemHealth,
        uptime: automationStatus.uptime,
        lastActivity: automationStatus.lastActivity
      },
      performance: {
        metrics: automationStatus.performanceMetrics,
        recentOutcomes: automationStatus.recentOutcomes,
        successRate: automationStatus.performanceMetrics?.successRate || 0,
        averageExecutionTime: automationStatus.performanceMetrics?.averageExecutionTime || 0
      },
      ai: {
        learningEnabled: automationStatus.learningEnabled,
        models: aiAnalytics.totalModels,
        averageAccuracy: aiAnalytics.averageAccuracy,
        insights: aiAnalytics.businessInsights,
        improvements: aiAnalytics.improvementOpportunities
      },
      competitors: {
        totalCompetitors: competitorAnalysis.totalCompetitors,
        activeCompetitors: competitorAnalysis.activeCompetitors,
        marketVolatility: competitorAnalysis.marketVolatility,
        recentActivities: competitorAnalysis.recentActivities,
        threats: competitorAnalysis.threats,
        opportunities: competitorAnalysis.opportunities
      },
      automation: {
        pendingActions: automationStatus.pendingActions.length,
        alerts: automationStatus.alerts,
        modeDistribution: modeStats,
        autoThrottlingEnabled: automationStatus.autoThrottlingEnabled
      }
    };

    return NextResponse.json(statusResponse);

  } catch (error) {
    console.error('Failed to get automation status:', error);

    await auditLogger.logSystemEvent('automation_status_failed', {
      error: error.message,
      timestamp: new Date()
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve automation status',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    let result;

    switch (action) {
      case 'set_mode':
        result = await handsOffAutomation.setAutomationMode(
          data.mode,
          data.reason
        );
        break;

      case 'emergency_stop':
        result = await handsOffAutomation.emergencyStopAutomation(data.reason);
        break;

      case 'resume':
        result = await handsOffAutomation.resumeAutomation();
        break;

      case 'confirm_action':
        result = await handsOffAutomation.handleUserConfirmation(data.confirmation);
        break;

      default:
        return NextResponse.json(
          {
            success: false,
            error: `Unknown action: ${action}`
          },
          { status: 400 }
        );
    }

    await auditLogger.logAutomationEvent('automation_control_action', {
      action,
      data,
      result,
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      action,
      result,
      timestamp: new Date()
    });

  } catch (error) {
    console.error('Failed to execute automation control:', error);

    await auditLogger.logAutomationEvent('automation_control_failed', {
      action: body.action,
      error: error.message,
      timestamp: new Date()
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to execute automation control',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

function calculateSystemHealth(
  automationStatus: any,
  competitorAnalysis: any,
  aiAnalytics: any
): 'excellent' | 'good' | 'warning' | 'critical' {
  let healthScore = 100;

  // Check automation status
  if (!automationStatus.isActive) healthScore -= 40;
  if (automationStatus.emergencyStop) healthScore -= 50;

  // Check performance metrics
  const metrics = automationStatus.performanceMetrics;
  if (metrics) {
    if (metrics.successRate < 0.8) healthScore -= 20;
    if (metrics.errorRate > 0.2) healthScore -= 15;
    if (metrics.averageExecutionTime > 10000) healthScore -= 10;
  }

  // Check AI system
  if (aiAnalytics.totalModels === 0) healthScore -= 15;
  if (aiAnalytics.averageAccuracy < 0.7) healthScore -= 10;

  // Check competitor monitoring
  if (competitorAnalysis.totalCompetitors === 0) healthScore -= 10;
  if (competitorAnalysis.marketVolatility > 0.8) healthScore -= 5;

  if (healthScore >= 90) return 'excellent';
  if (healthScore >= 70) return 'good';
  if (healthScore >= 50) return 'warning';
  return 'critical';
}

async function getAutomationModeStats(): Promise<Record<string, number>> {
  try {
    const insights = await handsOffAutomation.getAutomationInsights('day');
    return insights.modeDistribution;
  } catch (error) {
    return {
      full: 0,
      hybrid: 0,
      manual: 0
    };
  }
}