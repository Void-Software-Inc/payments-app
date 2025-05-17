import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/payments/force-save
 * Direct database save that bypasses the service layer
 * This is a fallback endpoint for saving payments if the main one fails
 */
export async function POST(request: NextRequest) {
  try {
    console.log("FORCE-SAVE: Received request");
    const body = await request.json();
    console.log("FORCE-SAVE: Request body:", body);
    
    // Validate minimum required fields
    if (!body.paymentId || !body.paidBy) {
      console.error("FORCE-SAVE: Missing critical fields");
      return NextResponse.json(
        { error: "Missing critical fields paymentId or paidBy" },
        { status: 400 }
      );
    }
    
    // Check if prisma client is available
    if (!prisma || !prisma.completedPayment) {
      console.error("FORCE-SAVE: Prisma client not properly initialized");
      return NextResponse.json(
        { error: "Database connection not available" },
        { status: 500 }
      );
    }
    
    // Create normalized data to save
    const normalizedData = {
      paymentId: body.paymentId,
      paidAmount: body.paidAmount || '0',
      tipAmount: body.tipAmount || '0',
      issuedBy: body.issuedBy || 'unknown',
      paidBy: body.paidBy,
      coinType: body.coinType || 'unknown',
      description: body.description || '',
      transactionHash: body.transactionHash || 'unknown',
    };
    
    console.log("FORCE-SAVE: Attempting direct database save with:", normalizedData);
    
    // Try direct database operation (bypassing service layer)
    try {
      const result = await prisma.$transaction(async (tx: { completedPayment: { findUnique: (arg0: { where: { paymentId: any; }; }) => any; update: (arg0: { where: { paymentId: any; }; data: { paymentId: any; paidAmount: any; tipAmount: any; issuedBy: any; paidBy: any; coinType: any; description: any; transactionHash: any; }; }) => any; create: (arg0: { data: { paymentId: any; paidAmount: any; tipAmount: any; issuedBy: any; paidBy: any; coinType: any; description: any; transactionHash: any; }; }) => any; }; }) => {
        // Check if record already exists
        const existing = await tx.completedPayment.findUnique({
          where: { paymentId: body.paymentId }
        });
        
        if (existing) {
          console.log("FORCE-SAVE: Record already exists, updating");
          return await tx.completedPayment.update({
            where: { paymentId: body.paymentId },
            data: normalizedData
          });
        } else {
          console.log("FORCE-SAVE: Creating new record");
          return await tx.completedPayment.create({
            data: normalizedData
          });
        }
      });
      
      console.log("FORCE-SAVE: Successfully saved payment:", result);
      return NextResponse.json({ success: true, data: result });
    } catch (dbError) {
      console.error("FORCE-SAVE: Database operation failed:", dbError);
      
      // Last resort attempt - raw SQL query if model operations fail
      try {
        console.log("FORCE-SAVE: Attempting raw SQL INSERT");
        const timestamp = new Date().toISOString();
        
        const result = await prisma.$executeRaw`
          INSERT INTO "CompletedPayment" (
            "id", "paymentId", "paidAmount", "tipAmount", "issuedBy", 
            "paidBy", "coinType", "description", "transactionHash", 
            "createdAt", "updatedAt"
          ) 
          VALUES (
            ${crypto.randomUUID()}, ${body.paymentId}, ${body.paidAmount || '0'}, 
            ${body.tipAmount || '0'}, ${body.issuedBy || 'unknown'}, 
            ${body.paidBy}, ${body.coinType || 'unknown'}, 
            ${body.description || ''}, ${body.transactionHash || 'unknown'}, 
            ${timestamp}, ${timestamp}
          )
          ON CONFLICT ("paymentId") 
          DO UPDATE SET 
            "paidAmount" = ${body.paidAmount || '0'},
            "tipAmount" = ${body.tipAmount || '0'},
            "issuedBy" = ${body.issuedBy || 'unknown'},
            "paidBy" = ${body.paidBy},
            "coinType" = ${body.coinType || 'unknown'},
            "description" = ${body.description || ''},
            "transactionHash" = ${body.transactionHash || 'unknown'},
            "updatedAt" = ${timestamp}
        `;
        
        console.log("FORCE-SAVE: Raw SQL insert successful");
        return NextResponse.json({ success: true, method: "raw-sql" });
      } catch (sqlError) {
        console.error("FORCE-SAVE: Raw SQL operation failed:", sqlError);
        throw sqlError;
      }
    }
  } catch (error) {
    console.error("FORCE-SAVE: Unhandled error:", error);
    return NextResponse.json(
      { error: "Failed to save payment", details: String(error) },
      { status: 500 }
    );
  }
} 