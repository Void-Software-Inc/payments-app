import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    // Test database connection
    await prisma.$connect();
    
    // Test a simple query to verify database is working
    const count = await prisma.completedIntent.count();
    
    await prisma.$disconnect();

    return NextResponse.json(
      { 
        status: 'OK', 
        message: 'Service is healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
        completedIntentsCount: count
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { 
        status: 'ERROR', 
        message: 'Service is unhealthy',
        database: 'disconnected',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}