import { NextRequest, NextResponse } from 'next/server';
import { PaymentService } from '@/lib/services/payment';

// Basic security validation for payment data
function validatePaymentData(body: any) {
  // Skip strict validation in development mode
  if (process.env.NODE_ENV === 'development') {
    console.log("Development mode: Skipping strict validation");
    return { valid: true };
  }

  // 1. Validate paymentId format (SUI transaction ID is 64 hex characters)
  if (!body.paymentId || typeof body.paymentId !== 'string' || !/^[a-f0-9]{64}$/i.test(body.paymentId)) {
    return { valid: false, error: 'Invalid payment ID format' };
  }
  
  // 2. Validate wallet addresses
  if (!body.paidBy || typeof body.paidBy !== 'string' || !body.paidBy.startsWith('0x')) {
    return { valid: false, error: 'Invalid payer wallet address' };
  }
  
  if (!body.issuedBy || typeof body.issuedBy !== 'string' || !body.issuedBy.startsWith('0x')) {
    return { valid: false, error: 'Invalid issuer wallet address' };
  }
  
  // 3. Validate transaction hash format (should be base58 string)
  if (!body.transactionHash || typeof body.transactionHash !== 'string') {
    return { valid: false, error: 'Invalid transaction hash' };
  }
  
  // 4. Amount validation (should parse as a number)
  try {
    const amount = parseFloat(body.paidAmount);
    const tip = parseFloat(body.tipAmount);
    if (isNaN(amount) || amount < 0 || isNaN(tip) || tip < 0) {
      return { valid: false, error: 'Invalid amount values' };
    }
  } catch (e) {
    return { valid: false, error: 'Invalid amount format' };
  }
  
  return { valid: true };
}

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

    // Validate data for security
    const validation = validatePaymentData(body);
    if (!validation.valid) {
      console.error(`API: Security validation failed: ${validation.error}`);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
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