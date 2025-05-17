import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

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
  
  // 3. Validate transaction hash format
  if (!body.transactionHash || typeof body.transactionHash !== 'string') {
    return { valid: false, error: 'Invalid transaction hash' };
  }
  
  return { valid: true };
}

// Format USDC amount (divide by 1,000,000)
function formatCryptoAmount(amount: string, coinType: string) {
  if (coinType.includes('::usdc::USDC')) {
    try {
      // Convert directly to number for proper decimal division
      return (Number(amount) / 1000000).toString();
    } catch (e) {
      console.warn("Failed to format USDC amount:", e);
    }
  }
  return amount;
}

/**
 * POST /api/payments/force-save
 * Direct database save that bypasses the service layer
 * This is a fallback endpoint for saving payments if the main one fails
 */
export async function POST(request: NextRequest) {
  try {
    console.log("FORCE-SAVE: Received request");
    const body = await request.json();
    console.log("FORCE-SAVE: Request body:", { paymentId: body.paymentId });
    
    // Log environment for debugging
    console.log("FORCE-SAVE: Environment:", {
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL
    });
    
    // Validate minimum required fields
    if (!body.paymentId || !body.paidBy) {
      console.error("FORCE-SAVE: Missing critical fields");
      return NextResponse.json(
        { error: "Missing critical fields paymentId or paidBy" },
        { status: 400 }
      );
    }
    
    // Validate data for security
    const validation = validatePaymentData(body);
    if (!validation.valid) {
      console.error(`FORCE-SAVE: Security validation failed: ${validation.error}`);
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      );
    }
    
    // Format amounts using the proper conversion for USDC
    const formattedPaidAmount = formatCryptoAmount(body.paidAmount || '0', body.coinType || '');
    const formattedTipAmount = formatCryptoAmount(body.tipAmount || '0', body.coinType || '');
    
    // Create data with ID generated here
    const paymentData = {
      id: crypto.randomUUID(),
      paymentId: body.paymentId,
      paidAmount: formattedPaidAmount,
      tipAmount: formattedTipAmount,
      issuedBy: body.issuedBy || 'unknown',
      paidBy: body.paidBy,
      coinType: body.coinType || 'unknown',
      description: body.description || '',
      transactionHash: body.transactionHash || 'unknown',
    };
    
    console.log("FORCE-SAVE: Attempting direct database save");
    
    // Directly use createMany which is more reliable with connection pooling
    try {
      const result = await prisma.$executeRaw`
        INSERT INTO "CompletedPayment" (
          "id", "paymentId", "paidAmount", "tipAmount", "issuedBy", 
          "paidBy", "coinType", "description", "transactionHash", 
          "createdAt", "updatedAt"
        ) 
        VALUES (
          ${paymentData.id}, 
          ${paymentData.paymentId}, 
          ${paymentData.paidAmount}, 
          ${paymentData.tipAmount}, 
          ${paymentData.issuedBy}, 
          ${paymentData.paidBy}, 
          ${paymentData.coinType}, 
          ${paymentData.description}, 
          ${paymentData.transactionHash}, 
          NOW(), 
          NOW()
        )
        ON CONFLICT ("paymentId") 
        DO UPDATE SET 
          "paidAmount" = EXCLUDED."paidAmount",
          "tipAmount" = EXCLUDED."tipAmount",
          "issuedBy" = EXCLUDED."issuedBy",
          "paidBy" = EXCLUDED."paidBy",
          "coinType" = EXCLUDED."coinType",
          "description" = EXCLUDED."description",
          "transactionHash" = EXCLUDED."transactionHash",
          "updatedAt" = NOW()
      `;
      
      console.log("FORCE-SAVE: Database operation successful");
      return NextResponse.json({ 
        success: true, 
        paymentId: paymentData.paymentId,
        message: "Payment saved successfully" 
      });
    } catch (error) {
      console.error("FORCE-SAVE: Database error:", error);
      return NextResponse.json(
        { error: "Database operation failed", details: String(error) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("FORCE-SAVE: Unhandled error:", error);
    return NextResponse.json(
      { error: "Failed to save payment", details: String(error) },
      { status: 500 }
    );
  }
} 