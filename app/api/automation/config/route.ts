import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import { automationConfigService } from '@/lib/automation-config';
import { auditLogger } from '@/lib/audit-logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const config = await automationConfigService.getConfiguration();

    return NextResponse.json({
      success: true,
      data: config
    });

  } catch (error) {
    console.error('Failed to get automation config:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to retrieve automation configuration',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const configData = await request.json();

    // Validate configuration
    const validationResult = await automationConfigService.validateConfiguration(configData);
    if (!validationResult.valid) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid configuration',
          details: validationResult.errors
        },
        { status: 400 }
      );
    }

    // Update configuration
    const updatedConfig = await automationConfigService.updateConfiguration(configData);

    // Log configuration update
    await auditLogger.logAutomationEvent('configuration_updated', {
      userId: session.user.id,
      updatedSections: Object.keys(configData),
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      data: updatedConfig
    });

  } catch (error) {
    console.error('Failed to update automation config:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update automation configuration',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}