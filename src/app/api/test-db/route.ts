import { NextRequest, NextResponse } from 'next/server';
import { prisma, prismaUtils } from '@/lib/prisma';

/**
 * GET /api/test-db
 * Tests database connectivity and provides diagnostic info
 * Useful for troubleshooting database issues in production
 */
export async function GET(request: NextRequest) {
  try {
    console.log("API: Testing database connection");
    
    // Test connection with a simple query
    const connectionTest = await prismaUtils.testConnection();
    
    // Get environment info (safely, without exposing sensitive data)
    const envInfo = {
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL,
      nextRuntime: process.env.NEXT_RUNTIME || 'unknown',
      postgresSSL: process.env.POSTGRES_SSL === 'true',
    };

    // Basic Prisma client info
    const clientInfo = {
      initialized: !!prisma,
      hasCompletedPaymentModel: !!prisma?.completedPayment,
    };

    // Attempt to perform a count operation
    let countResult;
    try {
      const count = await prisma.completedPayment.count();
      countResult = { success: true, count };
    } catch (countError) {
      countResult = { 
        success: false, 
        error: String(countError),
      };
    }

    // Attempt to retrieve a sample payment for testing
    let samplePaymentResult;
    try {
      const payment = await prisma.completedPayment.findFirst({
        select: { 
          id: true,
          paymentId: true,
          createdAt: true
        }
      });
      samplePaymentResult = { 
        success: !!payment, 
        hasPayment: !!payment,
        paymentSample: payment ? {
          id: payment.id,
          created: payment.createdAt,
        } : null
      };
    } catch (sampleError) {
      samplePaymentResult = { 
        success: false, 
        error: String(sampleError)
      };
    }

    console.log("API: Database test results:", {
      connectionTest: connectionTest.success ? 'success' : 'failed',
      countResult: countResult.success ? 'success' : 'failed',
      samplePaymentResult: samplePaymentResult.success ? 'success' : 'failed'
    });

    return NextResponse.json({
      success: connectionTest.success && countResult.success,
      timestamp: new Date().toISOString(),
      environment: envInfo,
      client: clientInfo,
      connection: connectionTest,
      countOperation: countResult,
      samplePayment: samplePaymentResult
    });
  } catch (error) {
    console.error('Error testing database connection:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to test database connection', 
        details: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
} 