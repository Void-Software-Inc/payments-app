import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment';

/**
 * POST /api/payments
 * Saves a completed payment record
 */
export async function POST(request: NextRequest) {
  try {
    console.log("API: POST /api/payments received request");
    
    const body = await request.json();
    console.log("API: Request body:", body);
    
    // Validate required fields
    const requiredFields = ['paymentId', 'paidAmount', 'tipAmount', 'issuedBy', 'paidBy', 'coinType', 'transactionHash'];
    for (const field of requiredFields) {
      if (!body[field]) {
        console.error(`API: Missing required field: ${field}`);
        return NextResponse.json(
          { error: `Missing required field: ${field}` },
          { status: 400 }
        );
      }
    }

    console.log("API: All required fields validated, saving payment...");
    
    // Save payment record
    const completedPayment = await PaymentService.saveCompletedPayment({
      paymentId: body.paymentId,
      paidAmount: body.paidAmount,
      tipAmount: body.tipAmount,
      issuedBy: body.issuedBy,
      paidBy: body.paidBy,
      coinType: body.coinType,
      description: body.description,
      transactionHash: body.transactionHash,
    });

    console.log("API: Payment saved successfully:", completedPayment);
    return NextResponse.json({ success: true, data: completedPayment });
  } catch (error) {
    console.error('Error in POST /api/payments:', error);
    return NextResponse.json(
      { error: 'Failed to save payment' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/payments?paymentId=XYZ
 * Get completed payment by ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const paymentId = searchParams.get('paymentId');
    const walletAddress = searchParams.get('walletAddress');
    const role = searchParams.get('role') as 'payer' | 'issuer' | null;

    // Get by payment ID
    if (paymentId) {
      const payment = await PaymentService.getCompletedPayment(paymentId);
      
      if (!payment) {
        return NextResponse.json(
          { error: 'Payment not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ success: true, data: payment });
    }
    
    // Get by wallet address
    if (walletAddress) {
      const payments = await PaymentService.getCompletedPaymentsByAddress(walletAddress, role || undefined);
      return NextResponse.json({ success: true, data: payments });
    }
    
    return NextResponse.json(
      { error: 'Missing required query parameter: paymentId or walletAddress' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Error in GET /api/payments:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve payment information' },
      { status: 500 }
    );
  }
} 