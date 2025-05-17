import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log("Healthcheck: Testing system status...");
    
    // Basic environment check
    const environment = {
      nodeEnv: process.env.NODE_ENV,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasDirectUrl: !!process.env.DIRECT_URL,
    };
    
    console.log("Healthcheck: Environment:", environment);
    
    // Database connectivity check
    let dbStatus = "Unknown";
    let dbDetails = null;
    
    try {
      // Test simple query
      const result = await prisma.$queryRaw`SELECT current_timestamp as time, current_database() as database`;
      dbStatus = "Connected";
      dbDetails = result;
      console.log("Healthcheck: Database connection successful", result);
    } catch (dbError) {
      console.error("Healthcheck: Database connection failed:", dbError);
      dbStatus = "Error";
      dbDetails = String(dbError);
    }
    
    // Prisma model check
    let modelStatus = "Unknown"; 
    
    try {
      if (prisma.completedPayment) {
        // Just count records - lightweight operation
        const count = await prisma.completedPayment.count();
        modelStatus = `Available (${count} records)`;
        console.log("Healthcheck: CompletedPayment model accessible", { count });
      } else {
        modelStatus = "Not available";
        console.error("Healthcheck: CompletedPayment model not available in Prisma client");
      }
    } catch (modelError) {
      console.error("Healthcheck: Error accessing CompletedPayment model:", modelError);
      modelStatus = "Error: " + String(modelError).substring(0, 100);
    }
    
    // Return all diagnostics
    return NextResponse.json({
      timestamp: new Date().toISOString(),
      status: "ok",
      environment,
      database: {
        status: dbStatus,
        details: dbDetails,
      },
      prisma: {
        modelStatus,
      },
    });
  } catch (error) {
    console.error("Healthcheck failed:", error);
    return NextResponse.json(
      { 
        timestamp: new Date().toISOString(),
        status: "error",
        error: String(error) 
      },
      { status: 500 }
    );
  }
}