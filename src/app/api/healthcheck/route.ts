import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log("Healthcheck: Testing database connection...");
    
    // Environment check
    const env = {
      nodeEnv: process.env.NODE_ENV,
      dbUrlExists: !!process.env.DATABASE_URL,
      directUrlExists: !!process.env.DIRECT_URL
    };
    
    // Database connection test
    let dbStatus = "Unknown";
    let dbError = null;
    
    try {
      // Use Prisma model method instead of raw query
      const count = await prisma.completedPayment.count();
      dbStatus = "Connected";
      console.log("Database connection successful, count:", count);
    } catch (error) {
      console.error("Database connection failed:", error);
      dbStatus = "Error";
      dbError = String(error);
    }
    
    // Return standard format for monitoring plus diagnostics
    return NextResponse.json({
      status: 'OK', 
      message: 'Service is healthy',
      database: {
        status: dbStatus,
        error: dbError
      },
      env
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'ERROR', message: 'Service is unhealthy', error: String(error) },
      { status: 500 }
    );
  }
}