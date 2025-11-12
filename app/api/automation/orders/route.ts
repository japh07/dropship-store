import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import { orderAutomationService } from '@/lib/order-automation';
import { auditLogger } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const orderData = await request.json();

    // Validate required fields
    if (!orderData.id || !orderData.line_items || !orderData.shipping_address) {
      return NextResponse.json(
        { success: false, error: 'Missing required order fields' },
        { status: 400 }
      );
    }

    // Log order automation initiation
    await auditLogger.logOrderEvent('order_automation_started', {
      orderId: orderData.id,
      customerEmail: orderData.email,
      totalAmount: orderData.total_price,
      itemCount: orderData.line_items.length,
      userId: session.user.id
    });

    // Process order automation
    const result = await orderAutomationService.processOrder(orderData, {
      userId: session.user.id,
      userEmail: session.user.email
    });

    // Log successful automation
    await auditLogger.logOrderEvent('order_automation_completed', {
      orderId: orderData.id,
      supplierOrderId: result.supplierOrderId,
      totalCost: result.totalCost,
      profit: result.profit,
      automationTime: result.automationTime
    });

    return NextResponse.json({
      success: true,
      data: {
        orderId: orderData.id,
        supplierOrderId: result.supplierOrderId,
        supplierName: result.supplierName,
        totalCost: result.totalCost,
        profit: result.profit,
        estimatedDelivery: result.estimatedDelivery,
        trackingAvailable: result.trackingAvailable
      }
    });

  } catch (error) {
    console.error('Order automation error:', error);

    await auditLogger.logOrderEvent('order_automation_failed', {
      error: error.message,
      orderId: request.body?.id || 'unknown'
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process order automation',
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
    const orderId = searchParams.get('orderId');
    const status = searchParams.get('status');

    const result = await orderAutomationService.getOrderStatus({
      orderId,
      status,
      userId: session.user.id
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Order status fetch error:', error);

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch order status',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}