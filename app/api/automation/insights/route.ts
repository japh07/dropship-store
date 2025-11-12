import { NextRequest, NextResponse } from 'next/server';
import { handsOffAutomation } from '@/lib/hands-off-automation';
import { aiLearningSystem } from '@/lib/ai-learning-system';
import { autoThrottlingService } from '@/lib/auto-throttling-service';
import { auditLogger } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeframe = (searchParams.get('timeframe') as 'hour' | 'day' | 'week') || 'day';
    const includeRecommendations = searchParams.get('recommendations') === 'true';

    // Get comprehensive insights from all systems
    const [
      automationInsights,
      aiAnalytics,
      competitorAnalysis
    ] = await Promise.all([
      handsOffAutomation.getAutomationInsights(timeframe),
      aiLearningSystem.getLearningAnalytics(),
      autoThrottlingService.getCompetitorAnalysis()
    ]);

    // Generate actionable recommendations
    let recommendations = [];
    if (includeRecommendations) {
      recommendations = await generateRecommendations(automationInsights, aiAnalytics, competitorAnalysis);
    }

    // Calculate efficiency metrics
    const efficiencyMetrics = calculateEfficiencyMetrics(automationInsights, aiAnalytics);

    // Identify optimization opportunities
    const optimizationOpportunities = identifyOptimizationOpportunities(
      automationInsights,
      aiAnalytics,
      competitorAnalysis
    );

    const insightsResponse = {
      success: true,
      timeframe,
      timestamp: new Date(),
      automation: {
        totalActions: automationInsights.totalActions,
        successRate: automationInsights.successfulActions / Math.max(automationInsights.totalActions, 1),
        failureRate: automationInsights.failedActions / Math.max(automationInsights.totalActions, 1),
        averageExecutionTime: automationInsights.averageExecutionTime,
        userInterventionRate: automationInsights.userInterventionRate,
        modeDistribution: automationInsights.modeDistribution,
        actionTypeDistribution: automationInsights.actionTypeDistribution,
        topPerformingActions: automationInsights.topPerformingActions,
        areasForImprovement: automationInsights.areasForImprovement,
        learningProgress: automationInsights.learningProgress
      },
      ai: {
        modelsActive: aiAnalytics.activeModels,
        averageAccuracy: aiAnalytics.averageAccuracy,
        modelsByType: aiAnalytics.modelsByType,
        performanceTrends: aiAnalytics.performanceTrends,
        feedbackAnalysis: aiAnalytics.feedbackAnalysis,
        businessInsights: aiAnalytics.businessInsights,
        improvementOpportunities: aiAnalytics.improvementOpportunities
      },
      market: {
        totalCompetitors: competitorAnalysis.totalCompetitors,
        activeCompetitors: competitorAnalysis.activeCompetitors,
        marketVolatility: competitorAnalysis.marketVolatility,
        competitorActivity: {
          priceChanges: competitorAnalysis.priceChanges,
          promotions: competitorAnalysis.promotions,
          outOfStock: competitorAnalysis.outOfStock,
          newEntries: competitorAnalysis.newEntries
        },
        topCompetitors: competitorAnalysis.topCompetitors,
        threats: competitorAnalysis.threats,
        opportunities: competitorAnalysis.opportunities
      },
      efficiency: efficiencyMetrics,
      optimization: optimizationOpportunities,
      recommendations,
      trends: automationInsights.trends
    };

    await auditLogger.logSystemEvent('automation_insights_retrieved', {
      timeframe,
      includeRecommendations,
      timestamp: new Date()
    });

    return NextResponse.json(insightsResponse);

  } catch (error) {
    console.error('Failed to get automation insights:', error);

    await auditLogger.logSystemEvent('automation_insights_failed', {
      error: error.message,
      timestamp: new Date()
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve automation insights',
        timestamp: new Date()
      },
      { status: 500 }
    );
  }
}

async function generateRecommendations(
  automationInsights: any,
  aiAnalytics: any,
  competitorAnalysis: any
): Promise<string[]> {
  const recommendations: string[] = [];

  // Automation performance recommendations
  if (automationInsights.successfulActions / Math.max(automationInsights.totalActions, 1) < 0.8) {
    recommendations.push('Consider reviewing automation rules - success rate below 80%');
  }

  if (automationInsights.userInterventionRate > 0.5) {
    recommendations.push('High user intervention rate - consider adjusting confirmation thresholds or improving AI confidence');
  }

  if (automationInsights.averageExecutionTime > 5000) {
    recommendations.push('Optimize automation execution - average time above 5 seconds');
  }

  // AI system recommendations
  if (aiAnalytics.averageAccuracy < 0.75) {
    recommendations.push('AI model accuracy below 75% - consider retraining with more data');
  }

  if (aiAnalytics.activeModels < aiAnalytics.totalModels * 0.5) {
    recommendations.push('Many AI models are inactive - review model performance and retrain if necessary');
  }

  // Market response recommendations
  if (competitorAnalysis.marketVolatility > 0.7) {
    recommendations.push('High market volatility detected - consider more frequent price monitoring and responsive throttling');
  }

  if (competitorAnalysis.promotions > competitorAnalysis.totalCompetitors * 0.3) {
    recommendations.push('High promotional activity from competitors - review pricing strategy and consider counter-promotions');
  }

  // Business insights recommendations
  aiAnalytics.businessInsights.forEach((insight: string) => {
    if (insight.includes('opportunity')) {
      recommendations.push(`Business opportunity: ${insight}`);
    }
  });

  // Optimization opportunities
  aiAnalytics.improvementOpportunities.forEach((opportunity: string) => {
    recommendations.push(`AI improvement: ${opportunity}`);
  });

  return recommendations.slice(0, 10); // Limit to top 10 recommendations
}

function calculateEfficiencyMetrics(automationInsights: any, aiAnalytics: any): any {
  const successRate = automationInsights.successfulActions / Math.max(automationInsights.totalActions, 1);
  const avgExecutionTime = automationInsights.averageExecutionTime;
  const aiAccuracy = aiAnalytics.averageAccuracy;

  // Calculate efficiency score (0-100)
  const efficiencyScore = (
    successRate * 40 + // 40% weight for success rate
    Math.max(0, (10000 - avgExecutionTime) / 100) * 30 + // 30% weight for execution time
    aiAccuracy * 30 // 30% weight for AI accuracy
  );

  // Calculate cost savings (estimated)
  const manualTimePerAction = 300; // 5 minutes in seconds
  const automatedTimePerAction = avgExecutionTime / 1000; // Convert to seconds
  const timeSavedPerAction = Math.max(0, manualTimePerAction - automatedTimePerAction);
  const estimatedCostSavings = (timeSavedPerAction / 3600) * 25 * automationInsights.totalActions; // $25/hour

  return {
    efficiencyScore: Math.min(100, Math.round(efficiencyScore)),
    timeSavedPerAction: Math.round(timeSavedPerAction),
    estimatedCostSavings: Math.round(estimatedCostSavings),
    automationROI: calculateROI(automationInsights),
    throughput: calculateThroughput(automationInsights),
    reliability: successRate
  };
}

function calculateROI(automationInsights: any): number {
  // Simple ROI calculation based on success rate and execution time
  const baseValue = 100;
  const successMultiplier = automationInsights.successfulActions / Math.max(automationInsights.totalActions, 1);
  const efficiencyMultiplier = Math.max(0.1, (10000 - automationInsights.averageExecutionTime) / 10000);

  return Math.round(baseValue * successMultiplier * efficiencyMultiplier);
}

function calculateThroughput(automationInsights: any): number {
  // Actions per hour
  const hoursInTimeframe = {
    hour: 1,
    day: 24,
    week: 168
  };

  const hours = hoursInTimeframe[automationInsights.timeframe as keyof typeof hoursInTimeframe] || 24;
  return Math.round(automationInsights.totalActions / Math.max(hours, 1));
}

function identifyOptimizationOpportunities(
  automationInsights: any,
  aiAnalytics: any,
  competitorAnalysis: any
): any {
  const opportunities: any[] = [];

  // Automation optimization
  if (automationInsights.failedActions > automationInsights.totalActions * 0.2) {
    opportunities.push({
      type: 'automation',
      priority: 'high',
      title: 'Reduce Automation Failures',
      description: 'High failure rate detected - review error handling and validation rules',
      potentialImpact: 25,
      effort: 'medium'
    });
  }

  // AI optimization
  if (aiAnalytics.averageAccuracy < 0.8) {
    opportunities.push({
      type: 'ai',
      priority: 'medium',
      title: 'Improve AI Model Accuracy',
      description: 'Retrain models with additional data to improve prediction accuracy',
      potentialImpact: 30,
      effort: 'high'
    });
  }

  // Market response optimization
  if (competitorAnalysis.activeCompetitors === 0) {
    opportunities.push({
      type: 'monitoring',
      priority: 'high',
      title: 'Enable Competitor Monitoring',
      description: 'No competitor monitoring active - missing market opportunities',
      potentialImpact: 40,
      effort: 'low'
    });
  }

  // Performance optimization
  if (automationInsights.averageExecutionTime > 3000) {
    opportunities.push({
      type: 'performance',
      priority: 'medium',
      title: 'Optimize Execution Time',
      description: 'Slow execution times affecting automation responsiveness',
      potentialImpact: 20,
      effort: 'medium'
    });
  }

  // Learning optimization
  if (automationInsights.learningProgress < 10) {
    opportunities.push({
      type: 'learning',
      priority: 'low',
      title: 'Enhance Learning System',
      description: 'AI learning progress is slow - consider expanding training data',
      potentialImpact: 35,
      effort: 'high'
    });
  }

  return opportunities.sort((a, b) => b.potentialImpact - a.potentialImpact).slice(0, 5);
}