import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    console.log("Testing database connection...");
    
    // Test database connectivity
    let dbStatus = "Unknown";
    let tables = [];
    
    try {
      // Attempt to query the database schema to verify connectivity
      const result = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
      tables = result as any[];
      dbStatus = "Connected";
      console.log("Database connection successful", { tables });
    } catch (dbError) {
      console.error("Database connection failed:", dbError);
      dbStatus = "Error connecting to database";
    }
    
    // Check if CompletedPayment model is accessible
    let modelStatus = "Unknown";
    
    try {
      if (prisma.completedPayment) {
        const count = await prisma.completedPayment.count();
        modelStatus = `Available (${count} records)`;
        console.log("CompletedPayment model is accessible", { count });
      } else {
        modelStatus = "Not available";
        console.error("CompletedPayment model is not available");
      }
    } catch (modelError) {
      console.error("Error accessing CompletedPayment model:", modelError);
      modelStatus = "Error accessing model";
    }
    
    // Test Prisma's schema understanding
    let schemaStatus = "Unknown";
    let modelNames: string | any[] = [];
    
    try {
      //@ts-ignore
      modelNames = Object.keys(prisma).filter(key => !key.startsWith('$') && !key.startsWith('_'));
      schemaStatus = `Found ${modelNames.length} models`;
      console.log("Prisma schema models:", modelNames);
    } catch (schemaError) {
      console.error("Error getting schema info:", schemaError);
      schemaStatus = "Error getting schema info";
    }
    
    return NextResponse.json({
      success: true,
      database: {
        status: dbStatus,
        tables: tables, 
      },
      prisma: {
        modelStatus,
        schemaStatus,
        modelNames
      },
      environment: {
        nodeEnv: process.env.NODE_ENV,
        databaseUrl: !!process.env.DATABASE_URL ? "Configured" : "Missing",
        directUrl: !!process.env.DIRECT_URL ? "Configured" : "Missing"
      }
    });
  } catch (error) {
    console.error('Error in test-db endpoint:', error);
    return NextResponse.json(
      { error: 'Database test failed', details: String(error) },
      { status: 500 }
    );
  }
} 