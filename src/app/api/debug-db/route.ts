import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log("Debug DB: Testing database connection...");

    // Environment info
    const env = {
      nodeEnv: process.env.NODE_ENV,
      dbUrlExists: !!process.env.DATABASE_URL,
      directUrlExists: !!process.env.DIRECT_URL
    };

    // Test database connection
    let dbStatus = 'Unknown';
    let error = null;
    let dbInfo = null;
    let modelInfo = null;

    try {
      // Basic raw query
      const queryResult = await prisma.$queryRaw`SELECT current_timestamp, current_database()`;
      dbStatus = 'Connected';
      dbInfo = queryResult;
      
      // Test model access
      const count = await prisma.completedPayment.count();
      modelInfo = { count };
    } catch (err) {
      dbStatus = 'Error';
      error = String(err);
      console.error("Database connection error:", err);
    }

    return NextResponse.json({
      status: dbStatus,
      env,
      dbInfo,
      modelInfo,
      error,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Debug-db error:", error);
    return NextResponse.json(
      { error: String(error) },
      { status: 500 }
    );
  }
} 