import { NextRequest, NextResponse } from 'next/server';
import { mpesaService } from '@/lib/mpesa-service';
import { auditLogger } from '@/lib/audit-logger';

export async function POST(request: NextRequest) {
  try {
    const callbackData = await request.json();

    // Validate callback structure
    if (!callbackData.Body || !callbackData.Body.stkCallback) {
      return NextResponse.json(
        { success: false, error: 'Invalid MPesa callback format' },
        { status: 400 }
      );
    }

    const callback = callbackData as MPesaCallback;

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

    // Process callback
    const result = await mpesa.processCallback(callback);

    // Log callback processing
    await auditLogger.logPaymentEvent('mpesa_callback_received', {
      checkoutRequestID: result.checkoutRequestID,
      resultCode: result.resultCode,
      success: result.success,
      timestamp: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Callback processed successfully'
    });

  } catch (error) {
    console.error('MPesa callback processing error:', error);

    await auditLogger.logPaymentEvent('mpesa_callback_failed', {
      error: error.message,
      timestamp: new Date()
    });

    // Always return 200 to MPesa to acknowledge receipt
    return NextResponse.json({
      success: false,
      message: 'Callback processing failed'
    });
  }
}