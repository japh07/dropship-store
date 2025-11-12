import { NextRequest, NextResponse } from 'next/server';
import { mpesaService } from '@/lib/mpesa-service';
import { auditLogger } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const { orderId, amount, phoneNumber, accountReference, description } = await request.json();

    // Validate required fields
    if (!orderId || !amount || !phoneNumber) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: orderId, amount, phoneNumber' },
        { status: 400 }
      );
    }

    // Validate phone number format (Kenyan format)
    const phoneRegex = /^(254|0)?[7]\d{8}$/;
    if (!phoneRegex.test(phoneNumber.toString())) {
      return NextResponse.json(
        { success: false, error: 'Invalid Kenyan phone number format' },
        { status: 400 }
      );
    }

    // Format phone number to 254 format
    let formattedPhone = phoneNumber.toString();
    if (formattedPhone.startsWith('0')) {
      formattedPhone = '254' + formattedPhone.substring(1);
    } else if (!formattedPhone.startsWith('254')) {
      formattedPhone = '254' + formattedPhone;
    }

    // Initialize MPesa service
    const mpesaConfig = {
      apiKey: process.env.MPESA_API_KEY!,
      publicKey: process.env.MPESA_PUBLIC_KEY!,
      initiatorName: process.env.MPESA_INITIATOR_NAME!,
      securityCredential: process.env.MPESA_SECURITY_CREDENTIAL!,
      shortCode: process.env.MPESA_SHORT_CODE!,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox'
    };

    const mpesa = new (await import('@/lib/mpesa-service')).MPesaService(mpesaConfig);

    // Initiate STK Push
    const result = await mpesa.initiateSTKPush({
      orderId,
      amount: Number(amount),
      phoneNumber: formattedPhone,
      accountReference,
      description
    });

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('MPesa STK Push error:', error);

    await auditLogger.logPaymentEvent('mpesa_stk_failed', {
      error: error.message,
      timestamp: new Date()
    });

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to initiate MPesa STK Push',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}