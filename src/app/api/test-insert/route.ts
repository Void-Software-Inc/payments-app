import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

/**
 * Test endpoint to manually insert a record
 * Only available in development mode
 */
export async function GET(request: NextRequest) {
  // Only allow in development mode
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'This endpoint is only available in development mode' }, { status: 403 });
  }
  
  try {
    // Generate valid hex string for paymentId (64 characters)
    const validHexId = crypto.randomBytes(32).toString('hex');
    
    const testPayment = await prisma.completedPayment.create({
      data: {
        paymentId: validHexId, // Valid 64-char hex string
        paidAmount: '0.01',
        tipAmount: '0',
        issuedBy: '0xTestUser123',
        paidBy: '0xTestPayer456',
        coinType: 'TEST_COIN',
        description: 'Test payment created via API',
        transactionHash: 'tx_' + Date.now().toString()
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Test record inserted successfully',
      data: testPayment
    });
  } catch (error) {
    console.error('Error inserting test record:', error);
    return NextResponse.json({
      success: false,
      error: String(error)
    }, { status: 500 });
  }
} 